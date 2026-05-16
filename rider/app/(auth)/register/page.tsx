'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, Lock, Bike, Zap, Upload,
  ChevronRight, ChevronLeft, Check, Eye, EyeOff,
  AlertCircle, Camera, CreditCard, X
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useRiderAuthStore } from '@/lib/store/riderAuthStore';
import { BikeType } from '@/lib/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  bikeType: BikeType | null;
  idFront: File | null;
  idBack: File | null;
  profilePhoto: File | null;
  bikePhoto: File | null;
}

interface Previews {
  idFront: string | null;
  idBack: string | null;
  profilePhoto: string | null;
  bikePhoto: string | null;
}

const STEPS = ['Personal Info', 'Bike Type', 'Documents', 'Review'];

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useRiderAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'general', string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [previews, setPreviews] = useState<Previews>({
    idFront: null,
    idBack: null,
    profilePhoto: null,
    bikePhoto: null,
  });

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bikeType: null,
    idFront: null,
    idBack: null,
    profilePhoto: null,
    bikePhoto: null,
  });

  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const bikePhotoRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFileChange = (
    key: 'idFront' | 'idBack' | 'profilePhoto' | 'bikePhoto',
    file: File | null
  ) => {
    updateField(key, file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [key]: url }));
    } else {
      setPreviews((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validateStep = (currentStep: Step): boolean => {
    const newErrors: typeof errors = {};

    if (currentStep === 1) {
      if (!form.name.trim() || form.name.trim().length < 2) {
        newErrors.name = 'Full name must be at least 2 characters';
      }
      if (!form.email.includes('@') || !form.email.includes('.')) {
        newErrors.email = 'Enter a valid email address';
      }
      if (!/^\+?[\d\s\-()]{7,}$/.test(form.phone)) {
        newErrors.phone = 'Enter a valid phone number';
      }
      if (form.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (currentStep === 2) {
      if (!form.bikeType) {
        newErrors.bikeType = 'Please select your bike type';
      }
    }

    if (currentStep === 3) {
      if (!form.idFront) newErrors.idFront = 'ID front photo is required';
      if (!form.idBack) newErrors.idBack = 'ID back photo is required';
      if (!form.profilePhoto) newErrors.profilePhoto = 'Profile photo is required';
      if (!form.bikePhoto) newErrors.bikePhoto = 'Bike photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4) as Step);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim().toLowerCase());
      formData.append('phone', form.phone.trim());
      formData.append('password', form.password);
      formData.append('bikeType', form.bikeType!);
      if (form.idFront) formData.append('idFront', form.idFront);
      if (form.idBack) formData.append('idBack', form.idBack);
      if (form.profilePhoto) formData.append('profilePhoto', form.profilePhoto);
      if (form.bikePhoto) formData.append('bikePhoto', form.bikePhoto);

      const response = await authApi.register(formData);
      const { rider, accessToken, refreshToken } = response.data;
      login(rider, { accessToken, refreshToken });
      toast.success('Application submitted! We\'ll review it shortly.');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      if (axiosErr.response?.data?.errors) {
        setErrors(axiosErr.response.data.errors);
      } else if (axiosErr.response?.data?.message) {
        setErrors({ general: axiosErr.response.data.message });
      } else {
        setErrors({ general: 'Failed to submit application. Please try again.' });
      }
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <div className="px-6 pt-safe-top pb-4 flex items-center gap-4">
        {step > 1 ? (
          <button
            onClick={prevStep}
            className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Become a Rider</h1>
          <p className="text-gray-400 text-xs">Step {step} of 4 — {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-6">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'h-1.5 flex-1 rounded-full transition-all duration-500',
                i < step ? 'bg-primary' : 'bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-32">
        {errors.general && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Mikael Virtanen"
                  autoComplete="name"
                  className={clsx(
                    'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                    'pl-10 pr-4 py-3.5 text-sm font-medium',
                    'border focus:outline-none transition-colors duration-200',
                    errors.name ? 'border-red-500' : 'border-gray-700 focus:border-primary'
                  )}
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  className={clsx(
                    'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                    'pl-10 pr-4 py-3.5 text-sm font-medium',
                    'border focus:outline-none transition-colors duration-200',
                    errors.email ? 'border-red-500' : 'border-gray-700 focus:border-primary'
                  )}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+358 40 123 4567"
                  autoComplete="tel"
                  className={clsx(
                    'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                    'pl-10 pr-4 py-3.5 text-sm font-medium',
                    'border focus:outline-none transition-colors duration-200',
                    errors.phone ? 'border-red-500' : 'border-gray-700 focus:border-primary'
                  )}
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={clsx(
                    'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                    'pl-10 pr-12 py-3.5 text-sm font-medium',
                    'border focus:outline-none transition-colors duration-200',
                    errors.password ? 'border-red-500' : 'border-gray-700 focus:border-primary'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={clsx(
                    'w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl',
                    'pl-10 pr-4 py-3.5 text-sm font-medium',
                    'border focus:outline-none transition-colors duration-200',
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-700 focus:border-primary'
                  )}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Bike Type */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-gray-400 text-sm mb-6">
              Select the type of bike you will use for rides.
            </p>

            {errors.bikeType && (
              <p className="text-red-400 text-sm">{errors.bikeType}</p>
            )}

            <button
              onClick={() => updateField('bikeType', 'STANDARD')}
              className={clsx(
                'w-full bg-gray-900 rounded-2xl p-5 border-2 transition-all duration-200',
                'flex items-center gap-4 text-left',
                form.bikeType === 'STANDARD'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <div
                className={clsx(
                  'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
                  form.bikeType === 'STANDARD' ? 'bg-primary' : 'bg-gray-800'
                )}
              >
                <Bike
                  className={clsx(
                    'w-7 h-7',
                    form.bikeType === 'STANDARD' ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              <div>
                <p className="text-white font-bold text-base">Standard Bike</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  Regular pedal bike — eco-friendly, great for short distances
                </p>
              </div>
              {form.bikeType === 'STANDARD' && (
                <Check className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
              )}
            </button>

            <button
              onClick={() => updateField('bikeType', 'ELECTRIC')}
              className={clsx(
                'w-full bg-gray-900 rounded-2xl p-5 border-2 transition-all duration-200',
                'flex items-center gap-4 text-left',
                form.bikeType === 'ELECTRIC'
                  ? 'border-accent bg-accent/5'
                  : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <div
                className={clsx(
                  'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
                  form.bikeType === 'ELECTRIC' ? 'bg-accent' : 'bg-gray-800'
                )}
              >
                <Zap
                  className={clsx(
                    'w-7 h-7',
                    form.bikeType === 'ELECTRIC' ? 'text-white' : 'text-gray-400'
                  )}
                />
              </div>
              <div>
                <p className="text-white font-bold text-base">Electric Bike</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  E-bike — faster rides, higher earnings potential
                </p>
              </div>
              {form.bikeType === 'ELECTRIC' && (
                <Check className="w-5 h-5 text-accent ml-auto flex-shrink-0" />
              )}
            </button>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-gray-400 text-sm mb-2">
              Upload clear photos of your documents. All images must be readable.
            </p>

            {(
              [
                { key: 'idFront', label: 'ID Card — Front', icon: CreditCard, ref: idFrontRef },
                { key: 'idBack', label: 'ID Card — Back', icon: CreditCard, ref: idBackRef },
                { key: 'profilePhoto', label: 'Profile Photo', icon: Camera, ref: profilePhotoRef },
                { key: 'bikePhoto', label: 'Bike Photo', icon: Bike, ref: bikePhotoRef },
              ] as const
            ).map(({ key, label, icon: Icon, ref }) => (
              <div key={key}>
                <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
                  {label}
                </label>
                <input
                  ref={ref}
                  type="file"
                  accept="image/*"
                  capture={key === 'profilePhoto' ? 'user' : 'environment'}
                  className="hidden"
                  onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => ref.current?.click()}
                  className={clsx(
                    'w-full rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden',
                    errors[key as keyof typeof errors] ? 'border-red-500' : 'border-gray-700 hover:border-gray-500',
                    previews[key] ? 'p-0' : 'p-6'
                  )}
                >
                  {previews[key] ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previews[key]!}
                        alt={label}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-semibold">Tap to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">
                        Tap to upload
                      </p>
                      <p className="text-gray-600 text-xs">
                        JPG, PNG — max 10MB
                      </p>
                    </div>
                  )}
                </button>
                {errors[key as keyof typeof errors] && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors[key as keyof typeof errors]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-gray-400 text-sm mb-4">
              Review your application before submitting.
            </p>

            {/* Personal Info */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3">Personal Information</h3>
              <div className="space-y-2">
                {[
                  { label: 'Name', value: form.name },
                  { label: 'Email', value: form.email },
                  { label: 'Phone', value: form.phone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-white text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bike Type */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3">Bike Type</h3>
              <div className="flex items-center gap-3">
                {form.bikeType === 'ELECTRIC' ? (
                  <Zap className="w-5 h-5 text-accent" />
                ) : (
                  <Bike className="w-5 h-5 text-primary" />
                )}
                <span className="text-white font-medium">
                  {form.bikeType === 'ELECTRIC' ? 'Electric Bike' : 'Standard Bike'}
                </span>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3">Documents</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'idFront', label: 'ID Front' },
                  { key: 'idBack', label: 'ID Back' },
                  { key: 'profilePhoto', label: 'Profile Photo' },
                  { key: 'bikePhoto', label: 'Bike Photo' },
                ].map(({ key, label }) => (
                  <div key={key} className="relative">
                    {previews[key as keyof Previews] ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previews[key as keyof Previews]!}
                          alt={label}
                          className="w-full h-24 object-cover rounded-xl"
                        />
                        <div className="absolute bottom-1 left-1 right-1">
                          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-lg font-medium block text-center">
                            {label}
                          </span>
                        </div>
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-gray-800 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
              <p className="text-primary-300 text-sm text-center font-medium">
                By submitting, you agree to our terms of service and confirm that all
                information provided is accurate.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 bg-gradient-to-t from-dark via-dark/95 to-transparent pt-4">
        {step < 4 ? (
          <button
            onClick={nextStep}
            className={clsx(
              'w-full py-4 rounded-2xl bg-primary text-white font-bold text-base',
              'flex items-center justify-center gap-2',
              'transition-all duration-200 hover:bg-primary-600 active:scale-95',
              'shadow-lg shadow-primary/30'
            )}
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={clsx(
              'w-full py-4 rounded-2xl bg-primary text-white font-bold text-base',
              'flex items-center justify-center gap-2',
              'transition-all duration-200 hover:bg-primary-600 active:scale-95',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'shadow-lg shadow-primary/30'
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Submit Application
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
