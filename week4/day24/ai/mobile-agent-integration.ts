// ai/mobile-agent-integration.ts
// Spec: Day 24 Task 5 — AI agent features for mobile applications.
// Verbatim spec client (class/interface/method names, routes unchanged).
// NOTE (safe-registry change): POST /tools/add no longer eval()s raw
// function source (RCE). Pass a registry `kind` ('calculator' | 'echo'
// | 'wordcount') as `toolFunction`; the server maps it to a safe
// built-in instead of executing the string.
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AgentMessage {
  user: string;
  agent: string;
  timestamp: string;
  agentType: string;
}

interface AgentMemory {
  chat_history: any[];
  memory_variables: any;
}

class MobileAIAgentIntegration {
  private apiBaseUrl: string;
  private conversationHistory: AgentMessage[] = [];
  private agentType: string = 'langchain';
  private isOnline: boolean = true;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.initializeNetworkListener();
    this.loadConversationHistory();
  }

  private initializeNetworkListener() {
    // Initialize network listener for offline support
    // This would typically use a network library
  }

  private async loadConversationHistory() {
    try {
      const history = await AsyncStorage.getItem('agent_conversation_history');
      if (history) {
        this.conversationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  private async saveConversationHistory() {
    try {
      await AsyncStorage.setItem(
        'agent_conversation_history',
        JSON.stringify(this.conversationHistory)
      );
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  async chat(message: string, agentType: string = 'langchain'): Promise<string> {
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
      const newMessage: AgentMessage = {
        user: message,
        agent: result.response,
        timestamp: new Date().toISOString(),
        agentType: agentType
      };

      this.conversationHistory.push(newMessage);
      await this.saveConversationHistory();

      return result.response;
    } catch (error) {
      console.error('AI agent chat failed:', error);

      // Try to get cached response if online chat fails
      const cachedResponse = await this.getCachedResponse(message);
      if (cachedResponse) {
        return cachedResponse;
      }

      throw error;
    }
  }

  async getMemory(agentType: string = 'langchain'): Promise<AgentMemory | null> {
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

  async clearMemory(agentType: string = 'langchain'): Promise<boolean> {
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
        await this.saveConversationHistory();
        return true;
      }
    } catch (error) {
      console.error('Failed to clear memory:', error);
    }
    return false;
  }

  async listTools(agentType: string = 'langchain'): Promise<string[]> {
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

  async addTool(toolName: string, toolDescription: string, toolFunction: string, agentType: string = 'langchain'): Promise<boolean> {
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

  private async getCachedResponse(message: string): Promise<string | null> {
    try {
      const cached = await AsyncStorage.getItem(`agent_response_${message}`);
      if (cached) {
        const result = JSON.parse(cached);
        // Check if cache is still valid (e.g., not older than 1 hour)
        const cacheAge = Date.now() - result.timestamp;
        if (cacheAge < 3600000) { // 1 hour
          return result.response;
        }
      }
    } catch (error) {
      console.error('Failed to get cached response:', error);
    }
    return null;
  }

  private async cacheResponse(message: string, response: string): Promise<void> {
    try {
      const cacheData = {
        response,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`agent_response_${message}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }

  setAgentType(agentType: string): void {
    this.agentType = agentType;
  }

  getAgentType(): string {
    return this.agentType;
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const agentKeys = keys.filter(key => key.startsWith('agent_'));
      await AsyncStorage.multiRemove(agentKeys);
    } catch (error) {
      console.error('Failed to clear agent cache:', error);
    }
  }
}

export default MobileAIAgentIntegration;
