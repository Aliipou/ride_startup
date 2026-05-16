"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Phone, MessageCircle, X, ChevronDown } from "lucide-react";
import { useRideStore } from "@/lib/store/rideStore";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useAuthStore } from "@/lib/store/authStore";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { apiClient } from "@/lib/api";
import StatusBanner from "@/components/ui/StatusBanner";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-dark-800 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

type RideStatus =
  | "pending"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

interface RiderInfo {
  id: string;
  name: string;
  rating: number;
  bike_type: string;
  photo_url: string | null;
  phone: string;
  current_lat: number;
  current_lng: number;
}

export default function TrackingPage() {
  const router = useRouter();
  const params = useParams();
  const rideId = params.rideId as string;
  const { user, accessToken } = useAuthStore();
  const { currentRide, riderLocation, rideStatus, updateRiderLocation, setStatus } =
    useRideStore();

  const [rider, setRider] = useState<RiderInfo | null>(currentRide?.rider ?? null);
  const [eta, setEta] = useState<number | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);

  // Keep screen on during active ride
  useWakeLock(
    rideStatus !== "completed" && rideStatus !== "cancelled" && rideStatus !== null
  );

  // WebSocket for live updates
  const { isConnected } = useWebSocket(
    user?.id && accessToken
      ? `${process.env.NEXT_PUBLIC_WS_URL ?? ""}/ws/user/${user.id}?token=${accessToken}&ride_id=${rideId}`
      : null,
    useCallback(
      (event: { type: string; data: Record<string, unknown> }) => {
        switch (event.type) {
          case "rider_location":
            updateRiderLocation({
              lat: event.data.lat as number,
              lng: event.data.lng as number,
            });
            if (typeof event.data.eta_min === "number") {
              setEta(event.data.eta_min);
            }
            break;
          case "ride_status":
            setStatus(event.data.status as RideStatus);
            if (event.data.status === "accepted" && event.data.rider) {
              setRider(event.data.rider as RiderInfo);
            }
            if (event.data.status === "completed") {
              setTimeout(() => router.push(`/rating/${rideId}`), 1500);
            }
            if (event.data.status === "cancelled") {
              toast.error("Ride was cancelled");
              setTimeout(() => router.push("/home"), 2000);
            }
            break;
          case "eta_update":
            setEta(event.data.eta_min as number);
            break;
        }
      },
      [updateRiderLocation, setStatus, router, rideId]
    )
  );

  // Fetch initial ride state
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await apiClient.get<{
          status: RideStatus;
          rider: RiderInfo | null;
          eta_min: number | null;
        }>(`/rides/${rideId}`);
        setStatus(res.data.status);
        if (res.data.rider) setRider(res.data.rider);
        if (res.data.eta_min) setEta(res.data.eta_min);
      } catch {
        // fall back to store state
      }
    };
    fetchRide();
  }, [rideId, setStatus]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await apiClient.post(`/rides/${rideId}/cancel`);
      toast.success("Ride cancelled");
      router.push("/home");
    } catch {
      toast.error("Cancellation failed");
    } finally {
      setIsCancelling(false);
      setIsCancelOpen(false);
    }
  };

  const canCancel = rideStatus === "pending" || rideStatus === "accepted";

  const mapMarkers = [
    ...(riderLocation
      ? [{ id: "rider", lat: riderLocation.lat, lng: riderLocation.lng, type: "rider" as const }]
      : []),
  ];

  const mapCenter: [number, number] = riderLocation
    ? [riderLocation.lng, riderLocation.lat]
    : [23.1303, 63.8384];

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView center={mapCenter} zoom={15} markers={mapMarkers} />
      </div>

      {/* Connection indicator */}
      <div className="absolute top-4 right-4 z-30">
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            isConnected
              ? "bg-primary/90 text-white"
              : "bg-dark-700/90 text-dark-400"
          )}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isConnected ? "bg-white animate-pulse" : "bg-dark-500"
            )}
          />
          {isConnected ? "Live" : "Reconnecting..."}
        </div>
      </div>

      {/* Status banner */}
      <div className="absolute top-4 left-4 right-16 z-30">
        <StatusBanner status={rideStatus ?? "pending"} eta={eta} />
      </div>

      {/* Bottom sheet */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-16 z-40 bg-dark-800/98 backdrop-blur-xl border-t border-dark-700 rounded-t-3xl shadow-2xl transition-all duration-300"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <button
            type="button"
            className="w-10 h-1 bg-dark-600 rounded-full"
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            aria-label={isSheetExpanded ? "Collapse" : "Expand"}
          />
        </div>

        {isSheetExpanded && (
          <div className="px-5 pb-6">
            {/* Rider info card */}
            {rider ? (
              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  {rider.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rider.photo_url}
                      alt={rider.name}
                      className="w-14 h-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-xl font-bold">
                        {rider.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-accent text-dark-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    ★ {rider.rating.toFixed(1)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-dark-50 text-base">{rider.name}</p>
                  <p className="text-sm text-dark-400 capitalize">
                    {rider.bike_type === "ebike" ? "E-Bike" : "Standard Bike"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${rider.phone}`}
                    className="w-11 h-11 flex items-center justify-center bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
                    aria-label="Call rider"
                  >
                    <Phone size={18} />
                  </a>
                  <button
                    type="button"
                    className="w-11 h-11 flex items-center justify-center bg-dark-700 text-dark-300 rounded-xl hover:bg-dark-600 transition-colors"
                    aria-label="Message rider"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 skeleton rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-32" />
                  <div className="h-3 skeleton rounded-lg w-24" />
                </div>
              </div>
            )}

            {/* Ride info */}
            <div className="bg-dark-700/50 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="w-0.5 h-8 bg-dark-600 my-1" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-dark-400">From</p>
                    <p className="text-sm text-dark-100 font-medium">
                      {currentRide?.pickup_address ?? "Your location"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">To</p>
                    <p className="text-sm text-dark-100 font-medium">
                      {currentRide?.dest_address ?? "Destination"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel button */}
            {canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
              >
                Cancel Ride
              </button>
            )}
          </div>
        )}

        {!isSheetExpanded && (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => setIsSheetExpanded(true)}
              className="flex items-center gap-2 text-dark-400"
            >
              <ChevronDown size={16} />
              <span className="text-sm">Show details</span>
            </button>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {isCancelOpen && (
        <div
          className="absolute inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-end"
          onClick={() => setIsCancelOpen(false)}
        >
          <div
            className="w-full bg-dark-800 rounded-t-3xl border-t border-dark-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-dark-50">Cancel Ride?</h3>
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                aria-label="Close"
              >
                <X size={20} className="text-dark-400" />
              </button>
            </div>
            <p className="text-dark-400 text-sm mb-6">
              Cancelling may incur a fee if a rider has already accepted your request.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="btn-secondary flex-1"
              >
                Keep Ride
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-red-500 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
