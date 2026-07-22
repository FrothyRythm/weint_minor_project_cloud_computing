// Base API utility handling requests with credentials
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000/api' : '/api';

const api = {
  async request(endpoint, options = {}) {
    options.credentials = 'include';
    options.headers = options.headers || {};
    if (options.body && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'API request failed');
    }
    return response.json();
  }
};
