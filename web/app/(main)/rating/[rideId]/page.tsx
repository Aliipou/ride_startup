"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Star, ThumbsUp } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useRideStore } from "@/lib/store/rideStore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const TIP_PRESETS = [0, 1, 2, 5] as const;

export default function RatingPage() {
  const router = useRouter();
  const params = useParams();
  const rideId = params.rideId as string;
  const { currentRide, clearRide } = useRideStore();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const effectiveTip = isCustomTip
    ? parseFloat(customTip) || 0
    : tipAmount;

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/rides/${rideId}/rate`, {
        rating,
        tip_amount: effectiveTip,
        comment: comment.trim() || undefined,
      });
      setIsSubmitted(true);
      clearRide();
      setTimeout(() => router.push("/home"), 2000);
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <ThumbsUp size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-dark-50 mb-2">Thanks for rating!</h2>
        <p className="text-dark-400 text-center">
          Your feedback helps improve the service
        </p>
        <div className="flex gap-1 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        {currentRide?.rider ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-2xl font-bold">
                {currentRide.rider.name?.charAt(0) ?? "R"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-dark-50 mb-1">
              Rate your ride
            </h2>
            <p className="text-dark-400">
              How was your trip with{" "}
              <span className="text-dark-200 font-medium">
                {currentRide.rider.name}
              </span>
              ?
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-dark-50 mb-2">
              Rate your ride
            </h2>
            <p className="text-dark-400">How was your experience?</p>
          </>
        )}
      </div>

      {/* Star rating */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="flex gap-3 mb-3"
          role="group"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform active:scale-90"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              aria-pressed={rating === star}
            >
              <Star
                size={44}
                className={cn(
                  "transition-colors",
                  (hoveredRating || rating) >= star
                    ? "text-accent fill-accent"
                    : "text-dark-600"
                )}
              />
            </button>
          ))}
        </div>
        {(hoveredRating || rating) > 0 && (
          <p className="text-accent font-semibold text-lg animate-fade-in">
            {ratingLabels[hoveredRating || rating]}
          </p>
        )}
      </div>

      {/* Tip */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-dark-300 mb-3">
          Add a tip (optional)
        </h3>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {TIP_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setTipAmount(amount);
                setIsCustomTip(false);
                setCustomTip("");
              }}
              className={cn(
                "py-3 rounded-xl font-semibold text-sm transition-all border-2",
                !isCustomTip && tipAmount === amount
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500"
              )}
              aria-pressed={!isCustomTip && tipAmount === amount}
            >
              {amount === 0 ? "No tip" : `€${amount}`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsCustomTip(true)}
          className={cn(
            "w-full py-3 rounded-xl font-medium text-sm border-2 transition-all",
            isCustomTip
              ? "border-primary bg-primary/10 text-primary"
              : "border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500"
          )}
        >
          Custom amount
        </button>
        {isCustomTip && (
          <div className="relative mt-2 animate-fade-in">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-300 font-medium">
              €
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input-field pl-8"
              placeholder="0.00"
              value={customTip}
              onChange={(e) => setCustomTip(e.target.value)}
              aria-label="Custom tip amount in euros"
            />
          </div>
        )}
      </div>

      {/* Comment */}
      <div className="mb-8">
        <label htmlFor="rideComment" className="label">
          Comment{" "}
          <span className="text-dark-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="rideComment"
          rows={3}
          className="input-field resize-none"
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-dark-500 text-right mt-1">
          {comment.length}/500
        </p>
      </div>

      {/* Tip summary */}
      {effectiveTip > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-4 animate-fade-in">
          <p className="text-accent text-sm font-medium text-center">
            You&apos;re tipping €{effectiveTip.toFixed(2)} — thank you!
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="btn-primary"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          `Submit${effectiveTip > 0 ? ` & Tip €${effectiveTip.toFixed(2)}` : ""}`
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          clearRide();
          router.push("/home");
        }}
        className="text-center text-dark-500 text-sm mt-4 hover:text-dark-300 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}
