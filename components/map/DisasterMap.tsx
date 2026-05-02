"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { NavigationControl, type Map, type StyleSpecification } from "maplibre-gl";
import { DamageOverlay } from "./DamageOverlay";
import { DemographicOverlay } from "./DemographicOverlay";
import { RegistrantPins } from "./RegistrantPins";
import type { DamageFeatureCollection, Registrant } from "./types";

const ASHEVILLE_CENTER: [number, number] = [-82.55, 35.59];
const PROTOMAPS_LIGHT_STYLE_URL = "https://api.protomaps.com/styles/v5/light/en.json";

const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; damage: DamageFeatureCollection; registrants: Registrant[] }
  | { status: "error"; message: string };

async function loadBaseStyle(): Promise<string | StyleSpecification> {
  try {
    const response = await fetch(PROTOMAPS_LIGHT_STYLE_URL, { method: "HEAD" });

    if (response.ok) {
      return PROTOMAPS_LIGHT_STYLE_URL;
    }
  } catch {
    // The OSM style below keeps the demo usable if the hosted style is unavailable.
  }

  return OSM_FALLBACK_STYLE;
}

async function loadMapData(): Promise<Extract<LoadState, { status: "ready" }>> {
  const [damageResponse, registrantsResponse] = await Promise.all([
    fetch("/api/damage"),
    fetch("/api/registrants"),
  ]);

  if (!damageResponse.ok || !registrantsResponse.ok) {
    throw new Error("Unable to load map data from the local API");
  }

  return {
    status: "ready",
    damage: (await damageResponse.json()) as DamageFeatureCollection,
    registrants: (await registrantsResponse.json()) as Registrant[],
  };
}

export default function DisasterMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (containerRef.current === null || mapRef.current !== null) {
        return;
      }

      const style = await loadBaseStyle();

      if (cancelled || containerRef.current === null) {
        return;
      }

      const nextMap = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: ASHEVILLE_CENTER,
        zoom: 11,
      });

      nextMap.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      nextMap.once("load", () => {
        if (!cancelled) {
          mapRef.current = nextMap;
          setMap(nextMap);
        }
      });
    }

    void initializeMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const readyState = await loadMapData();

        if (!cancelled) {
          setLoadState(readyState);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: caught instanceof Error ? caught.message : "Unable to load map data",
          });
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const showOverlays = map !== null && loadState.status === "ready";

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-100">
      <div ref={containerRef} className="h-full w-full" aria-label="Asheville disaster map" />

      {loadState.status === "loading" ? (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-xl border border-zinc-200 bg-white/95 p-3 text-sm text-zinc-700 shadow-lg">
          Loading damage polygons and synthetic registrants for demonstration...
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-lg">
          {loadState.message}
        </div>
      ) : null}

      {showOverlays ? (
        <>
          <DemographicOverlay map={map} />
          <DamageOverlay map={map} damage={loadState.damage} />
          <RegistrantPins map={map} registrants={loadState.registrants} />
        </>
      ) : null}
    </div>
  );
}
