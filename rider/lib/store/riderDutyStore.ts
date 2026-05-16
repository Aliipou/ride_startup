import { create } from 'zustand';
import { DutyStatus, ActiveRide, RideRequest, Earnings } from '@/lib/types';

interface RiderDutyState {
  status: DutyStatus;
  currentRide: ActiveRide | null;
  incomingRide: RideRequest | null;
  earnings: Earnings;
  onlineStartTime: number | null;
  todayRideCount: number;
}

interface RiderDutyActions {
  setStatus: (status: DutyStatus) => void;
  setCurrentRide: (ride: ActiveRide | null) => void;
  setIncomingRide: (ride: RideRequest | null) => void;
  clearIncomingRide: () => void;
  updateEarnings: (earnings: Partial<Earnings>) => void;
  incrementRideCount: () => void;
  resetDayStats: () => void;
}

type RiderDutyStore = RiderDutyState & RiderDutyActions;

const initialEarnings: Earnings = {
  today: 0,
  available: 0,
  pending: 0,
};

const initialState: RiderDutyState = {
  status: 'OFFLINE',
  currentRide: null,
  incomingRide: null,
  earnings: initialEarnings,
  onlineStartTime: null,
  todayRideCount: 0,
};

export const useRiderDutyStore = create<RiderDutyStore>((set) => ({
  ...initialState,

  setStatus: (status: DutyStatus) => {
    set((state) => ({
      status,
      onlineStartTime:
        status === 'ONLINE' && state.status === 'OFFLINE'
          ? Date.now()
          : status === 'OFFLINE'
          ? null
          : state.onlineStartTime,
    }));
  },

  setCurrentRide: (ride: ActiveRide | null) => {
    set({ currentRide: ride });
  },

  setIncomingRide: (ride: RideRequest | null) => {
    set({ incomingRide: ride });
  },

  clearIncomingRide: () => {
    set({ incomingRide: null });
  },

  updateEarnings: (earnings: Partial<Earnings>) => {
    set((state) => ({
      earnings: {
        ...state.earnings,
        ...earnings,
      },
    }));
  },

  incrementRideCount: () => {
    set((state) => ({ todayRideCount: state.todayRideCount + 1 }));
  },

  resetDayStats: () => {
    set({
      earnings: initialEarnings,
      todayRideCount: 0,
    });
  },
}));
