"use client";

import dynamic from "next/dynamic";

const BlackoutMap = dynamic(() => import("@/components/BlackoutMap"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-10 text-white font-mono">
      Loading London Grid Data...
    </p>
  ),
});

export default function Map() {
  return (
    <main className="h-screen w-screen bg-zinc-950 text-white">
      <div className="p-4 bg-zinc-900 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-wider text-red-500">
          SYSTEM STATUS: BLACKOUT OVERLAY
        </h1>{" "}
        [cite: 2]
      </div>
      <div className="h-[calc(100vh-61px)] w-full">
        <BlackoutMap />
      </div>
    </main>
  );
}
