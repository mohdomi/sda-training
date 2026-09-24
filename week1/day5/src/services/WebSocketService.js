class WebSocketService {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };

    this.ws = null;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.subscribers = new Map();
    this.messageQueue = [];
    this.isConnected = false;
  }

  connect() {
    if (!this.url) {
      return;
    }
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error("Websocket connection failed : ", error);
      this.handleReconnect();
    }
  }

  // open, message, close, error

  setupEventListeners() {
    this.ws.onopen = () => {
      console.log("Websocket Connected.");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartBeat();
      this.processMessageQueue();
      this.notifySubscribers("connected", null);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (err) {
        console.error("Failed to parse websocket message.", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log("Websocket Disconnected", event.code, event.reason);
      this.isConnected = false;
      this.stopHeartBeat();
      this.notifySubscribers("disconnected", {
        code: event.code,
        reason: event.reason,
      });

      if (!event.wasClean) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("Websocket error : ", error);
      this.notifySubscribers("error", error);
    };
  }

  handleMessage(data) {
    const { type, payload } = data;

    if (type === "pong") return;

    this.notifySubscribers("message", { type, payload });

    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach((callback) => callback(payload));
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(callback);

    return () => {
      if (this.subscribers.has(eventType)) {
        this.subscribers.get(eventType).delete(callback);
      }
    };
  }

  notifySubscribers(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach((callback) => callback(data));
    }
  }

  startHeartBeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: "ping",
        });
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartBeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;

      console.log(
        `Attempting to reconnect : ${this.reconnectAttempts} / ${this.options.maxReconnectAttempts}`,
      );
      setTimeout(() => {
        this.connect();
      }, this.options.reconnectInterval);
    } else {
      console.error("Maximum reconnect attempts reached.");
      this.notifySubscribers("maxReconnectAttemptsReached", null);
    }
  }

  disconnect() {
    this.stopHeartBeat();
    if (this.ws) {
      this.ws.close(1000, "Client disconnected");
    }
    this.isConnected = false;
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url,
    };
  }
}

export default WebSocketService;
