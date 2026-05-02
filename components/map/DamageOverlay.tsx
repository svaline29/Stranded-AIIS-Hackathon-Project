"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { removeLayerIfPresent, removeSourceIfPresent } from "./mapStyleUtils";
import type { DamageFeatureCollection } from "./types";

const DAMAGE_SOURCE_ID = "damage-polygons";
const DAMAGE_FILL_LAYER_ID = "damage-fill";
const DAMAGE_STROKE_LAYER_ID = "damage-stroke";

const severityFillColorExpression = [
  "match",
  ["get", "severity"],
  "destroyed",
  "#ef4444",
  "major",
  "#f97316",
  "minor",
  "#eab308",
  "#6b7280",
] as const;

const severityStrokeColorExpression = [
  "match",
  ["get", "severity"],
  "destroyed",
  "#ef4444",
  "major",
  "#f97316",
  "minor",
  "#eab308",
  "#404040",
] as const;

const severityOpacityExpression = [
  "match",
  ["get", "severity"],
  "destroyed",
  0.35,
  "major",
  0.25,
  "minor",
  0.2,
  0.18,
] as const;

type DamageOverlayProps = {
  map: MapLibreMap;
  damage: DamageFeatureCollection;
};

export const DAMAGE_FILL_BEFORE_ID = DAMAGE_FILL_LAYER_ID;

export function DamageOverlay({ map, damage }: DamageOverlayProps) {
  useEffect(() => {
    removeDamageLayers(map);

    map.addSource(DAMAGE_SOURCE_ID, {
      type: "geojson",
      data: damage,
    });

    map.addLayer({
      id: DAMAGE_FILL_LAYER_ID,
      type: "fill",
      source: DAMAGE_SOURCE_ID,
      paint: {
        "fill-color": severityFillColorExpression,
        "fill-opacity": severityOpacityExpression,
      },
    });

    map.addLayer({
      id: DAMAGE_STROKE_LAYER_ID,
      type: "line",
      source: DAMAGE_SOURCE_ID,
      paint: {
        "line-color": severityStrokeColorExpression,
        "line-width": 2,
      },
    });

    return () => removeDamageLayers(map);
  }, [damage, map]);

  return null;
}

function removeDamageLayers(map: MapLibreMap) {
  removeLayerIfPresent(map, DAMAGE_STROKE_LAYER_ID);
  removeLayerIfPresent(map, DAMAGE_FILL_LAYER_ID);
  removeSourceIfPresent(map, DAMAGE_SOURCE_ID);
}
