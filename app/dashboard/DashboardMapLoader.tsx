"use client";

import dynamic from "next/dynamic";

const DisasterMap = dynamic(() => import("@/components/map/DisasterMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
      Loading map...
    </div>
  ),
});

export function DashboardMapLoader() {
  return <DisasterMap />;
}
