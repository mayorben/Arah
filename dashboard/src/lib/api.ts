import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({ baseURL: BASE });

// Attach token if stored
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('arah_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export async function login(username: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const { data } = await api.post('/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  localStorage.setItem('arah_token', data.access_token);
  return data;
}
