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
      <div className="h-screen w-full">
        <BlackoutMap />
      </div>
    </main>
  );
}
