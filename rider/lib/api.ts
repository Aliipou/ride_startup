import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  failedQueue = [];
};

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('rider-auth-store');
          if (authStorage) {
            const { state } = JSON.parse(authStorage);
            if (state?.accessToken) {
              config.headers.Authorization = `Bearer ${state.accessToken}`;
            }
          }
        } catch {
          // ignore parse errors
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return instance(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const authStorage = localStorage.getItem('rider-auth-store');
          if (!authStorage) throw new Error('No auth storage');

          const { state } = JSON.parse(authStorage);
          if (!state?.refreshToken) throw new Error('No refresh token');

          const response = await axios.post(`${API_URL}/auth/rider/refresh`, {
            refreshToken: state.refreshToken,
          });

          const { accessToken, refreshToken } = response.data;

          // Update store
          const updatedState = {
            ...state,
            accessToken,
            refreshToken,
          };
          localStorage.setItem(
            'rider-auth-store',
            JSON.stringify({ state: updatedState, version: 0 })
          );

          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Clear auth and redirect to login
          localStorage.removeItem('rider-auth-store');
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const api = createApiInstance();

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/rider/login', { email, password }),

  register: (data: FormData) =>
    api.post('/auth/rider/register', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  refresh: (refreshToken: string) =>
    api.post('/auth/rider/refresh', { refreshToken }),

  logout: () => api.post('/auth/rider/logout'),
};

// Rider endpoints
export const riderApi = {
  getProfile: () => api.get('/riders/me'),

  updateProfile: (data: Partial<{ name: string; phone: string }>) =>
    api.patch('/riders/me', data),

  updateLocation: (lat: number, lng: number) =>
    api.patch('/riders/location', { lat, lng }),

  setStatus: (status: 'ONLINE' | 'OFFLINE') =>
    api.patch('/riders/duty-status', { status }),

  acceptRide: (rideId: string) =>
    api.post(`/rides/${rideId}/accept`),

  declineRide: (rideId: string) =>
    api.post(`/rides/${rideId}/decline`),

  arrivedAtPickup: (rideId: string) =>
    api.post(`/rides/${rideId}/arrived-pickup`),

  startRide: (rideId: string) =>
    api.post(`/rides/${rideId}/start`),

  completeRide: (rideId: string) =>
    api.post(`/rides/${rideId}/complete`),

  cancelRide: (rideId: string, reason: string) =>
    api.post(`/rides/${rideId}/cancel`, { reason }),

  getEarnings: () => api.get('/riders/earnings'),

  getWeeklyEarnings: () => api.get('/riders/earnings/weekly'),

  getTransactions: (page = 1, limit = 20) =>
    api.get('/riders/transactions', { params: { page, limit } }),

  requestWithdrawal: (amount: number) =>
    api.post('/riders/withdraw', { amount }),

  uploadDocument: (type: string, file: File) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    return api.post('/riders/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
