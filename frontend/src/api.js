import axios from 'axios';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://nasa-data-explorer-irhl.onrender.com',
});
export default api;
