import { count, isNull } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { damagePolygons, disasterState, registrants } from "../lib/db/schema";

const EXPECTED_REGISTRANT_COUNT = 15;

async function tableCount(
  table: typeof disasterState | typeof damagePolygons | typeof registrants,
): Promise<number> {
  return (await getDb().select({ value: count() }).from(table).get())?.value ?? 0;
}

async function main(): Promise<void> {
  const registrantsMissingBlockGroup = await getDb()
    .select({
      id: registrants.id,
      fullName: registrants.fullName,
      address: registrants.address,
    })
    .from(registrants)
    .where(isNull(registrants.blockGroup))
    .all();

  const disasterStateCount = await tableCount(disasterState);
  const damagePolygonCount = await tableCount(damagePolygons);
  const registrantCount = await tableCount(registrants);

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
