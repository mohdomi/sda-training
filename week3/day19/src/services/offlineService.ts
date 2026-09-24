import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineData {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private offlineQueue: OfflineData[] = [];

  constructor() {
    this.initializeNetworkListener();
    this.loadOfflineQueue();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;

      if (this.isOnline) {
        this.syncOfflineData();
      }
    });
  }

  private async loadOfflineQueue() {
    try {
      const data = await AsyncStorage.getItem('offlineQueue');
      if (data) {
        this.offlineQueue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  async queueRequest(endpoint: string, method: string, data: any) {
    const offlineData: OfflineData = {
      id: Date.now().toString(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
    };

    this.offlineQueue.push(offlineData);
    await this.saveOfflineQueue();
  }

  async syncOfflineData() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        await this.syncRequest(item);
      } catch (error) {
        console.error('Failed to sync request:', error);
        this.offlineQueue.push(item);
      }
    }

    await this.saveOfflineQueue();
  }

  private async syncRequest(item: OfflineData) {
    console.log('Syncing offline request:', item);
  }

  getOfflineQueue(): OfflineData[] {
    return this.offlineQueue;
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const offlineService = new OfflineService();
