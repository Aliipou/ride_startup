"use client";

import { Clock, MapPin, Bike, Star, ChevronRight } from "lucide-react";
import { useRideHistory } from "@/lib/hooks/useApi";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PENDING: "bg-yellow-100 text-yellow-700",
};

export default function HistoryPage() {
  const { rides, isLoading } = useRideHistory();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rides?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Clock size={48} className="mb-3 opacity-40" />
        <p className="font-medium">No rides yet</p>
        <p className="text-sm mt-1">Book your first ride!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold text-gray-900">Your Rides</h1>
      {rides.map((ride: any) => (
        <div key={ride.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin size={12} className="text-primary flex-shrink-0" />
                <p className="text-sm text-gray-600 truncate">{ride.origin_address}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-gray-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">{ride.destination_address}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900">€{ride.final_price?.toFixed(2)}</p>
              {ride.tip_amount > 0 && (
                <p className="text-xs text-gray-400">+€{ride.tip_amount.toFixed(2)} tip</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Bike size={11} />
                {ride.bike_type === "ELECTRIC" ? "E-Bike" : "Standard"}
              </span>
              <span>{ride.distance_km?.toFixed(1)} km</span>
              <span>
                {new Date(ride.completed_at || ride.created_at).toLocaleDateString("en-FI", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status] ?? "bg-gray-100 text-gray-500"}`}>
              {ride.status.charAt(0) + ride.status.slice(1).toLowerCase().replace("_", " ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
