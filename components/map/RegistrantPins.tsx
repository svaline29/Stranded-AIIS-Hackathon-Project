"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { Badge } from "@/components/ui/badge";
import type { Registrant, RegistrantFeatureCollection } from "./types";

const REGISTRANT_SOURCE_ID = "registrant-pins";
const REGISTRANT_LAYER_ID = "registrant-circles";

const statusColorExpression = [
  "match",
  ["get", "contactStatus"],
  "unknown",
  "#6b7280",
  "safe",
  "#22c55e",
  "needs_help",
  "#ef4444",
  "no_response",
  "#f97316",
  "confused",
  "#eab308",
  "#6b7280",
] as const;

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type RegistrantPinsProps = {
  map: MapLibreMap;
  registrants: Registrant[];
};

export function RegistrantPins({ map, registrants }: RegistrantPinsProps) {
  const [selectedRegistrant, setSelectedRegistrant] = useState<Registrant | null>(null);

  const registrantById = useMemo(
    () => new Map<string, Registrant>(registrants.map((registrant) => [registrant.id, registrant])),
    [registrants],
  );

  const featureCollection = useMemo<RegistrantFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: registrants.map((registrant) => ({
        type: "Feature",
        id: registrant.id,
        properties: {
          id: registrant.id,
          contactStatus: registrant.contactStatus,
        },
        geometry: {
          type: "Point",
          coordinates: [registrant.lon, registrant.lat],
        },
      })),
    }),
    [registrants],
  );

  useEffect(() => {
    if (map.getLayer(REGISTRANT_LAYER_ID)) {
      map.removeLayer(REGISTRANT_LAYER_ID);
    }
    if (map.getSource(REGISTRANT_SOURCE_ID)) {
      map.removeSource(REGISTRANT_SOURCE_ID);
    }

    map.addSource(REGISTRANT_SOURCE_ID, {
      type: "geojson",
      data: featureCollection,
    });

    map.addLayer({
      id: REGISTRANT_LAYER_ID,
      type: "circle",
      source: REGISTRANT_SOURCE_ID,
      paint: {
        "circle-color": statusColorExpression,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          5,
          14,
          9,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;

      if (typeof id === "string") {
        setSelectedRegistrant(registrantById.get(id) ?? null);
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", REGISTRANT_LAYER_ID, handleClick);
    map.on("mouseenter", REGISTRANT_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", REGISTRANT_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", REGISTRANT_LAYER_ID, handleClick);
      map.off("mouseenter", REGISTRANT_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", REGISTRANT_LAYER_ID, handleMouseLeave);

      if (map.getLayer(REGISTRANT_LAYER_ID)) {
        map.removeLayer(REGISTRANT_LAYER_ID);
      }
      if (map.getSource(REGISTRANT_SOURCE_ID)) {
        map.removeSource(REGISTRANT_SOURCE_ID);
      }
    };
  }, [featureCollection, map, registrantById]);

  if (selectedRegistrant === null) {
    return null;
  }

  return (
    <aside className="absolute top-0 right-0 z-20 h-full w-80 overflow-y-auto border-l border-zinc-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Synthetic registrant for demonstration
          </p>
          <h2 className="text-xl font-semibold text-zinc-950">{selectedRegistrant.fullName}</h2>
          <p className="text-sm text-zinc-600">Age {selectedRegistrant.age ?? "unknown"}</p>
        </div>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          onClick={() => setSelectedRegistrant(null)}
          aria-label="Close registrant details"
        >
          Close
        </button>
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">Address</dt>
          <dd className="mt-1 text-zinc-950">{selectedRegistrant.address}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Dependencies</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {selectedRegistrant.dependencies.map((dependency) => (
              <Badge key={dependency} variant="secondary">
                {formatLabel(dependency)}
              </Badge>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Contact status</dt>
          <dd className="mt-2">
            <Badge variant="outline">{formatLabel(selectedRegistrant.contactStatus)}</Badge>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Primary language</dt>
          <dd className="mt-1 text-zinc-950">{selectedRegistrant.primaryLanguage}</dd>
        </div>
        {selectedRegistrant.caregiverPhone !== null ? (
          <div>
            <dt className="font-medium text-zinc-500">Caregiver phone</dt>
            <dd className="mt-1 text-zinc-950">{selectedRegistrant.caregiverPhone}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
