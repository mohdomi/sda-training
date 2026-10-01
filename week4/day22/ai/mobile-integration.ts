// ai/mobile-integration.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIPrediction {
  success: boolean;
  prediction: any;
  confidence: number;
  error?: string;
}

interface AIModelInfo {
  name: string;
  version: string;
  accuracy: number;
  lastUpdated: string;
}

class AIMobileIntegration {
  private apiBaseUrl: string;
  private modelCache: Map<string, any> = new Map();
  private isOnline: boolean = true;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    // Initialize network listener for offline support
    // This would typically use a network library
  }

  async predict(data: any): Promise<AIPrediction> {
    try {
      // Check if we have cached prediction
      const cacheKey = this.generateCacheKey(data);
      const cachedResult = await this.getCachedPrediction(cacheKey);

      if (cachedResult && !this.isOnline) {
        return cachedResult;
      }

      const response = await fetch(`${this.apiBaseUrl}/ai/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Cache the result for offline use
      await this.cachePrediction(cacheKey, result);

      return result;
    } catch (error) {
      console.error('AI prediction failed:', error);

      // Try to get cached result if online prediction fails
      const cacheKey = this.generateCacheKey(data);
      const cachedResult = await this.getCachedPrediction(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      return {
        success: false,
        prediction: null,
        confidence: 0,
        error: error.message,
      };
    }
  }

  async batchPredict(dataArray: any[]): Promise<AIPrediction[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/batch-predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataArray),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.predictions;
    } catch (error) {
      console.error('AI batch prediction failed:', error);
      return [];
    }
  }

  async getModelInfo(): Promise<AIModelInfo | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/model/info`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get model info:', error);
    }
    return null;
  }

  private generateCacheKey(data: any): string {
    return JSON.stringify(data);
  }

  private async getCachedPrediction(cacheKey: string): Promise<AIPrediction | null> {
    try {
      const cached = await AsyncStorage.getItem(`ai_prediction_${cacheKey}`);
      if (cached) {
        const result = JSON.parse(cached);
        // Check if cache is still valid (e.g., not older than 1 hour)
        const cacheAge = Date.now() - result.timestamp;
        if (cacheAge < 3600000) { // 1 hour
          return result;
        }
      }
    } catch (error) {
      console.error('Failed to get cached prediction:', error);
    }
    return null;
  }

  private async cachePrediction(cacheKey: string, result: AIPrediction): Promise<void> {
    try {
      const cacheData = {
        ...result,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`ai_prediction_${cacheKey}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache prediction:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const aiKeys = keys.filter(key => key.startsWith('ai_prediction_'));
      await AsyncStorage.multiRemove(aiKeys);
    } catch (error) {
      console.error('Failed to clear AI cache:', error);
    }
  }
}

export default AIMobileIntegration;
