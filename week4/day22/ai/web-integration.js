// ai/web-integration.js
class AIWebIntegration {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.model = null;
    this.isLoaded = false;
  }

  async loadModel() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/model/load`);
      if (response.ok) {
        this.isLoaded = true;
        console.log('AI model loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load AI model:', error);
    }
  }

  async predict(data) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    try {
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
      return result;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  async batchPredict(dataArray) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

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
      return result;
    } catch (error) {
      console.error('Batch prediction failed:', error);
      throw error;
    }
  }

  async getModelInfo() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/model/info`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get model info:', error);
    }
  }
}

// Usage example
const aiIntegration = new AIWebIntegration('http://localhost:5000');

// Make a prediction
aiIntegration.predict({
  feature1: 1.5,
  feature2: 2.3,
  feature3: 0.8
}).then(result => {
  console.log('Prediction:', result);
}).catch(error => {
  console.error('Error:', error);
});
