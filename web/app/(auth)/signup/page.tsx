"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Phone, Bike, Gift } from "lucide-react";
import { apiClient } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type TabType = "email" | "phone";

export default function SignupPage() {
  const router = useRouter();

  const [tab, setTab] = useState<TabType>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [emailForm, setEmailForm] = useState({
    fullName: "",
    email: "",
    password: "",
    referralCode: "",
  });

  const [phoneForm, setPhoneForm] = useState({
    fullName: "",
    phone: "",
    referralCode: "",
  });

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.fullName || !emailForm.email || !emailForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (emailForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post("/auth/register", {
        full_name: emailForm.fullName,
        email: emailForm.email,
        password: emailForm.password,
        referral_code: emailForm.referralCode || undefined,
      });
      toast.success("Account created! Please verify your email.");
      router.push(
        `/verify?email=${encodeURIComponent(emailForm.email)}&action=register`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForm.fullName || !phoneForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post("/auth/register/phone", {
        full_name: phoneForm.fullName,
        phone: phoneForm.phone,
        referral_code: phoneForm.referralCode || undefined,
      });
      toast.success("OTP sent to your phone!");
      router.push(
        `/verify?phone=${encodeURIComponent(phoneForm.phone)}&action=register`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 pt-12 pb-8">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Bike size={26} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-dark-50">Ride & Chill</h1>
          <p className="text-xs text-dark-400">Bike Taxi Kokkola</p>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-dark-50 mb-2">Create account</h2>
      <p className="text-dark-400 mb-8">Join the eco-friendly ride revolution</p>

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
        <form onSubmit={handleEmailSignup} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="fullName" className="label">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              className="input-field"
              placeholder="Mikael Virtanen"
              value={emailForm.fullName}
              onChange={(e) =>
                setEmailForm({ ...emailForm, fullName: e.target.value })
              }
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="signupEmail" className="label">
              Email address <span className="text-red-400">*</span>
            </label>
            <input
              id="signupEmail"
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
            <label htmlFor="signupPassword" className="label">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="signupPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input-field pr-12"
                placeholder="Min. 8 characters"
                value={emailForm.password}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, password: e.target.value })
                }
                aria-required="true"
                aria-describedby="password-strength"
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
            <p id="password-strength" className="text-xs text-dark-500 mt-1">
              At least 8 characters
            </p>
          </div>

          <div>
            <label htmlFor="referralCode" className="label">
              Referral code{" "}
              <span className="text-dark-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Gift
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
              />
              <input
                id="referralCode"
                type="text"
                className="input-field pl-10 uppercase"
                placeholder="RIDE2024"
                value={emailForm.referralCode}
                onChange={(e) =>
                  setEmailForm({
                    ...emailForm,
                    referralCode: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
          </div>

          <TermsCheckbox
            checked={agreedToTerms}
            onChange={setAgreedToTerms}
          />

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      )}

      {/* Phone Form */}
      {tab === "phone" && (
        <form onSubmit={handlePhoneSignup} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="phoneFullName" className="label">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="phoneFullName"
              type="text"
              autoComplete="name"
              className="input-field"
              placeholder="Mikael Virtanen"
              value={phoneForm.fullName}
              onChange={(e) =>
                setPhoneForm({ ...phoneForm, fullName: e.target.value })
              }
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="signupPhone" className="label">
              Phone number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm font-medium">
                +358
              </span>
              <input
                id="signupPhone"
                type="tel"
                autoComplete="tel"
                className="input-field pl-14"
                placeholder="40 123 4567"
                value={phoneForm.phone}
                onChange={(e) =>
                  setPhoneForm({ ...phoneForm, phone: e.target.value })
                }
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phoneReferralCode" className="label">
              Referral code{" "}
              <span className="text-dark-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Gift
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
              />
              <input
                id="phoneReferralCode"
                type="text"
                className="input-field pl-10 uppercase"
                placeholder="RIDE2024"
                value={phoneForm.referralCode}
                onChange={(e) =>
                  setPhoneForm({
                    ...phoneForm,
                    referralCode: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
          </div>

          <TermsCheckbox
            checked={agreedToTerms}
            onChange={setAgreedToTerms}
          />

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
              "Continue with Phone"
            )}
          </button>
        </form>
      )}

      <p className="text-center text-dark-400 mt-6 text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold hover:text-primary-400 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-required="true"
        />
        <div
          className={cn(
            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
            checked
              ? "bg-primary border-primary"
              : "bg-dark-700 border-dark-500"
          )}
        >
          {checked && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path
                d="M1 4L4.5 7.5L11 1"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm text-dark-300">
        I agree to the{" "}
        <Link href="/terms" className="text-primary underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary underline">
          Privacy Policy
        </Link>
      </span>
    </label>
  );
}
