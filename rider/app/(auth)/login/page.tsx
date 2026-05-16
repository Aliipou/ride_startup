'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Bike, Lock, Mail, AlertCircle } from 'lucide-react';
import { useRiderAuthStore } from '@/lib/store/riderAuthStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useRiderAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login(email.trim().toLowerCase(), password);
      const { rider, accessToken, refreshToken } = response.data;
      login(rider, { accessToken, refreshToken });
      toast.success(`Welcome back, ${rider.name.split(' ')[0]}!`);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 401) {
        setError('Invalid email or password');
      } else if (axiosErr.response?.status === 403) {
        setError('Your account has been suspended. Contact support.');
      } else if (axiosErr.response?.data?.message) {
        setError(axiosErr.response.data.message);
      } else {
        setError('Unable to connect. Check your internet connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Ride & Chill</h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">Rider Portal — Kokkola</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-1">Sign In</h2>
            <p className="text-gray-400 text-sm mb-6">Welcome back, rider!</p>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    className={clsx(
                      'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                      'pl-10 pr-4 py-3.5 text-sm font-medium',
                      'border border-gray-700 focus:border-primary focus:outline-none',
                      'transition-colors duration-200'
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={clsx(
                      'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                      'pl-10 pr-12 py-3.5 text-sm font-medium',
                      'border border-gray-700 focus:border-primary focus:outline-none',
                      'transition-colors duration-200'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={clsx(
                  'w-full py-4 rounded-2xl bg-primary text-white font-bold text-base',
                  'transition-all duration-200 mt-2',
                  'hover:bg-primary-600 active:scale-95',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'shadow-lg shadow-primary/30',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Register link */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              Not registered?{' '}
              <Link
                href="/auth/register"
                className="text-primary font-semibold hover:text-primary-400 transition-colors"
              >
                Apply to be a rider
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-6">
        <p className="text-gray-600 text-xs">
          Ride & Chill © {new Date().getFullYear()} · Kokkola, Finland
        </p>
      </div>
    </div>
  );
}
