"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Navigation, Tag, CreditCard, Wallet, Banknote, Zap, Bike } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { useRideStore } from "@/lib/store/rideStore";
import PriceBreakdown from "@/components/ride/PriceBreakdown";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type BikeType = "standard" | "ebike";
type PaymentMethod = "wallet" | "card" | "cash";

interface PriceEstimate {
  base_fare: number;
  distance_fare: number;
  surge_multiplier: number;
  is_surge: boolean;
  promo_discount: number;
  total: number;
  distance_km: number;
  duration_min: number;
}

function BookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { setRide } = useRideStore();

  const destName = searchParams.get("destName") ?? "";
  const destAddress = searchParams.get("destAddress") ?? "";
  const destLat = parseFloat(searchParams.get("destLat") ?? "0");
  const destLng = parseFloat(searchParams.get("destLng") ?? "0");
  const pickupLat = parseFloat(searchParams.get("pickupLat") ?? "0");
  const pickupLng = parseFloat(searchParams.get("pickupLng") ?? "0");
  const pickupAddress = searchParams.get("pickupAddress") ?? "Current location";

  const [bikeType, setBikeType] = useState<BikeType>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!destLat || !destLng || !pickupLat || !pickupLng) {
      setIsLoading(false);
      return;
    }
    const fetchEstimate = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<PriceEstimate>("/rides/estimate", {
          params: {
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
            dest_lat: destLat,
            dest_lng: destLng,
            bike_type: bikeType,
            promo_code: promoApplied ? promoCode : undefined,
          },
        });
        setPriceEstimate(res.data);
      } catch {
        // Use mock estimate if API unavailable
        setPriceEstimate({
          base_fare: 2.5,
          distance_fare: 1.2,
          surge_multiplier: 1.0,
          is_surge: false,
          promo_discount: 0,
          total: 3.7,
          distance_km: 1.4,
          duration_min: 8,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEstimate();
  }, [bikeType, promoApplied, destLat, destLng, pickupLat, pickupLng, promoCode]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      await apiClient.post("/promo/validate", { code: promoCode });
      setPromoApplied(true);
      toast.success("Promo code applied!");
    } catch {
      toast.error("Invalid promo code");
    }
  };

  const handleConfirmRide = async () => {
    if (!priceEstimate) return;
    setIsConfirming(true);
    try {
      const res = await apiClient.post<{
        ride_id: string;
        status: string;
        estimated_pickup_min: number;
      }>("/rides/request", {
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickupAddress,
        dest_lat: destLat,
        dest_lng: destLng,
        dest_address: destAddress,
        bike_type: bikeType,
        payment_method: paymentMethod,
        promo_code: promoApplied ? promoCode : undefined,
      });

      setRide({
        id: res.data.ride_id,
        status: "pending",
        pickup_address: pickupAddress,
        dest_address: destAddress,
        bike_type: bikeType,
        payment_method: paymentMethod,
        total_fare: priceEstimate.total,
        estimated_pickup_min: res.data.estimated_pickup_min,
        rider: null,
      });

      router.push(`/tracking/${res.data.ride_id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to request ride";
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm border-b border-dark-800">
        <div className="flex items-center gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-dark-200" />
          </button>
          <h1 className="text-lg font-bold text-dark-50">Book Ride</h1>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Route card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-3 h-3 rounded-full bg-primary border-2 border-dark-800 ring-2 ring-primary/30" />
              <div className="w-0.5 h-10 bg-dark-600 my-1" />
              <MapPin size={14} className="text-red-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-dark-400 mb-0.5">Pickup</p>
                <p className="text-sm text-dark-100 font-medium">{pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-0.5">Destination</p>
                <p className="text-sm text-dark-100 font-medium">
                  {destName || destAddress || "Enter destination"}
                </p>
                {destAddress && destName && (
                  <p className="text-xs text-dark-500 mt-0.5">{destAddress}</p>
                )}
              </div>
            </div>
          </div>

          {priceEstimate && (
            <div className="flex gap-4 pt-2 border-t border-dark-700">
              <div className="flex items-center gap-1.5">
                <Navigation size={14} className="text-dark-400" />
                <span className="text-sm text-dark-300">
                  {priceEstimate.distance_km.toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-dark-400 text-sm">≈</span>
                <span className="text-sm text-dark-300">
                  {priceEstimate.duration_min} min
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bike type selector */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 mb-3">Bike Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["standard", "ebike"] as BikeType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBikeType(type)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  bikeType === type
                    ? "border-primary bg-primary/10"
                    : "border-dark-700 bg-dark-800 hover:border-dark-500"
                )}
                aria-pressed={bikeType === type}
              >
                <Bike
                  size={28}
                  className={bikeType === type ? "text-primary" : "text-dark-400"}
                />
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      bikeType === type ? "text-primary" : "text-dark-200"
                    )}
                  >
                    {type === "standard" ? "Standard" : "E-Bike"}
                  </p>
                  <p className="text-xs text-dark-500 mt-0.5">
                    {type === "standard" ? "Classic & affordable" : "Faster & easier"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        {isLoading ? (
          <div className="card p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-24 skeleton rounded-lg" />
                <div className="h-4 w-16 skeleton rounded-lg" />
              </div>
            ))}
          </div>
        ) : priceEstimate ? (
          <PriceBreakdown
            baseFare={priceEstimate.base_fare}
            distanceFare={priceEstimate.distance_fare}
            surgeMultiplier={priceEstimate.surge_multiplier}
            isSurge={priceEstimate.is_surge}
            promoDiscount={priceEstimate.promo_discount}
            total={priceEstimate.total}
          />
        ) : null}

        {/* Promo code */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 mb-3">Promo Code</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                className="input-field pl-10 uppercase"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  if (promoApplied) setPromoApplied(false);
                }}
                disabled={promoApplied}
                aria-label="Promo code"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={promoApplied || !promoCode.trim()}
              className={cn(
                "px-4 py-3 rounded-xl font-semibold text-sm transition-all",
                promoApplied
                  ? "bg-primary/20 text-primary cursor-default"
                  : "bg-primary text-white active:scale-95 disabled:opacity-50"
              )}
            >
              {promoApplied ? "Applied" : "Apply"}
            </button>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 mb-3">Payment Method</h2>
          <div className="space-y-2">
            <PaymentOption
              value="wallet"
              current={paymentMethod}
              onChange={setPaymentMethod}
              icon={<Wallet size={18} />}
              label="Wallet"
              description={`Balance: €${(user?.wallet_balance ?? 0).toFixed(2)}`}
            />
            <PaymentOption
              value="card"
              current={paymentMethod}
              onChange={setPaymentMethod}
              icon={<CreditCard size={18} />}
              label="Card"
              description="Visa / Mastercard"
            />
            <PaymentOption
              value="cash"
              current={paymentMethod}
              onChange={setPaymentMethod}
              icon={<Banknote size={18} />}
              label="Cash"
              description="Pay driver directly"
            />
          </div>
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirmRide}
          disabled={isConfirming || !priceEstimate}
          className="btn-primary"
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Confirming ride...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap size={18} />
              Confirm Ride
              {priceEstimate && (
                <span className="ml-1 font-bold">
                  €{priceEstimate.total.toFixed(2)}
                </span>
              )}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function PaymentOption({
  value,
  current,
  onChange,
  icon,
  label,
  description,
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  const isSelected = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-dark-700 bg-dark-800 hover:border-dark-500"
      )}
      aria-pressed={isSelected}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          isSelected ? "bg-primary/20 text-primary" : "bg-dark-700 text-dark-400"
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-dark-100")}>
          {label}
        </p>
        <p className="text-xs text-dark-400">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
          isSelected ? "border-primary" : "border-dark-600"
        )}
      >
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </button>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <BookContent />
    </Suspense>
  );
}
