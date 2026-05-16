"use client";

import { useState } from "react";
import { User, Copy, LogOut, MapPin, Bell, ChevronRight, Check } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
          {initials}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{user?.full_name}</p>
          <p className="text-gray-500 text-sm">{user?.email || user?.phone}</p>
        </div>
      </div>

      {/* Referral */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Refer a Friend</h2>
        <p className="text-xs text-gray-500 mb-2">Share your code — you both get €5 wallet credit</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
          <span className="flex-1 font-mono font-bold text-primary tracking-widest">{user?.referral_code}</span>
          <button onClick={handleCopyReferral} className="text-gray-400 hover:text-primary transition-colors">
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {[
          { icon: User, label: "Edit Profile", action: () => {} },
          { icon: MapPin, label: "Saved Places", action: () => {} },
          { icon: Bell, label: "Notifications", action: () => {} },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <Icon size={18} className="text-gray-400" />
            <span className="flex-1 text-left text-gray-800 text-sm font-medium">{label}</span>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 rounded-2xl text-red-600 font-medium"
      >
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  );
}
