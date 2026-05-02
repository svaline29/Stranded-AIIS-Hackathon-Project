"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { NavigationControl, type Map, type StyleSpecification } from "maplibre-gl";
import { DamageOverlay } from "./DamageOverlay";
import { DemographicOverlay } from "./DemographicOverlay";
import { RegistrantPins } from "./RegistrantPins";
import type { DamageFeatureCollection, Registrant } from "./types";

const ASHEVILLE_CENTER: [number, number] = [-82.55, 35.59];
const CARTODB_DARK_MATTER_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    cartoDarkRaster: {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "cartoDarkRaster",
    },
  ],
};

async function loadBaseStyle(): Promise<string | StyleSpecification> {
  try {
    const response = await fetch(CARTODB_DARK_MATTER_STYLE_URL, { method: "HEAD" });

    if (response.ok) {
      return CARTODB_DARK_MATTER_STYLE_URL;
    }
  } catch {
    // The OSM style below keeps the demo usable if the hosted style is unavailable.
  }

  return OSM_FALLBACK_STYLE;
}

type DisasterMapProps = {
  damage: DamageFeatureCollection;
  registrants: Registrant[];
  selectedRegistrantId: string | null;
  onSelectRegistrant: (registrantId: string) => void;
};

export default function DisasterMap({
  damage,
  registrants,
  selectedRegistrantId,
  onSelectRegistrant,
}: DisasterMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const mapLoadedRef = useRef(false);
  const [map, setMap] = useState<Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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
      mapRef.current = nextMap;

      nextMap.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      nextMap.on("error", () => {
        if (!cancelled && !mapLoadedRef.current) {
          setMapError("Unable to load the map style");
        }
      });
      nextMap.once("load", () => {
        if (!cancelled) {
          mapLoadedRef.current = true;
          setMapError(null);
          setMap(nextMap);
        }
      });
    }

    void initializeMap();

    return () => {
      cancelled = true;
      mapLoadedRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (map === null || selectedRegistrantId === null) {
      return;
    }

    const selectedRegistrant = registrants.find(
      (registrant) => registrant.id === selectedRegistrantId,
    );

    if (selectedRegistrant === undefined) {
      return;
    }

    map.flyTo({
      center: [selectedRegistrant.lon, selectedRegistrant.lat],
      zoom: Math.max(map.getZoom(), 13.5),
      essential: true,
    });
  }, [map, registrants, selectedRegistrantId]);

  const showOverlays = map !== null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-base)]">
      <div ref={containerRef} className="h-full w-full" aria-label="Asheville disaster map" />

      {map === null && mapError === null ? (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 font-mono text-xs text-[var(--text-primary)]">
          Loading map...
        </div>
      ) : null}

      {map === null && mapError !== null ? (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-[4px] border border-red-500/70 bg-[var(--bg-elevated)] p-3 font-mono text-xs text-red-300">
          {mapError}
        </div>
      ) : null}

      {showOverlays ? (
        <>
          <DemographicOverlay map={map} />
          <DamageOverlay map={map} damage={damage} />
          <RegistrantPins
            map={map}
            registrants={registrants}
            selectedRegistrantId={selectedRegistrantId}
            onSelectRegistrant={onSelectRegistrant}
          />
        </>
      ) : null}
    </div>
  );
}
