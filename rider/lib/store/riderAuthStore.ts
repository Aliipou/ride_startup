import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Rider, AuthTokens } from '@/lib/types';

interface RiderAuthState {
  rider: Rider | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface RiderAuthActions {
  login: (rider: Rider, tokens: AuthTokens) => void;
  logout: () => void;
  setRider: (rider: Rider) => void;
  setTokens: (tokens: AuthTokens) => void;
  setLoading: (loading: boolean) => void;
  updateRefreshToken: (refreshToken: string, accessToken: string) => void;
}

type RiderAuthStore = RiderAuthState & RiderAuthActions;

const initialState: RiderAuthState = {
  rider: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
};

export const useRiderAuthStore = create<RiderAuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: (rider: Rider, tokens: AuthTokens) => {
        set({
          rider,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          ...initialState,
          isAuthenticated: false,
        });
      },

      setRider: (rider: Rider) => {
        set({ rider });
      },

      setTokens: (tokens: AuthTokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      updateRefreshToken: (refreshToken: string, accessToken: string) => {
        set({ refreshToken, accessToken });
      },
    }),
    {
      name: 'rider-auth-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        rider: state.rider,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
