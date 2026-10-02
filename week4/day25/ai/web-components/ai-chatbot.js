// ai/web-components/ai-chatbot.js
//
// Spec: Day 25 Task 1 — dynamic AI chatbot for web applications.
// Same class name (AIChatbot), same public methods and same default
// apiUrl ('/api/ai/chat') as the spec.
//
// Deltas vs the spec (behaviour-preserving robustness fixes):
// - fetch has a configurable timeout (AbortController, default 60s);
//   without it a dead backend hangs the typing indicator forever.
// - Message rendering uses textContent (XSS-safe); the spec assigned
//   raw content the same way, but innerHTML anywhere near chat is an
//   injection hole, so innerHTML is only used for the static typing dots.
// - Typing-animation <style> is injected once (guarded by element id)
//   instead of once per message (spec leaked a <style> per send).
// - historyKey is configurable so multiple bots on one page don't
//   clobber each other's localStorage.
// - localStorage access is try/catch guarded (private-mode Safari throws).
class AIChatbot {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`AIChatbot: container "${containerId}" not found`);
    }
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/chat',
      theme: options.theme || 'light',
      position: options.position || 'bottom-right',
      timeoutMs: options.timeoutMs || 60000,
      historyKey: options.historyKey || 'ai_chatbot_history',
      ...options
    };
    this.isOpen = false;
    this.conversationHistory = [];
    this.isTyping = false;

    this.init();
  }

  init() {
    this.createChatbotUI();
    this.bindEvents();
    this.loadConversationHistory();
  }

  createChatbotUI() {
    // Create chatbot container
    this.chatbotContainer = document.createElement('div');
    this.chatbotContainer.className = `ai-chatbot ${this.options.theme}`;
    this.chatbotContainer.style.cssText = `
      position: fixed;
      ${this.options.position.includes('bottom') ? 'bottom' : 'top'}: 20px;
      ${this.options.position.includes('right') ? 'right' : 'left'}: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create header
    this.createHeader();

    // Create messages container
    this.createMessagesContainer();

    // Create input area
    this.createInputArea();

    // Create toggle button
    this.createToggleButton();

    this.container.appendChild(this.chatbotContainer);
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.style.cssText = `
      padding: 16px;
      background: #3b82f6;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.textContent = 'AI Assistant';
    title.style.margin = '0';
    title.style.fontSize = '16px';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    `;
    closeBtn.onclick = () => this.toggle();

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.chatbotContainer.appendChild(header);
  }

  createMessagesContainer() {
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'chatbot-messages';
    this.messagesContainer.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Add welcome message
    this.addMessage('Hello! How can I help you today?', 'bot');
    this.chatbotContainer.appendChild(this.messagesContainer);
  }

  createInputArea() {
    const inputArea = document.createElement('div');
    inputArea.className = 'chatbot-input-area';
    inputArea.style.cssText = `
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    `;

    this.messageInput = document.createElement('input');
    this.messageInput.type = 'text';
    this.messageInput.placeholder = 'Type your message...';
    this.messageInput.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
    `;

    this.sendButton = document.createElement('button');
    this.sendButton.textContent = 'Send';
    this.sendButton.style.cssText = `
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;

    inputArea.appendChild(this.messageInput);
    inputArea.appendChild(this.sendButton);
    this.chatbotContainer.appendChild(inputArea);
  }

  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.innerHTML = '💬';
    this.toggleButton.setAttribute('aria-label', 'Open chat');
    this.toggleButton.style.cssText = `
      position: fixed;
      ${this.options.position.includes('bottom') ? 'bottom' : 'top'}: 20px;
      ${this.options.position.includes('right') ? 'right' : 'left'}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 1001;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    `;
    this.toggleButton.onclick = () => this.toggle();

    this.container.appendChild(this.toggleButton);
  }

  bindEvents() {
    this.sendButton.onclick = () => this.sendMessage();
    this.messageInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    };
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.chatbotContainer.style.display = this.isOpen ? 'flex' : 'none';
    this.toggleButton.style.display = this.isOpen ? 'none' : 'block';

    if (this.isOpen) {
      this.messageInput.focus();
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isTyping) return;

    this.messageInput.value = '';
    this.addMessage(message, 'user');
    this.showTypingIndicator();

    try {
      const response = await this.callAIAPI(message);
      this.hideTypingIndicator();
      this.addMessage(response, 'bot');
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      console.error('AI API error:', error);
    }
  }

  async callAIAPI(message) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(this.options.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_history: this.conversationHistory
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.response;
    } finally {
      clearTimeout(timer);
    }
  }

  addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.style.cssText = `
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      word-wrap: break-word;
      ${sender === 'user'
        ? 'background: #3b82f6; color: white; align-self: flex-end;'
        : 'background: #f3f4f6; color: #374151; align-self: flex-start;'
      }
    `;

    // textContent (not innerHTML): chat content is untrusted user/model text.
    messageDiv.textContent = content;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Update conversation history
    this.conversationHistory.push({
      role: sender === 'user' ? 'user' : 'assistant',
      content: content,
      timestamp: new Date().toISOString()
    });

    this.saveConversationHistory();
  }

  ensureTypingStyles() {
    if (document.getElementById('ai-chatbot-typing-styles')) return;
    // Add CSS for typing animation (once per page, not per message)
    const style = document.createElement('style');
    style.id = 'ai-chatbot-typing-styles';
    style.textContent = `
      .typing-dots span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9ca3af;
        animation: typing 1.4s infinite ease-in-out;
      }
      .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
      .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes typing {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  showTypingIndicator() {
    this.isTyping = true;
    this.ensureTypingStyles();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.style.cssText = `
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      background: #f3f4f6;
      color: #374151;
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    typingDiv.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    this.messagesContainer.appendChild(typingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    this.isTyping = false;
    const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  loadConversationHistory() {
    try {
      const history = localStorage.getItem(this.options.historyKey);
      if (history) {
        this.conversationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      this.conversationHistory = [];
    }
  }

  saveConversationHistory() {
    try {
      localStorage.setItem(this.options.historyKey, JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    this.messagesContainer.innerHTML = '';
    this.addMessage('Hello! How can I help you today?', 'bot');
    try {
      localStorage.removeItem(this.options.historyKey);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
    }
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('chatbot-container');
  if (mount && typeof AIChatbot !== 'undefined') {
    new AIChatbot('chatbot-container', {
      apiUrl: '/api/ai/chat',
      theme: 'light',
      position: 'bottom-right'
    });
  }
});
