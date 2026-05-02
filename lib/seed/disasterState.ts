import { getDb } from "../db/client";
import { disasterState } from "../db/schema";

const BBOX_GEOJSON = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [-82.62, 35.55],
      [-82.45, 35.55],
      [-82.45, 35.65],
      [-82.62, 35.65],
      [-82.62, 35.55], // closing vertex
    ],
  ],
});

export async function seedDisasterState(): Promise<void> {
  await getDb()
    .insert(disasterState)
    .values({
      id: 1,
      scenarioName: "Hurricane Helene — Asheville/Swannanoa, September 2024",
      bboxGeoJSON: BBOX_GEOJSON,
      active: false,
      activatedAt: null,
    })
    .onConflictDoUpdate({
      target: disasterState.id,
      set: {
        scenarioName: "Hurricane Helene — Asheville/Swannanoa, September 2024",
        bboxGeoJSON: BBOX_GEOJSON,
      },
    });

  console.log("✓ disaster_state seeded (id=1)");
}
