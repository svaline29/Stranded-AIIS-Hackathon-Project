import type { Map as MapLibreMap } from "maplibre-gl";

export function removeLayerIfPresent(map: MapLibreMap, layerId: string) {
  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  } catch {
    // MapLibre can clear its style before React effect cleanups run in dev remounts.
  }
}

export function removeSourceIfPresent(map: MapLibreMap, sourceId: string) {
  try {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } catch {
    // MapLibre can clear its style before React effect cleanups run in dev remounts.
  }
}

export function getLayerBeforeId(map: MapLibreMap, layerId: string): string | undefined {
  try {
    return map.getLayer(layerId) ? layerId : undefined;
  } catch {
    return undefined;
  }
}
