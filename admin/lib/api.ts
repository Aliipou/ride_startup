import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; admin: AdminUser }>('/admin/auth/login', {
      email,
      password,
    }),
  logout: () => api.post('/admin/auth/logout'),
  me: () => api.get<AdminUser>('/admin/auth/me'),
};

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsApi = {
  today: () => api.get<TodayStats>('/admin/stats/today'),
  chart: (days = 30) =>
    api.get<ChartData[]>(`/admin/stats/chart?days=${days}`),
  recentRides: () => api.get<Ride[]>('/admin/stats/recent-rides'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: UsersListParams) => api.get<PaginatedResponse<User>>('/admin/users', { params }),
  get: (id: string) => api.get<User>(`/admin/users/${id}`),
  ban: (id: string) => api.patch(`/admin/users/${id}/ban`),
  unban: (id: string) => api.patch(`/admin/users/${id}/unban`),
};

// ─── Riders ───────────────────────────────────────────────────────────────────
export const ridersApi = {
  list: (params?: RidersListParams) =>
    api.get<PaginatedResponse<Rider>>('/admin/riders', { params }),
  get: (id: string) => api.get<Rider>(`/admin/riders/${id}`),
  approve: (id: string) => api.post(`/admin/riders/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.post(`/admin/riders/${id}/reject`, { reason }),
  suspend: (id: string, reason: string) =>
    api.patch(`/admin/riders/${id}/suspend`, { reason }),
  pending: () => api.get<Rider[]>('/admin/riders/pending'),
};

// ─── Rides ────────────────────────────────────────────────────────────────────
export const ridesApi = {
  list: (params?: RidesListParams) =>
    api.get<PaginatedResponse<Ride>>('/admin/rides', { params }),
  get: (id: string) => api.get<Ride>(`/admin/rides/${id}`),
  refund: (id: string) => api.post(`/admin/rides/${id}/refund`),
};

// ─── Live Map ─────────────────────────────────────────────────────────────────
export const liveMapApi = {
  data: () => api.get<LiveMapData>('/admin/live-map'),
};

// ─── Pricing ──────────────────────────────────────────────────────────────────
export const pricingApi = {
  get: () => api.get<PricingConfig>('/admin/pricing'),
  update: (config: Partial<PricingConfig>) =>
    api.patch<PricingConfig>('/admin/pricing', config),
};

// ─── Promo Codes ──────────────────────────────────────────────────────────────
export const promosApi = {
  list: () => api.get<PromoCode[]>('/admin/promos'),
  create: (data: CreatePromoPayload) =>
    api.post<PromoCode>('/admin/promos', data),
  toggle: (id: string, active: boolean) =>
    api.patch(`/admin/promos/${id}`, { active }),
  delete: (id: string) => api.delete(`/admin/promos/${id}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  revenue: (from: string, to: string) =>
    api.get('/admin/reports/revenue', {
      params: { from, to },
      responseType: 'blob',
    }),
  rides: (from: string, to: string) =>
    api.get('/admin/reports/rides', {
      params: { from, to },
      responseType: 'blob',
    }),
  summary: (from: string, to: string) =>
    api.get<ReportSummary>('/admin/reports/summary', { params: { from, to } }),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TodayStats {
  todayRides: number;
  todayRidesDelta: number;
  todayRevenue: number;
  todayRevenueDelta: number;
  activeRiders: number;
  newUsers: number;
  newUsersDelta: number;
}

export interface ChartData {
  date: string;
  rides: number;
  revenue: number;
}

export type RideStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Ride {
  id: string;
  shortId: string;
  createdAt: string;
  user: { id: string; name: string; phone: string };
  rider: { id: string; name: string } | null;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  price: number;
  paymentMethod: 'CASH' | 'CARD' | 'WALLET';
  status: RideStatus;
  refunded?: boolean;
  duration?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalRides: number;
  walletBalance: number;
  status: 'ACTIVE' | 'BANNED';
  joinedAt: string;
}

export type RiderStatus = 'ONLINE' | 'OFFLINE' | 'ON_RIDE' | 'PENDING' | 'SUSPENDED';

export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  bikeType: 'REGULAR' | 'EBIKE';
  status: RiderStatus;
  totalRides: number;
  rating: number;
  totalEarnings: number;
  joinedAt: string;
  documents?: {
    idPhoto?: string;
    bikePhoto?: string;
    licensePhoto?: string;
  };
}

export interface PricingConfig {
  baseFare: number;
  ratePerKm: number;
  minimumFare: number;
  surgeMultiplier: number;
  ebikePremiumPercent: number;
  updatedAt: string;
}

export type PromoType = 'PERCENTAGE' | 'FIXED' | 'FREE_RIDE';

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  usedCount: number;
  maxUses: number;
  validFrom: string;
  validUntil: string;
  minOrderValue: number;
  active: boolean;
}

export interface CreatePromoPayload {
  code: string;
  type: PromoType;
  value: number;
  maxUses: number;
  validFrom: string;
  validUntil: string;
  minOrderValue: number;
}

export interface LiveRider {
  id: string;
  name: string;
  rating: number;
  lat: number;
  lng: number;
  status: 'ONLINE' | 'ON_RIDE';
}

export interface LiveRequest {
  id: string;
  lat: number;
  lng: number;
  pickupAddress: string;
}

export interface LiveMapData {
  riders: LiveRider[];
  pendingRequests: LiveRequest[];
  activeRidesCount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalRides: number;
  avgFare: number;
  paymentBreakdown: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsersListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface RidersListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface RidesListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}
