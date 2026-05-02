"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
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
  "#991b1b",
  "major",
  "#c2410c",
  "minor",
  "#a16207",
  "#374151",
] as const;

const severityOpacityExpression = [
  "match",
  ["get", "severity"],
  "destroyed",
  0.5,
  "major",
  0.4,
  "minor",
  0.3,
  0.3,
] as const;

type DamageOverlayProps = {
  map: MapLibreMap;
  damage: DamageFeatureCollection;
};

export const DAMAGE_FILL_BEFORE_ID = DAMAGE_FILL_LAYER_ID;

export function DamageOverlay({ map, damage }: DamageOverlayProps) {
  useEffect(() => {
    if (map.getLayer(DAMAGE_STROKE_LAYER_ID)) {
      map.removeLayer(DAMAGE_STROKE_LAYER_ID);
    }
    if (map.getLayer(DAMAGE_FILL_LAYER_ID)) {
      map.removeLayer(DAMAGE_FILL_LAYER_ID);
    }
    if (map.getSource(DAMAGE_SOURCE_ID)) {
      map.removeSource(DAMAGE_SOURCE_ID);
    }

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

    return () => {
      if (map.getLayer(DAMAGE_STROKE_LAYER_ID)) {
        map.removeLayer(DAMAGE_STROKE_LAYER_ID);
      }
      if (map.getLayer(DAMAGE_FILL_LAYER_ID)) {
        map.removeLayer(DAMAGE_FILL_LAYER_ID);
      }
      if (map.getSource(DAMAGE_SOURCE_ID)) {
        map.removeSource(DAMAGE_SOURCE_ID);
      }
    };
  }, [damage, map]);

  return null;
}
