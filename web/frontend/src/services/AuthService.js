import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.REACT_APP_API_URL;

class AuthService {
  async login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await axios.post(`${API_URL}/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if (response.data.access_token) {
      // Parse the JWT token to get user information including admin status
      const decodedToken = jwtDecode(response.data.access_token);
      
      // Combine token and decoded user data
      const userData = {
        ...response.data,
        username: decodedToken.sub,
        is_admin: decodedToken.is_admin || false,
        user_id: decodedToken.user_id
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
    return null;
  }

  logout() {
    localStorage.removeItem('user');
  }

  async register(username, email, password) {
    const response = await axios.post(`${API_URL}/register`, {
      username,
      email,
      password,
    });
    return response.data;
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isTokenExpired() {
    const user = this.getCurrentUser();
    if (!user || !user.access_token) return true;
    
    try {
      const decodedToken = jwtDecode(user.access_token);
      // Check if the token has expired (exp is in seconds since epoch)
      const currentTime = Date.now() / 1000;
      return decodedToken.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // If we can't decode the token, consider it expired
    }
  }

  getAuthHeader() {
    const user = this.getCurrentUser();
    if (user && user.access_token) {
      // Check if token is expired - this doesn't refresh it, just for logging
      if (this.isTokenExpired()) {
        console.warn('Auth token has expired. User may need to log in again.');
      }
      return { Authorization: `Bearer ${user.access_token}` };
    } else {
      console.warn('No authentication token available');
      return {};
    }
  }
}

export default new AuthService(); 