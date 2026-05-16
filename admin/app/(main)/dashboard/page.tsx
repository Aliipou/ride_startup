"use client";

import useSWR from "swr";
import { Bike, Users, DollarSign, Navigation } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import RidesChart from "@/components/charts/RidesChart";
import RevenueChart from "@/components/charts/RevenueChart";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useSWR("/admin/stats/today", fetcher, {
    refreshInterval: 30000,
  });
  const { data: chart } = useSWR("/admin/stats/chart", fetcher);
  const { data: liveRides } = useSWR("/admin/rides/live", fetcher, { refreshInterval: 10000 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Live overview of Ride & Chill operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Rides Today"
          value={statsLoading ? "—" : stats?.total_rides_today ?? 0}
          icon={Navigation}
          color="blue"
        />
        <StatCard
          title="Revenue Today"
          value={statsLoading ? "—" : `€${stats?.revenue_today?.toFixed(2) ?? "0.00"}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Active Riders"
          value={statsLoading ? "—" : stats?.active_riders ?? 0}
          icon={Bike}
          color="emerald"
        />
        <StatCard
          title="New Users"
          value={statsLoading ? "—" : stats?.new_users_today ?? 0}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">Rides — Last 30 Days</h2>
          <RidesChart data={chart ?? []} />
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">Revenue — Last 30 Days</h2>
          <RevenueChart data={chart ?? []} />
        </div>
      </div>

      {/* Recent rides */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Active Rides</h2>
        </div>
        {!liveRides?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No active rides right now</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Ride ID</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {liveRides.map((ride: any) => (
                  <tr key={ride.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ride.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs truncate">
                      {ride.origin_address} → {ride.destination_address}
                    </td>
                    <td className="px-4 py-3 font-medium">€{ride.final_price?.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={ride.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
