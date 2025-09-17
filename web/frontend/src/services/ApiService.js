import axios from 'axios';
import AuthService from './AuthService';

const API_URL = process.env.REACT_APP_API_URL;

// Create axios instance with interceptors for auth
const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const user = AuthService.getCurrentUser();
    if (user && user.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      console.log("AuthService: Received 401 Unauthorized. Logging out.");
      AuthService.logout();
      // Reload the page to redirect to login (or use react-router history)
      // Adding a small delay might help ensure logout completes
      setTimeout(() => {
           window.location.reload();
           // Alternatively, use react-router navigation if history is available here
           // history.push('/login'); 
       }, 100);
      // Optionally, you could return a specific error object or message here
      // return Promise.reject(new Error("Session expired. Please log in again."));
    }
    // For other errors, just pass them along
    return Promise.reject(error);
  }
);

class ApiService {
  // Person operations - These endpoints now return User objects instead
  async getPersons() {
    const response = await api.get('/persons/');
    return response.data;
  }

  // This method is now deprecated, but keeping for compatibility
  async createPerson(name) {
    throw new Error("Creating persons is no longer supported. Users are registered through the registration system.");
  }

  async getPerson(id) {
    const response = await api.get(`/persons/${id}`);
    return response.data;
  }

  // Record operations
  async getAllRecords(includeUsed = false) {
    const queryParams = includeUsed ? '?include_used=true' : '';
    const response = await api.get(`/records/${queryParams}`);
    return response.data;
  }

  async getMyRecords() {
    const response = await api.get('/records/my');
    return response.data;
  }

  async getRecordHistory() {
    const response = await api.get('/records/history');
    return response.data;
  }

  async createRecord(title, artist, cover_url = "", rym_url = "") {
    const response = await api.post('/records/', {
      title,
      artist,
      cover_url,
      rym_url
    });
    return response.data;
  }

  async createRecordFromRymUrl(rymUrl) {
    const response = await api.post(`/records/from-rym-url/?rym_url=${encodeURIComponent(rymUrl)}`);
    return response.data;
  }

  async deleteRecord(recordId) {
    const response = await api.delete(`/records/${recordId}`);
    return response.data;
  }

  // Selection operations
  async performSelection(participantIds) {
    const queryParams = participantIds.map(id => `participant_ids=${id}`).join('&');
    const response = await api.post(`/selection/?${queryParams}`);
    return response.data;
  }

  async getSelectionHistory(mySelectionsOnly = false, sortByRating = false, timestamp = null) {
    try {
      const queryParams = [];
      if (mySelectionsOnly) {
          queryParams.push('my_selections_only=true');
      }
      if (sortByRating) {
          queryParams.push('sort_by_rating=true');
      }
      
      // Add timestamp to prevent caching
      if (timestamp) {
          queryParams.push(`_t=${timestamp}`);
      }
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      
      // Add a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await api.get(`/selection/history/${queryString}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.data;
    } catch (error) {
      // Handle specific errors
      if (error.name === 'AbortError') {
        console.error('Selection history request timed out');
        return [];
      }
      
      if (error.response?.status === 500) {
        console.error('Server error in selection history');
        return [];
      }
      
      console.error('Error fetching selection history:', error);
      throw error; // Re-throw to allow proper error handling in the component
    }
  }

  async getSelectionHistoryNoCaching(cacheBustUrl, mySelectionsOnly = false, sortByRating = false) {
    try {
      const queryParams = [];
      if (mySelectionsOnly) {
          queryParams.push('my_selections_only=true');
      }
      if (sortByRating) {
          queryParams.push('sort_by_rating=true');
      }
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      
      // Using complete override of standard fetch behavior to avoid caching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log(`Making API call to ${API_URL}${cacheBustUrl}${queryString}`);
      
      const response = await axios({
        method: 'GET',
        url: `${API_URL}${cacheBustUrl}${queryString}`,
        headers: {
          ...AuthService.getAuthHeader(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': new Date(0).toUTCString(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log("History API response status:", response.status);
      return response.data;
    } catch (error) {
      console.error('Error in getSelectionHistoryNoCaching:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async rateSelection(selectionId, rating) {
    if (rating < 0 || rating > 10) {
        throw new Error('Rating must be between 0 and 10');
    }
    
    const response = await api.post(`/selections/${selectionId}/rate?rating=${rating}`);
    return response.data;
  }

  async getSelectionStats(myStatsOnly = false) {
    const queryParams = myStatsOnly ? '?my_stats_only=true' : '';
    const response = await api.get(`/selection/stats/${queryParams}`);
    return response.data;
  }
}

export default new ApiService(); 