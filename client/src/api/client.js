import axios from 'axios';

export const TOKEN_KEY = 'gym_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or revoked token while signed in logs the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('gym:unauthorized'));
    }
    return Promise.reject(error);
  },
);

// Turns an axios error into { message, fields } for display.
export function errorInfo(error) {
  const data = error.response && error.response.data;
  const fields = {};
  ((data && data.errors) || []).forEach((e) => {
    if (e.field && !(e.field in fields)) fields[e.field] = e.message;
  });
  const message = (data && data.message)
    || (error.request ? 'Cannot reach the server. Check that the API is running.' : error.message);
  return { message, fields };
}

export default api;
