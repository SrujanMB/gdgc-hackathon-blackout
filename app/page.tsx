"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import dynamic from "next/dynamic";
import React from "react";
import LocationFilter from "@/components/LocationFilter";

const BlackoutMap = dynamic(() => import("@/components/BlackoutMap"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-10 text-white font-mono">
      Loading London Grid Data...
    </p>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedTradeId, setSelectedTradeId] = React.useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <main className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-white">
        <p className="font-mono">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleLocationSelect = (result: any) => {
    setSelectedLocation({
      lat: result.latitude,
      lng: result.longitude,
    });
    setSelectedTradeId(result.id);
  };

  const handleClearSearchLocation = () => {
    setSelectedLocation(null);
    setSelectedTradeId(null);
  };

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white">
      {/* Header with user info and logout */}
      <div className="absolute top-4 left-4 z-[999] bg-zinc-950/90 backdrop-blur border border-zinc-800 px-4 py-3 rounded text-xs text-zinc-300 space-y-2">
        <p className="font-mono">
          Logged in as: <span className="text-amber-400">{user.name}</span>
        </p>
        <button
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 text-xs font-mono underline"
        >
          Logout
        </button>
      </div>

      {/* Search bar */}
      <div className="absolute top-4 right-4 z-[1000]">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Location Filter Panel */}
      <LocationFilter onLocationSelect={handleLocationSelect} />

      <div className="h-screen w-full">
        <BlackoutMap searchLocation={selectedLocation} onClearSearchLocation={handleClearSearchLocation} selectedTradeId={selectedTradeId} />
      </div>
    </main>
  );
}
