"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const BlackoutMap = dynamic(() => import("@/components/BlackoutMap"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-10 text-white font-mono">
      Loading London Grid Data...
    </p>
  ),
});

export default function Map() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <main className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 font-mono">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="-10 -10 34 34"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6 absolute z-1000"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
        />
      </svg>

      <div className="h-screen w-full">
        <BlackoutMap />
      </div>
    </main>
  );
}
