import { seedDisasterState } from "./disasterState";

function main(): void {
  console.log("Running seed...");
  seedDisasterState();
  console.log("Seed complete.");
  process.exit(0);
}

main();
