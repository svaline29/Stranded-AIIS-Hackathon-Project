"use client";

import dynamic from "next/dynamic";
import type { DamageFeatureCollection, Registrant } from "@/components/map/types";

const DisasterMap = dynamic(() => import("@/components/map/DisasterMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#141414] flex items-center justify-center">
      <span className="text-[#888888] font-mono text-sm">Loading map...</span>
    </div>
  ),
});

type DashboardMapLoaderProps = {
  damage: DamageFeatureCollection;
  registrants: Registrant[];
  selectedRegistrantId: string | null;
  onSelectRegistrant: (registrantId: string) => void;
};

export function DashboardMapLoader(props: DashboardMapLoaderProps) {
  return <DisasterMap {...props} />;
}
