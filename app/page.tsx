export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-red-500 uppercase">
          Project Blackout Init
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto text-sm">
          Physical infrastructure green. Digital records offline. London Grid
          node active.
        </p>
        <div className="inline-flex gap-3 pt-4">
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-emerald-400">
            Next.js App Router: Online
          </span>
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-emerald-400">
            Tailwind CSS: Active
          </span>
        </div>
      </div>
    </main>
  );
}
