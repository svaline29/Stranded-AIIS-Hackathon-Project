import { seedDisasterState } from "./disasterState";
import { seedDamagePolygons } from "./damagePolygons";
import { seedRegistrants } from "./registrants";

function main(): void {
  console.log("Running seed...");
  seedDisasterState();
  seedDamagePolygons();
  seedRegistrants();
  console.log("Seed complete.");
  process.exit(0);
}

main();
