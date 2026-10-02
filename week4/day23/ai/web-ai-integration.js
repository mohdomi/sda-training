// ai/web-ai-integration.js
// Spec: Day 23 Task 5 — AI features for web applications.
// Verbatim spec client (class name, method names, routes unchanged).
class WebAIIntegration {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.conversationHistory = [];
  }

  async generateText(prompt, options = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model || 'gpt-3.5-turbo',
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }

  async generateSummary(text, maxLength = 150) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          max_length: maxLength,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.summary;
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  async generateCode(description, language = 'python') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.code;
    } catch (error) {
      console.error('Code generation failed:', error);
      throw error;
    }
  }

  async chat(message, model = 'gpt-3.5-turbo') {
    this.conversationHistory.push({ role: 'user', content: message });

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.conversationHistory,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.conversationHistory.push({ role: 'assistant', content: result.response });
      return result.response;
    } catch (error) {
      console.error('Chat failed:', error);
      throw error;
    }
  }

  clearConversation() {
    this.conversationHistory = [];
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

// Usage example (runs only when executed directly, never on require/import,
// so tests and bundlers get a side-effect-free module).
if (typeof require !== 'undefined' && require.main === module) {
const aiIntegration = new WebAIIntegration('http://localhost:5000');

// Generate text
aiIntegration.generateText('Write a short story about a robot learning to paint')
  .then(result => console.log('Generated text:', result))
  .catch(error => console.error('Error:', error));

// Generate summary
aiIntegration.generateSummary('Long text here...')
  .then(summary => console.log('Summary:', summary))
  .catch(error => console.error('Error:', error));

// Generate code
aiIntegration.generateCode('Create a function to calculate fibonacci numbers', 'python')
  .then(code => console.log('Generated code:', code))
  .catch(error => console.error('Error:', error));

// Chat
aiIntegration.chat('Hello, how are you?')
  .then(response => console.log('AI response:', response))
  .catch(error => console.error('Error:', error));
}

module.exports = WebAIIntegration;
