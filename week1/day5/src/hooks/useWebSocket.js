import WebSocketService from "../services/WebSocketService.js";
import { useRef, useCallback, useState, useEffect } from "react";

export const useWebSocket = (baseUrl, options = {}) => {
  const serviceRef = useRef(null);

  if (!serviceRef.current) {
    serviceRef.current = new WebSocketService(baseUrl, options);
  }

  const service = serviceRef.current;

  const [isConnected, setIsConnected] = useState(true);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    url: baseUrl,
  });
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    if (!service.url) {
      return;
    }
    service.connect();
  }, [service]);

  const disconnect = useCallback(() => {
    service.disconnect();
  }, [service]);

  useEffect(() => {
    const unsubscribeConnected = service.subscribe("connected", () => {
      setIsConnected(true);
      setError(null);
      setConnectionState(service.getConnectionState());
    });

    const unsubscribeDisconnected = service.subscribe(
      "disconnected",
      (data) => {
        setIsConnected(false);
        setConnectionState(service.getConnectionState());
      },
    );

    const unsubscribeError = service.subscribe("error", (err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
  }, [service]);

  useEffect(() => {
    const unsubscribeMessage = service.subscribe("message", (message) => {
      setLastMessage(message);
    });

    return unsubscribeMessage;
  }, [service]);

  const send = useCallback(
    (data) => {
      if (!isConnected) {
        console.warn("Websocket not connected, queuing message");
      }
      service.send(data);
    },
    [service, isConnected],
  );

  const subscribe = useCallback(
    (eventType, callback) => {
      return service.subscribe(eventType, callback);
    },
    [service],
  );

  const reconnect = useCallback(() => {
    service.disconnect();
    service.connect();
  }, [service]);

  const getState = useCallback(() => {
    return service.getConnectionState();
  }, [service]);

  return {
    service,
    isConnected,
    connectionState,
    lastMessage,
    error,
    send,
    subscribe,
    reconnect,
    getState,
    connect,
    disconnect
  };
};
