"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Navigation,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useAuthStore } from "@/lib/store/authStore";
import { useRideStore } from "@/lib/store/rideStore";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// Dynamic import for SSR safety
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-dark-800 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

interface SuggestedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface NearbyRider {
  id: string;
  lat: number;
  lng: number;
  bike_type: "standard" | "ebike";
}

interface SurgeInfo {
  is_active: boolean;
  multiplier: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { clearRide } = useRideStore();
  const { position, error: geoError } = useGeolocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedPlace[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [nearbyRiders, setNearbyRiders] = useState<NearbyRider[]>([]);
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo>({ is_active: false, multiplier: 1 });
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("Detecting location...");
  const [isRequestLoading, setIsRequestLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any existing ride on mount
  useEffect(() => {
    clearRide();
  }, [clearRide]);

  // Reverse geocode pickup
  useEffect(() => {
    if (!position) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${position.lng},${position.lat}.json?access_token=${token}&limit=1&language=en`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.features?.[0]) {
          setPickupAddress(data.features[0].place_name);
        }
      })
      .catch(() => setPickupAddress("Current location"));
  }, [position]);

  // Fetch nearby riders
  useEffect(() => {
    if (!position) return;
    const fetchRiders = async () => {
      try {
        const res = await apiClient.get<{ riders: NearbyRider[] }>(
          `/riders/nearby?lat=${position.lat}&lng=${position.lng}&radius=2000`
        );
        setNearbyRiders(res.data.riders);
      } catch {
        // silently fail — map still works
      }
    };
    fetchRiders();
    const interval = setInterval(fetchRiders, 15000);
    return () => clearInterval(interval);
  }, [position]);

  // Fetch surge pricing
  useEffect(() => {
    if (!position) return;
    apiClient
      .get<SurgeInfo>(`/pricing/surge?lat=${position.lat}&lng=${position.lng}`)
      .then((res) => setSurgeInfo(res.data))
      .catch(() => {});
  }, [position]);

  // Debounced search
  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim() || q.length < 2) {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) return;
        const center = position ? `${position.lng},${position.lat}` : "23.12,63.84";
        try {
          const r = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&proximity=${center}&limit=5&language=en&country=FI`
          );
          const data = await r.json();
          setSuggestions(
            (data.features ?? []).map(
              (f: { id: string; text: string; place_name: string; center: [number, number] }) => ({
                id: f.id,
                name: f.text,
                address: f.place_name,
                lat: f.center[1],
                lng: f.center[0],
              })
            )
          );
          setIsSuggestionsOpen(true);
        } catch {
          setSuggestions([]);
        }
      }, 350);
    },
    [position]
  );

  const handleSelectDestination = (place: SuggestedPlace) => {
    setSearchQuery(place.name);
    setIsSuggestionsOpen(false);
    // Navigate to booking with destination pre-filled
    const params = new URLSearchParams({
      destName: place.name,
      destAddress: place.address,
      destLat: place.lat.toString(),
      destLng: place.lng.toString(),
    });
    if (position) {
      params.set("pickupLat", position.lat.toString());
      params.set("pickupLng", position.lng.toString());
      params.set("pickupAddress", pickupAddress);
    }
    router.push(`/book?${params.toString()}`);
  };

  const handleRequestRide = async () => {
    if (!searchQuery) {
      toast.error("Please enter your destination");
      setIsSheetExpanded(true);
      return;
    }
    router.push("/book");
  };

  // Map markers
  const markers = [
    ...(position
      ? [{ id: "user", lat: position.lat, lng: position.lng, type: "user" as const }]
      : []),
    ...nearbyRiders.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      type: "rider" as const,
    })),
  ];

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView
          center={
            position
              ? [position.lng, position.lat]
              : [23.1303, 63.8384] // Kokkola center
          }
          zoom={14}
          markers={markers}
        />
      </div>

      {/* Search bar (top) */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-safe-top">
        <div
          className="mt-4 bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-dark-700 shadow-2xl overflow-hidden"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Search size={18} className="text-dark-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSuggestionsOpen(suggestions.length > 0)}
              placeholder="Where to, {user?.full_name?.split(' ')[0] ?? 'friend'}?"
              className="flex-1 bg-transparent text-dark-50 placeholder:text-dark-400 outline-none text-base"
              aria-label="Destination search"
              aria-expanded={isSuggestionsOpen}
              aria-autocomplete="list"
              role="combobox"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setIsSuggestionsOpen(false);
                }}
                aria-label="Clear search"
              >
                <X size={16} className="text-dark-400 hover:text-dark-200" />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {isSuggestionsOpen && suggestions.length > 0 && (
            <div className="border-t border-dark-700" role="listbox">
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  role="option"
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-700/60 transition-colors text-left"
                  onClick={() => handleSelectDestination(place)}
                >
                  <MapPin
                    size={16}
                    className="text-primary mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-dark-100 text-sm font-medium truncate">
                      {place.name}
                    </p>
                    <p className="text-dark-400 text-xs truncate">
                      {place.address}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Geolocation error */}
        {geoError && (
          <div className="mt-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-2">
            <p className="text-accent text-xs">{geoError}</p>
          </div>
        )}
      </div>

      {/* Surge badge */}
      {surgeInfo.is_active && (
        <div className="absolute top-24 right-4 z-30 animate-fade-in">
          <div className="flex items-center gap-1.5 bg-accent/95 text-dark-900 px-3 py-1.5 rounded-full shadow-lg shadow-accent/30">
            <Zap size={14} className="fill-dark-900" />
            <span className="text-xs font-bold">
              {surgeInfo.multiplier.toFixed(1)}× Surge
            </span>
          </div>
        </div>
      )}

      {/* Re-center button */}
      {position && (
        <button
          type="button"
          className="absolute right-4 z-30 bg-dark-800/95 backdrop-blur-sm border border-dark-700 rounded-full p-3 shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 200px)" }}
          aria-label="Center map on my location"
          onClick={() => {
            // MapView will handle via key prop trigger
          }}
        >
          <Navigation size={18} className="text-primary" />
        </button>
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          "absolute left-0 right-0 z-40 bg-dark-800/98 backdrop-blur-xl border-t border-dark-700 rounded-t-3xl shadow-2xl transition-all duration-300",
          isSheetExpanded ? "bottom-16 h-auto" : "bottom-16"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-600 rounded-full" />
        </div>

        {/* Toggle */}
        <button
          type="button"
          className="absolute top-3 right-4 text-dark-400 hover:text-dark-200"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          aria-label={isSheetExpanded ? "Collapse sheet" : "Expand sheet"}
        >
          {isSheetExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>

        <div className="px-5 pb-5">
          {/* Greeting */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-dark-50">
                Ready to ride?
              </h3>
              <p className="text-sm text-dark-400">
                {nearbyRiders.length > 0
                  ? `${nearbyRiders.length} rider${nearbyRiders.length !== 1 ? "s" : ""} nearby`
                  : "Looking for riders..."}
              </p>
            </div>
            {surgeInfo.is_active && (
              <div className="flex items-center gap-1 bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5">
                <Zap size={14} className="text-accent" />
                <span className="text-accent text-sm font-bold">
                  {surgeInfo.multiplier.toFixed(1)}×
                </span>
              </div>
            )}
          </div>

          {/* Pickup */}
          <div className="flex items-center gap-3 bg-dark-700/50 rounded-xl px-4 py-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-dark-800 ring-2 ring-primary/30" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-dark-400 mb-0.5">Pickup</p>
              <p className="text-sm text-dark-100 truncate">{pickupAddress}</p>
            </div>
          </div>

          {/* Destination search shortcut */}
          <button
            type="button"
            className="flex items-center gap-3 w-full bg-dark-700/50 rounded-xl px-4 py-3 mb-4 hover:bg-dark-600/50 transition-colors"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>(
                'input[aria-label="Destination search"]'
              );
              input?.focus();
            }}
          >
            <MapPin size={16} className="text-dark-400" />
            <span className="text-sm text-dark-400">
              {searchQuery || "Enter destination"}
            </span>
          </button>

          {/* Request ride button */}
          <button
            type="button"
            onClick={handleRequestRide}
            disabled={isRequestLoading}
            className="btn-primary"
          >
            {isRequestLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding riders...
              </span>
            ) : (
              "Request Ride"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
