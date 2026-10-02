// ai/web-agent-integration.js
// Spec: Day 24 Task 4 — AI agent features for web applications.
// Verbatim spec client (class name, method names, routes unchanged).
class WebAIAgentIntegration {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.conversationHistory = [];
    this.agentType = 'langchain';
  }

  async chat(message, agentType = 'langchain') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          agent_type: agentType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Update conversation history
      this.conversationHistory.push({
        user: message,
        agent: result.response,
        timestamp: new Date().toISOString(),
        agentType: agentType
      });

      return result.response;
    } catch (error) {
      console.error('AI agent chat failed:', error);
      throw error;
    }
  }

  async getMemory(agentType = 'langchain') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/memory?agent_type=${agentType}`);
      if (response.ok) {
        const result = await response.json();
        return result.memory;
      }
    } catch (error) {
      console.error('Failed to get memory:', error);
    }
    return null;
  }

  async clearMemory(agentType = 'langchain') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/memory/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_type: agentType,
        }),
      });

      if (response.ok) {
        this.conversationHistory = [];
        return true;
      }
    } catch (error) {
      console.error('Failed to clear memory:', error);
    }
    return false;
  }

  async listTools(agentType = 'langchain') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tools?agent_type=${agentType}`);
      if (response.ok) {
        const result = await response.json();
        return result.tools;
      }
    } catch (error) {
      console.error('Failed to list tools:', error);
    }
    return [];
  }

  // NOTE (safe-registry change): the Python API no longer eval()s raw
  // function source (RCE). Pass a registry `kind` ('calculator' |
  // 'echo' | 'wordcount') as `toolFunction`; the server maps it to a
  // safe built-in instead of executing the string.
  async addTool(toolName, toolDescription, toolFunction, agentType = 'langchain') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tools/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: toolName,
          description: toolDescription,
          kind: toolFunction,
          function: toolFunction,
          agent_type: agentType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
    } catch (error) {
      console.error('Failed to add tool:', error);
    }
    return false;
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  setAgentType(agentType) {
    this.agentType = agentType;
  }

  getAgentType() {
    return this.agentType;
  }
}

// Usage example
const aiAgent = new WebAIAgentIntegration('http://localhost:5000');

// Chat with the agent
aiAgent.chat('Hello, can you help me with a calculation?')
  .then(response => console.log('Agent response:', response))
  .catch(error => console.error('Error:', error));

// Get conversation memory
aiAgent.getMemory()
  .then(memory => console.log('Memory:', memory))
  .catch(error => console.error('Error:', error));

// List available tools
aiAgent.listTools()
  .then(tools => console.log('Tools:', tools))
  .catch(error => console.error('Error:', error));
