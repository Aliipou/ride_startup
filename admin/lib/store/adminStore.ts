import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AdminUser } from '../api';

interface AdminState {
  adminUser: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
  setAdminUser: (user: AdminUser) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      adminUser: null,
      token: null,
      isAuthenticated: false,

      login: (user: AdminUser, token: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', token);
        }
        set({ adminUser: user, token, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
        set({ adminUser: null, token: null, isAuthenticated: false });
      },

      setAdminUser: (user: AdminUser) => set({ adminUser: user }),
    }),
    {
      name: 'admin-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : sessionStorage,
      ),
      partialize: (state) => ({
        adminUser: state.adminUser,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
