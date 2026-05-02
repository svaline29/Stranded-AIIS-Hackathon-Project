import { count, isNull } from "drizzle-orm";
import { db } from "../lib/db/client";
import { damagePolygons, disasterState, registrants } from "../lib/db/schema";

const EXPECTED_REGISTRANT_COUNT = 15;

function tableCount(table: typeof disasterState | typeof damagePolygons | typeof registrants): number {
  return db.select({ value: count() }).from(table).get()?.value ?? 0;
}

function main(): void {
  const registrantsMissingBlockGroup = db
    .select({
      id: registrants.id,
      fullName: registrants.fullName,
      address: registrants.address,
    })
    .from(registrants)
    .where(isNull(registrants.blockGroup))
    .all();

  const disasterStateCount = tableCount(disasterState);
  const damagePolygonCount = tableCount(damagePolygons);
  const registrantCount = tableCount(registrants);

  console.log(`disaster_state: ${disasterStateCount}`);
  console.log(`damage_polygons: ${damagePolygonCount}`);
  console.log(`registrants: ${registrantCount}`);
  console.log(`registrants_missing_block_group: ${registrantsMissingBlockGroup.length}`);

  if (registrantCount !== EXPECTED_REGISTRANT_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_REGISTRANT_COUNT} registrants; found ${registrantCount}`,
    );
  }

  for (const registrant of registrantsMissingBlockGroup) {
    console.log(
      `  - ${registrant.fullName} (${registrant.id}): ${registrant.address}`,
    );
  }

  process.exit(0);
}

main();
