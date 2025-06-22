import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

const api = axios.create({
  baseURL: API_URL,
});

// Enhanced request interceptor with better token validation
api.interceptors.request.use((config) => {
  const userData = localStorage.getItem('user');
  if (!userData) return config;

  try {
    const parsed = JSON.parse(userData);
    
    // Validate token structure
    if (parsed?.token && isValidToken(parsed.token)) {
      config.headers.Authorization = `Bearer ${parsed.token}`;
    }
    return config;
  } catch (error) {
    console.error('Interceptor error:', error);
    localStorage.removeItem('user');
    return config;
  }
});

// Helper function to validate token structure
function isValidToken(token) {
  try {
    if (typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch (err) {
    return false;
  }
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const getAuthHeader = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return {};
  
  try {
    const parsed = JSON.parse(userData);
    if (parsed?.token && isValidToken(parsed.token)) {
      return { Authorization: `Bearer ${parsed.token}` };
    }
    return {};
  } catch (err) {
    return {};
  }
};

const register = async (userData) => {
  try {
    const response = await api.post('/register', userData);
    if (response.data.token && response.data.user) {
      localStorage.setItem('user', JSON.stringify({
        token: response.data.token,
        user: response.data.user
      }));
    }
    return response.data;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.msg || 
                   error.response?.data?.message || 
                   'Registration failed';
    throw new Error(message);
  }
};

const login = async (userData) => {
  const response = await api.post('/login', userData);
  if (response.data.token && response.data.user) {
    localStorage.setItem('user', JSON.stringify({
      token: response.data.token,
      user: response.data.user
    }));
  }
  return response.data;
};

const logout = () => {
  localStorage.removeItem('user');
};

const getUser = async () => {
  const response = await api.get('/user');
  return response.data;
};

const updateFunds = async (fundsData) => {
  const response = await api.post('/funds', fundsData);
  return response.data;
};

export default {
  register,
  login,
  logout,
  getUser,
  updateFunds,
  getAuthHeader
};