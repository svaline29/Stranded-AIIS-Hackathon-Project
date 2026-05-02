"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { DAMAGE_FILL_BEFORE_ID } from "./DamageOverlay";
import type { BlockGroupFeature, BlockGroupFeatureCollection } from "./types";

const DEMOGRAPHIC_SOURCE_ID = "demographic-block-groups";
const DEMOGRAPHIC_LAYER_ID = "demographic-fill";
const COLOR_SCALE = ["#ffffff", "#ede9fe", "#c4b5fd", "#7c3aed", "#4c1d95"] as const;

type MetricKey = "over65" | "disability" | "lep" | "composite";

type MetricOption = {
  key: MetricKey;
  label: string;
};

type AcsBlockGroup = {
  geoid: string;
  totalPop: number;
  numGE65: number;
  numLEP: number;
};

type AcsTract = {
  geoid: string;
  pctDis: number;
};

type AcsData = {
  blockGroups: AcsBlockGroup[];
  tracts: AcsTract[];
};

type MetricValues = {
  geoid: string;
  over65: number | null;
  disability: number | null;
  lep: number | null;
  composite: number | null;
};

type DemographicOverlayProps = {
  map: MapLibreMap;
};

const METRIC_OPTIONS: MetricOption[] = [
  { key: "over65", label: "% over 65" },
  { key: "disability", label: "% with disability" },
  { key: "lep", label: "% LEP" },
  { key: "composite", label: "Composite vulnerability" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAcsData(value: unknown): AcsData {
  if (!isRecord(value) || !Array.isArray(value.blockGroups) || !Array.isArray(value.tracts)) {
    throw new Error("acs.json is missing blockGroups or tracts");
  }

  return {
    blockGroups: value.blockGroups.flatMap((blockGroup): AcsBlockGroup[] => {
      if (!isRecord(blockGroup)) {
        return [];
      }

      const geoid = typeof blockGroup.geoid === "string" ? blockGroup.geoid : null;
      const totalPop = toNumber(blockGroup.totalPop);
      const numGE65 = toNumber(blockGroup.numGE65);
      const numLEP = toNumber(blockGroup.numLEP);

      if (geoid === null || totalPop === null || numGE65 === null || numLEP === null) {
        return [];
      }

      return [{ geoid, totalPop, numGE65, numLEP }];
    }),
    tracts: value.tracts.flatMap((tract): AcsTract[] => {
      if (!isRecord(tract)) {
        return [];
      }

      const geoid = typeof tract.geoid === "string" ? tract.geoid : null;
      const pctDis = toNumber(tract.pctDis);

      if (geoid === null || pctDis === null) {
        return [];
      }

      return [{ geoid, pctDis }];
    }),
  };
}

function percentileMaps(values: MetricValues[]): Record<"over65" | "disability" | "lep", Map<string, number>> {
  return {
    over65: buildPercentileMap(values, "over65"),
    disability: buildPercentileMap(values, "disability"),
    lep: buildPercentileMap(values, "lep"),
  };
}

function buildPercentileMap(values: MetricValues[], metric: Exclude<MetricKey, "composite">): Map<string, number> {
  const sorted = values
    .filter((value): value is MetricValues & Record<typeof metric, number> => value[metric] !== null)
    .sort((left, right) => left[metric] - right[metric]);

  const denominator = Math.max(sorted.length - 1, 1);
  return new Map(sorted.map((value, index) => [value.geoid, index / denominator]));
}

function colorForPercentile(percentile: number | null): string {
  if (percentile === null) {
    return COLOR_SCALE[0];
  }

  const index = Math.min(COLOR_SCALE.length - 1, Math.max(0, Math.floor(percentile * COLOR_SCALE.length)));
  return COLOR_SCALE[index];
}

function buildMetricValues(acs: AcsData): MetricValues[] {
  const tractByGeoid = new Map(acs.tracts.map((tract) => [tract.geoid, tract]));

  const values = acs.blockGroups.map((blockGroup): MetricValues => {
    const tract = tractByGeoid.get(blockGroup.geoid.slice(0, 11));
    const over65 = blockGroup.totalPop > 0 ? (blockGroup.numGE65 / blockGroup.totalPop) * 100 : null;
    const lep = blockGroup.totalPop > 0 ? (blockGroup.numLEP / blockGroup.totalPop) * 100 : null;

    return {
      geoid: blockGroup.geoid,
      over65,
      disability: tract?.pctDis ?? null,
      lep,
      composite: null,
    };
  });

  const percentiles = percentileMaps(values);

  return values.map((value) => {
    const parts = [
      percentiles.over65.get(value.geoid),
      percentiles.disability.get(value.geoid),
      percentiles.lep.get(value.geoid),
    ].filter((part): part is number => typeof part === "number");

    return {
      ...value,
      composite:
        parts.length > 0 ? parts.reduce((total, part) => total + part, 0) / parts.length : null,
    };
  });
}

function buildOverlayGeoJson(
  blockGroups: BlockGroupFeatureCollection,
  valuesByGeoid: Map<string, MetricValues>,
  metric: MetricKey,
): BlockGroupFeatureCollection {
  const metricValues = [...valuesByGeoid.values()];
  const percentiles =
    metric === "composite"
      ? new Map(metricValues.map((value) => [value.geoid, value.composite ?? 0]))
      : buildPercentileMap(metricValues, metric);

  return {
    type: "FeatureCollection",
    features: blockGroups.features.map((feature): BlockGroupFeature => {
      const geoid = feature.properties?.GEOID ?? feature.properties?.geoid ?? "";
      const metricValue = valuesByGeoid.get(geoid)?.[metric] ?? null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          geoid,
          metricValue,
          fillColor: colorForPercentile(percentiles.get(geoid) ?? null),
        },
      };
    }),
  };
}

export function DemographicOverlay({ map }: DemographicOverlayProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [blockGroups, setBlockGroups] = useState<BlockGroupFeatureCollection | null>(null);
  const [metricValues, setMetricValues] = useState<MetricValues[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDemographics() {
      try {
        const [blockGroupsResponse, acsResponse] = await Promise.all([
          fetch("/data/blockGroups.geojson"),
          fetch("/data/acs.json"),
        ]);

        if (!blockGroupsResponse.ok || !acsResponse.ok) {
          throw new Error("Unable to load demographic overlay data");
        }

        const blockGroupJson = (await blockGroupsResponse.json()) as BlockGroupFeatureCollection;
        const acsJson: unknown = await acsResponse.json();

        if (!cancelled) {
          setBlockGroups(blockGroupJson);
          setMetricValues(buildMetricValues(parseAcsData(acsJson)));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load demographics");
        }
      }
    }

    void loadDemographics();

    return () => {
      cancelled = true;
    };
  }, []);

  const overlayGeoJson = useMemo(() => {
    if (activeMetric === null || blockGroups === null || metricValues === null) {
      return null;
    }

    return buildOverlayGeoJson(
      blockGroups,
      new Map(metricValues.map((value) => [value.geoid, value])),
      activeMetric,
    );
  }, [activeMetric, blockGroups, metricValues]);

  useEffect(() => {
    if (map.getLayer(DEMOGRAPHIC_LAYER_ID)) {
      map.removeLayer(DEMOGRAPHIC_LAYER_ID);
    }
    if (map.getSource(DEMOGRAPHIC_SOURCE_ID)) {
      map.removeSource(DEMOGRAPHIC_SOURCE_ID);
    }

    if (overlayGeoJson === null) {
      return;
    }

    map.addSource(DEMOGRAPHIC_SOURCE_ID, {
      type: "geojson",
      data: overlayGeoJson,
    });

    map.addLayer(
      {
        id: DEMOGRAPHIC_LAYER_ID,
        type: "fill",
        source: DEMOGRAPHIC_SOURCE_ID,
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 0.4,
        },
      },
      map.getLayer(DAMAGE_FILL_BEFORE_ID) ? DAMAGE_FILL_BEFORE_ID : undefined,
    );

    return () => {
      if (map.getLayer(DEMOGRAPHIC_LAYER_ID)) {
        map.removeLayer(DEMOGRAPHIC_LAYER_ID);
      }
      if (map.getSource(DEMOGRAPHIC_SOURCE_ID)) {
        map.removeSource(DEMOGRAPHIC_SOURCE_ID);
      }
    };
  }, [map, overlayGeoJson]);

  return (
    <div className="absolute top-4 left-4 z-10 max-w-sm rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Demographic overlay
      </p>
      <div className="flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activeMetric === option.key
                ? "border-purple-700 bg-purple-700 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
            onClick={() =>
              setActiveMetric((current) => (current === option.key ? null : option.key))
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      {activeMetric === null ? (
        <p className="mt-2 text-xs text-zinc-500">Toggle off: base map only.</p>
      ) : null}
      {error !== null ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
