"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Phone, Bike } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type TabType = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [tab, setTab] = useState<TabType>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [phoneForm, setPhoneForm] = useState({ phone: "" });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email || !emailForm.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
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
      }>("/auth/login", {
        email: emailForm.email,
        password: emailForm.password,
      });
      login(res.data.user, res.data.access_token, res.data.refresh_token);
      toast.success(`Welcome back, ${res.data.user.full_name.split(" ")[0]}!`);
      router.push("/home");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForm.phone) {
      toast.error("Please enter your phone number");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post("/auth/otp/send", { phone: phoneForm.phone });
      toast.success("OTP sent!");
      router.push(
        `/verify?phone=${encodeURIComponent(phoneForm.phone)}&action=login`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Bike size={26} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">Ride & Chill</h1>
            <p className="text-xs text-dark-400">Bike Taxi Kokkola</p>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-dark-50 mb-2">Welcome back</h2>
        <p className="text-dark-400 mb-8">Sign in to continue your journey</p>

        {/* Tab Toggle */}
        <div className="flex bg-dark-800 rounded-2xl p-1 mb-8" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "email"}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === "email"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-dark-400 hover:text-dark-200"
            )}
            onClick={() => setTab("email")}
          >
            <Mail size={16} />
            Email
          </button>
          <button
            role="tab"
            aria-selected={tab === "phone"}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === "phone"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-dark-400 hover:text-dark-200"
            )}
            onClick={() => setTab("phone")}
          >
            <Phone size={16} />
            Phone
          </button>
        </div>

        {/* Email Form */}
        {tab === "email" && (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input-field"
                placeholder="you@example.com"
                value={emailForm.email}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, email: e.target.value })
                }
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={emailForm.password}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, password: e.target.value })
                  }
                  aria-required="true"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn-primary mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}

        {/* Phone Form */}
        {tab === "phone" && (
          <form onSubmit={handlePhoneLogin} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="phone" className="label">
                Phone number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm font-medium">
                  +358
                </span>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className="input-field pl-14"
                  placeholder="40 123 4567"
                  value={phoneForm.phone}
                  onChange={(e) => setPhoneForm({ phone: e.target.value })}
                  aria-required="true"
                  aria-describedby="phone-hint"
                />
              </div>
              <p id="phone-hint" className="text-xs text-dark-500 mt-1">
                Finnish number (e.g. +358 40 123 4567)
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-dark-500 text-sm">or continue with</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn-secondary flex items-center justify-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign up link */}
        <p className="text-center text-dark-400 mt-6 text-sm">
          New to Ride & Chill?{" "}
          <Link
            href="/signup"
            className="text-primary font-semibold hover:text-primary-400 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
