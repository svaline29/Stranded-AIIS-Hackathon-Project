import { seedDisasterState } from "./disasterState";
import { seedDamagePolygons } from "./damagePolygons";
import { seedRegistrants } from "./registrants";

async function main(): Promise<void> {
  console.log("Running seed...");
  await seedDisasterState();
  await seedDamagePolygons();
  await seedRegistrants();
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
