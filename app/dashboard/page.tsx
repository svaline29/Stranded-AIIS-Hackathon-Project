import { DashboardMapLoader } from "./DashboardMapLoader";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <nav className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <div>
          <p className="text-lg font-semibold text-zinc-950">Stranded</p>
          <p className="text-xs text-zinc-500">Synthetic registrants for demonstration</p>
        </div>
        <div className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700">
          Disaster Mode: OFF
        </div>
      </nav>
      <section className="h-[calc(100vh-64px)] w-full">
        <DashboardMapLoader />
      </section>
    </main>
  );
}
