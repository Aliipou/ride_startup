"use client";

import { useEffect } from "react";
import { Power, PowerOff, MapPin } from "lucide-react";
import { useRiderDutyStore } from "@/lib/store/riderDutyStore";
import { useRiderAuthStore } from "@/lib/store/riderAuthStore";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useRiderLocation } from "@/lib/hooks/useRiderLocation";
import { useRiderWebSocket } from "@/lib/hooks/useRiderWebSocket";
import IncomingRideCard from "@/components/IncomingRideCard";
import EarningsCounter from "@/components/EarningsCounter";
import RideNavigation from "@/components/RideNavigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { rider } = useRiderAuthStore();
  const { status, setStatus, incomingRide, currentRide, earnings } = useRiderDutyStore();

  // Golden-standard rider hooks
  useWakeLock();           // keeps screen on when ONLINE or ON_RIDE
  useRiderLocation();      // sends GPS every 5s when not OFFLINE
  useRiderWebSocket();     // listens for new_ride_request

  const isPending = rider?.approval_status === "PENDING";
  const isRejected = rider?.approval_status === "REJECTED";

  const toggleOnline = async () => {
    const newStatus = status === "OFFLINE" ? "ONLINE" : "OFFLINE";
    try {
      await api.patch("/riders/status", { status: newStatus });
      setStatus(newStatus as any);
      toast.success(newStatus === "ONLINE" ? "You are now Online 🟢" : "You are Offline");
    } catch {
      toast.error("Failed to update status");
    }
  };

  // ── Pending approval ────────────────────────────────────────────────────────
  if (isPending || isRejected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
          <MapPin size={32} className="text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isRejected ? "Application Rejected" : "Under Review"}
        </h2>
        <p className="text-gray-500 text-sm max-w-xs">
          {isRejected
            ? `Reason: ${rider?.rejection_reason || "Please contact support."}`
            : "Your application is being reviewed. We'll notify you once approved — usually within 24 hours."}
        </p>
      </div>
    );
  }

  // ── ON_RIDE — show navigation ───────────────────────────────────────────────
  if (status === "ON_RIDE" && currentRide) {
    return <RideNavigation ride={currentRide} />;
  }

  // ── ONLINE / OFFLINE — main dashboard ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Status bar */}
      <div className={`px-4 py-3 text-center text-sm font-semibold ${
        status === "ONLINE" ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
      }`}>
        {status === "ONLINE" ? "🟢 You are ONLINE — waiting for rides" : "⚫ You are OFFLINE"}
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Earnings */}
        <EarningsCounter
          today={earnings.today}
          available={earnings.available}
          pending={earnings.pending}
        />

        {/* Toggle button */}
        <button
          onClick={toggleOnline}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${
            status === "ONLINE"
              ? "bg-gray-800 text-white"
              : "bg-primary text-white"
          }`}
        >
          {status === "ONLINE" ? (
            <><PowerOff size={24} /> Go Offline</>
          ) : (
            <><Power size={24} /> Go Online</>
          )}
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rides Today", value: "0" },
            { label: "Rating", value: `${rider?.average_rating?.toFixed(1) ?? "—"}★` },
            { label: "Total Rides", value: rider?.total_rides ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Incoming ride overlay */}
      {incomingRide && <IncomingRideCard ride={incomingRide} />}
    </div>
  );
}
