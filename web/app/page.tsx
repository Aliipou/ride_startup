"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function RootPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (user && accessToken) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [user, accessToken, router]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="26" r="5" stroke="#1B9E77" strokeWidth="2.5" />
            <circle cx="28" cy="26" r="5" stroke="#1B9E77" strokeWidth="2.5" />
            <path
              d="M8 26L14 14H22L28 26"
              stroke="#1B9E77"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 8L22 14"
              stroke="#1B9E77"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="18" cy="7" r="2" fill="#1B9E77" />
          </svg>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
