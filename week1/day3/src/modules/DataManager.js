export class DataManager {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
    this.subscribers = new Set();
  }

  /*
	  so basically here, i need to implement a fetch method
	  that just takes an enpoint + some options as optional
	  and fetches data from some apiENdpoint if the endpoint 
	  has been fetched earlier and we have a cached data of it
	  stored in out Map (cache) then just return the value stored in
	  cache_map with the key: cacheKey otherwise fetch the apiUrl Endpoint.
	  if error then log and throw error.
	*/

  async fetchData(endpoint, options = {}) {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey); // return data if stored
    }

    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application.json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: status ${response.status}`);
      }

      const data = await response.json();

      this.cache.set(cacheKey, data);
      this.notifySubscribers(endpoint, data);

      return data;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(endpoint, data) {
    this.subscribers.forEach((callback) => callback(endpoint, data));
  }

  clearCache() {
    this.cache.clear();
  }
}
