export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://api.coinmetro.com'
  : '/api';

export const getApiUrl = (path: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}; 