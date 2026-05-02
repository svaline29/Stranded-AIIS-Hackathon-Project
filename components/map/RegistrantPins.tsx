"use client";

import { useEffect, useMemo } from "react";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { removeLayerIfPresent, removeSourceIfPresent } from "./mapStyleUtils";
import type { Registrant, RegistrantFeatureCollection } from "./types";

const REGISTRANT_SOURCE_ID = "registrant-pins";
const REGISTRANT_GLOW_LAYER_ID = "registrant-glow";
const REGISTRANT_LAYER_ID = "registrant-circles";

const statusColorExpression = [
  "match",
  ["get", "contactStatus"],
  "unknown",
  "#404040",
  "safe",
  "#22c55e",
  "needs_help",
  "#ef4444",
  "no_response",
  "#f97316",
  "confused",
  "#eab308",
  "#404040",
] as const;

type RegistrantPinsProps = {
  map: MapLibreMap;
  registrants: Registrant[];
  selectedRegistrantId: string | null;
  onSelectRegistrant: (registrantId: string) => void;
};

export function RegistrantPins({
  map,
  registrants,
  selectedRegistrantId,
  onSelectRegistrant,
}: RegistrantPinsProps) {
  const featureCollection = useMemo<RegistrantFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: registrants.map((registrant) => ({
        type: "Feature",
        id: registrant.id,
        properties: {
          id: registrant.id,
          contactStatus: registrant.contactStatus,
          selected: registrant.id === selectedRegistrantId,
        },
        geometry: {
          type: "Point",
          coordinates: [registrant.lon, registrant.lat],
        },
      })),
    }),
    [registrants, selectedRegistrantId],
  );

  useEffect(() => {
    removeRegistrantLayer(map);

    map.addSource(REGISTRANT_SOURCE_ID, {
      type: "geojson",
      data: featureCollection,
    });

    map.addLayer({
      id: REGISTRANT_GLOW_LAYER_ID,
      type: "circle",
      source: REGISTRANT_SOURCE_ID,
      paint: {
        "circle-color": statusColorExpression,
        "circle-radius": ["case", ["boolean", ["get", "selected"], false], 18, 0],
        "circle-opacity": ["case", ["boolean", ["get", "selected"], false], 0.45, 0],
        "circle-blur": 0.65,
      },
    });

    map.addLayer({
      id: REGISTRANT_LAYER_ID,
      type: "circle",
      source: REGISTRANT_SOURCE_ID,
      paint: {
        "circle-color": statusColorExpression,
        "circle-radius": [
          "case",
          ["boolean", ["get", "selected"], false],
          10,
          8,
        ],
        "circle-stroke-color": "#080808",
        "circle-stroke-width": 2,
      },
    });

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;

      if (typeof id === "string") {
        onSelectRegistrant(id);
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
      try {
        map.off("click", REGISTRANT_LAYER_ID, handleClick);
        map.off("mouseenter", REGISTRANT_LAYER_ID, handleMouseEnter);
        map.off("mouseleave", REGISTRANT_LAYER_ID, handleMouseLeave);
      } catch {
        // The map may already be removed during React dev remount cleanup.
      }

      removeRegistrantLayer(map);
    };
  }, [featureCollection, map, onSelectRegistrant]);

  return null;
}

function removeRegistrantLayer(map: MapLibreMap) {
  removeLayerIfPresent(map, REGISTRANT_LAYER_ID);
  removeLayerIfPresent(map, REGISTRANT_GLOW_LAYER_ID);
  removeSourceIfPresent(map, REGISTRANT_SOURCE_ID);
}
