"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bike } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";
import OTPInput from "@/components/ui/OTPInput";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const phone = searchParams.get("phone") ?? "";
  const email = searchParams.get("email") ?? "";
  const action = searchParams.get("action") ?? "login";

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    try {
      if (phone) {
        await apiClient.post("/auth/otp/send", { phone });
      } else {
        await apiClient.post("/auth/otp/email/send", { email });
      }
      toast.success("OTP resent!");
      setCountdown(60);
      setCanResend(false);
    } catch {
      toast.error("Failed to resend OTP");
    }
  }, [canResend, phone, email]);

  const handleComplete = useCallback(
    async (otp: string) => {
      setIsLoading(true);
      try {
        const payload = phone
          ? { phone, otp, action }
          : { email, otp, action };

        const res = await apiClient.post<{
          access_token: string;
          refresh_token: string;
          user: {
            id: string;
            full_name: string;
            email: string;
            phone: string | null;
            avatar_url: string | null;
            referral_code: string;
            wallet_balance: number;
          };
        }>("/auth/otp/verify", payload);

        login(res.data.user, res.data.access_token, res.data.refresh_token);
        toast.success("Verified! Welcome to Ride & Chill!");
        router.push("/home");
      } catch {
        toast.error("Invalid OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [phone, email, action, login, router]
  );

  const maskedContact = phone
    ? `+358 ••• ••••${phone.slice(-3)}`
    : email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length));

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 pt-12">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-10 -ml-1 transition-colors w-fit"
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-8">
        <Bike size={30} className="text-primary" />
      </div>

      <h2 className="text-3xl font-bold text-dark-50 mb-3">Enter OTP</h2>
      <p className="text-dark-400 mb-2">
        We sent a 6-digit code to
      </p>
      <p className="text-dark-200 font-semibold mb-10">{maskedContact}</p>

      {/* OTP Input */}
      <div className="mb-8">
        <OTPInput
          length={6}
          onComplete={handleComplete}
          disabled={isLoading}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-dark-400 text-sm">Verifying...</span>
        </div>
      )}

      {/* Resend */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="text-dark-400 text-sm">Didn&apos;t receive it?</span>
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-primary font-semibold text-sm hover:text-primary-400 transition-colors"
          >
            Resend OTP
          </button>
        ) : (
          <span className="text-dark-500 text-sm font-medium">
            Resend in {countdown}s
          </span>
        )}
      </div>

      {/* Change contact */}
      <button
        type="button"
        onClick={() => router.back()}
        className="text-center text-dark-500 text-sm mt-4 hover:text-dark-300 transition-colors"
      >
        Change {phone ? "phone number" : "email"}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
