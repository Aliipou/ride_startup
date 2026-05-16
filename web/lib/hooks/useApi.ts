/**
 * SWR-based data-fetching hooks for the user web app.
 * All requests go through the shared axios instance (with auth + refresh interceptors).
 */

import useSWR from "swr";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export function useWallet() {
  const { data, error, isLoading, mutate } = useSWR("/wallet", fetcher);
  return { wallet: data, error, isLoading, mutate };
}

export function useWalletTransactions(limit = 20) {
  const { data, error, isLoading } = useSWR(`/wallet/transactions?limit=${limit}`, fetcher);
  return { transactions: data, error, isLoading };
}

export function useRideHistory(limit = 20) {
  const { data, error, isLoading } = useSWR(`/rides/history?limit=${limit}`, fetcher);
  return { rides: data, error, isLoading };
}

export function useRide(rideId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(rideId ? `/rides/${rideId}` : null, fetcher, {
    refreshInterval: 5000, // poll every 5s during active ride
  });
  return { ride: data, error, isLoading, mutate };
}

export function useMe() {
  const { data, error, isLoading, mutate } = useSWR("/users/me", fetcher);
  return { user: data, error, isLoading, mutate };
}
