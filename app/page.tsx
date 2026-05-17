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
  const [selectedTradeId, setSelectedTradeId] = React.useState<number | null>(
    null,
  );
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

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
    setShowLogoutModal(false);
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
    <main className="h-dvh w-screen bg-zinc-950 text-white">
      {/* Header with user info and logout */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-zinc-950/90 backdrop-blur border-2 border-zinc-800 px-4 py-3 rounded-xl text-xs text-zinc-300 space-y-2">
        <div className="flex flex-row gap-3 font-bold">
          <p className="font-mono">
            Logged in as: <span className="text-amber-400">{user.name}</span>
          </p>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="text-red-400 hover:text-red-300 text-xs font-mono underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Location Filter Panel */}
      <LocationFilter onLocationSelect={handleLocationSelect} />

      <div className="h-screen w-full">
        <BlackoutMap
          searchLocation={selectedLocation}
          onClearSearchLocation={handleClearSearchLocation}
          selectedTradeId={selectedTradeId}
        />
      </div>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold tracking-wider text-red-500 uppercase mb-2">
              Confirm Logout
            </h2>
            <p className="text-sm text-zinc-400 mb-6 font-mono">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-xs font-bold uppercase tracking-wider transition-all"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
