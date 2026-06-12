// URL Fetcher Utility
class URLFetcher {
  constructor() {
    this.cache = new Map();
    this.defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };
  }

  // Fetch with caching
  async fetchWithCache(url, options = {}) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cached.timestamp < 300000) {
        return cached.data;
      }
    }

    // Fetch new data
    try {
      const response = await this.fetch(url, options);
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });
      return response;
    } catch (error) {
      // Return cached data if available on error
      if (this.cache.has(cacheKey)) {
        console.warn('Using cached data due to fetch error:', error);
        return this.cache.get(cacheKey).data;
      }
      throw error;
    }
  }

  // Enhanced fetch with timeout and error handling
  async fetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultOptions.timeout);

    try {
      const response = await fetch(url, {
        ...this.defaultOptions,
        ...options,
        headers: {
          ...this.defaultOptions.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // GET request
  async get(url, options = {}) {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  // POST request
  async post(url, data, options = {}) {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(url, data, options = {}) {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(url, options = {}) {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }
}

// Create singleton instance
const urlFetcher = new URLFetcher();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = urlFetcher;
} else {
  window.urlFetcher = urlFetcher;
}
