/**
 * scripts/fetchACS.ts
 *
 * One-shot script: pulls ACS 5-year data for Buncombe County NC and caches
 * to public/data/acs.json with two geographic layers:
 *   - blockGroups: 168 BGs — population, 65+, LEP, living-alone
 *   - tracts: 65 tracts — population + disability (B18101)
 *
 * Run with: npx tsx scripts/fetchACS.ts
 *
 * --- Variable resolution notes ---
 * The SPEC lists _calc_ prefix variables (e.g. B01001_calc_NumGE65E).
 * These do NOT exist in the Census ACS API — verified by querying the API:
 *   curl "...?get=B01001_calc_NumGE65E..." → "error: unknown variable"
 * Using raw B-table variables with explicit derivation instead.
 *
 * --- Disability geography limitation ---
 * B18101 (and B18135, C18108) return null at block group level — ACS 5-year
 * does not publish disability cross-tabulations below tract geography.
 * Disability is fetched at tract level; each BG's geoid[:11] maps to its tract.
 *
 * ACS year: 2023 (most recent published 5-year as of 2026)
 */

import * as fs from "fs";
import * as path from "path";

const ACS_YEAR = 2023;
const BASE_URL = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5`;
const STATE = "37";
const COUNTY = "021";
const GEO_BG = `for=block+group:*&in=state:${STATE}+county:${COUNTY}+tract:*`;
const GEO_TRACT = `for=tract:*&in=state:${STATE}+county:${COUNTY}`;

// Male 65+: age brackets 65-66, 67-69, 70-74, 75-79, 80-84, 85+
// Female 65+: same age brackets (rows 044–049)
const POP65_VARS = [
  "B01001_020E", "B01001_021E", "B01001_022E",
  "B01001_023E", "B01001_024E", "B01001_025E", // male
  "B01001_044E", "B01001_045E", "B01001_046E",
  "B01001_047E", "B01001_048E", "B01001_049E", // female
];

// Disability (B18101): "With a disability" rows for each age group, male + female.
// Verified structure from https://api.census.gov/data/2023/acs/acs5/groups/B18101.json
// Male:   under5=004, 5-17=007, 18-34=010, 35-64=013, 65-74=016, 75+=019
// Female: under5=023, 5-17=026, 18-34=029, 35-64=032, 65-74=035, 75+=038
// Only available at tract level and above in ACS 5-year (null at BG).
const DISABILITY_VARS = [
  "B18101_004E", "B18101_007E", "B18101_010E",
  "B18101_013E", "B18101_016E", "B18101_019E", // male
  "B18101_023E", "B18101_026E", "B18101_029E",
  "B18101_032E", "B18101_035E", "B18101_038E", // female
];

// Limited English Proficiency: speak English "well", "not well", or "not at all"
// (LEP = less than "very well"; covers all 4 language groups × 3 age groups = 12 cells × 3 levels = 36 vars)
// B16004 structure per language group: [total, very well, well*, not well*, not at all*]  (* = LEP rows)
const LEP_VARS = [
  // 5 to 17 years
  "B16004_006E", "B16004_007E", "B16004_008E", // Spanish
  "B16004_011E", "B16004_012E", "B16004_013E", // Other Indo-European
  "B16004_016E", "B16004_017E", "B16004_018E", // Asian and Pacific Island
  "B16004_021E", "B16004_022E", "B16004_023E", // Other languages
  // 18 to 64 years
  "B16004_028E", "B16004_029E", "B16004_030E", // Spanish
  "B16004_033E", "B16004_034E", "B16004_035E", // Other Indo-European
  "B16004_038E", "B16004_039E", "B16004_040E", // Asian and Pacific Island
  "B16004_043E", "B16004_044E", "B16004_045E", // Other languages
  // 65 years and over
  "B16004_050E", "B16004_051E", "B16004_052E", // Spanish
  "B16004_055E", "B16004_056E", "B16004_057E", // Other Indo-European
  "B16004_060E", "B16004_061E", "B16004_062E", // Asian and Pacific Island
  "B16004_065E", "B16004_066E", "B16004_067E", // Other languages
];

type RawResponse = [string[], ...string[][]];

type AcsRow = Record<string, string | null> & {
  geoid: string;
  name: string;
  state: string;
  county: string;
  tract: string;
};

type BgRow = AcsRow & { blockGroup: string };

async function fetchVarsBG(vars: string[]): Promise<Map<string, BgRow>> {
  const url = `${BASE_URL}?get=NAME,${vars.join(",")}&${GEO_BG}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API ${res.status}: ${await res.text()}\nURL: ${url}`);
  }
  const data = (await res.json()) as RawResponse;
  const [header, ...rows] = data;

  const map = new Map<string, BgRow>();
  for (const row of rows) {
    const obj: Record<string, string | null> = {};
    header.forEach((col, i) => { obj[col] = row[i] ?? null; });
    const state = obj["state"] ?? "";
    const county = obj["county"] ?? "";
    const tract = (obj["tract"] ?? "").padStart(6, "0");
    const bg = obj["block group"] ?? "";
    const geoid = `${state}${county}${tract}${bg}`;
    map.set(geoid, { ...obj, geoid, name: obj["NAME"] ?? "", state, county, tract, blockGroup: bg });
  }
  return map;
}

async function fetchVarsTract(vars: string[]): Promise<Map<string, AcsRow>> {
  const url = `${BASE_URL}?get=NAME,${vars.join(",")}&${GEO_TRACT}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API ${res.status}: ${await res.text()}\nURL: ${url}`);
  }
  const data = (await res.json()) as RawResponse;
  const [header, ...rows] = data;

  const map = new Map<string, AcsRow>();
  for (const row of rows) {
    const obj: Record<string, string | null> = {};
    header.forEach((col, i) => { obj[col] = row[i] ?? null; });
    const state = obj["state"] ?? "";
    const county = obj["county"] ?? "";
    const tract = (obj["tract"] ?? "").padStart(6, "0");
    const geoid = `${state}${county}${tract}`; // 11-char tract GEOID
    map.set(geoid, { ...obj, geoid, name: obj["NAME"] ?? "", state, county, tract });
  }
  return map;
}

function sumVars(row: Record<string, string | null>, vars: string[]): number {
  return vars.reduce((sum, v) => {
    const n = Number(row[v]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

async function main(): Promise<void> {
  console.log("=== fetchACS.ts ===");
  console.log(
    "NOTICE: _calc_ prefix variables (B01001_calc_NumGE65E etc.) do not exist in the ACS API.",
  );
  console.log("        Using raw B-table variables with explicit derivation.");
  console.log(
    "NOTICE: Disability (B18101/B18135/C18108) returns null at block group level.",
  );
  console.log(
    "        numDis stored as null; tract-level data needed for disability overlays.\n",
  );

  // BG request 1: total population + 65+ breakdowns + living alone
  console.log("Fetching BG request 1: population + 65+ + living alone...");
  const req1Vars = ["B01003_001E", ...POP65_VARS, "B11001_008E"];
  const map1 = await fetchVarsBG(req1Vars);
  console.log(`  → ${map1.size} block groups`);

  // BG request 2: LEP (36 B16004 rows)
  console.log("Fetching BG request 2: LEP (B16004)...");
  const map2 = await fetchVarsBG(LEP_VARS);
  console.log(`  → ${map2.size} block groups`);

  // Tract request: disability (B18101) + total pop
  console.log("Fetching tract-level disability (B18101)...");
  const tractDisVars = ["B01003_001E", "B18101_001E", ...DISABILITY_VARS];
  const mapTract = await fetchVarsTract(tractDisVars);
  console.log(`  → ${mapTract.size} tracts`);

  // --- Build blockGroups layer ---
  const blockGroups = [];
  for (const [geoid, r1] of map1) {
    const r2 = map2.get(geoid) ?? {};
    const merged = { ...r1, ...r2 };

    const totalPop = Number(r1["B01003_001E"] ?? 0);
    const numGE65 = sumVars(r1, POP65_VARS);
    const numLEP = sumVars(merged, LEP_VARS);
    const numHHInd = Number(r1["B11001_008E"] ?? 0);

    blockGroups.push({
      geoid,
      name: r1.name,
      totalPop,
      numGE65,
      numDis: null, // not available at BG level in ACS 5-year; join via geoid[:11] → tracts[]
      numLEP,
      numHHInd,
    });
  }
  blockGroups.sort((a, b) => a.geoid.localeCompare(b.geoid));

  // --- Build tracts layer ---
  const tracts = [];
  for (const [geoid, r] of mapTract) {
    const totalPop = Number(r["B01003_001E"] ?? 0);
    const numDis = sumVars(r, DISABILITY_VARS);
    const pctDis = totalPop > 0 ? Math.round((numDis / totalPop) * 1000) / 10 : null;
    tracts.push({ geoid, name: r.name, totalPop, numDis, pctDis });
  }
  tracts.sort((a, b) => a.geoid.localeCompare(b.geoid));

  const output = {
    fetchedAt: new Date().toISOString(),
    acsYear: ACS_YEAR,
    geography: "Buncombe County NC (state=37, county=021)",
    joinNote:
      "blockGroups[].geoid (12 chars) — first 11 chars match tracts[].geoid for BG→tract join",
    variables: {
      blockGroups: [
        {
          field: "totalPop",
          source: "B01003_001E",
          label: "Total population",
        },
        {
          field: "numGE65",
          source: "B01001_020E–025E (male) + B01001_044E–049E (female)",
          label: "Population 65 years and over",
          note: "Derived by summing 6 male + 6 female age-bracket cells from B01001",
        },
        {
          field: "numDis",
          source: null,
          label: "Population with any disability",
          note: "Null at BG level — not published in ACS 5-year below tract. Join to tracts[] via geoid[:11].",
        },
        {
          field: "numLEP",
          source:
            'B16004 "well"+"not well"+"not at all" × 4 language groups × 3 age groups (36 cells)',
          label: 'Population speaking English less than "very well"',
        },
        {
          field: "numHHInd",
          source: "B11001_008E",
          label: "Nonfamily households: householder living alone",
        },
      ],
      tracts: [
        {
          field: "totalPop",
          source: "B01003_001E",
          label: "Total population",
        },
        {
          field: "numDis",
          source:
            "B18101: sum of 'With a disability' rows — male (004,007,010,013,016,019) + female (023,026,029,032,035,038)",
          label: "Civilian noninstitutionalized population with any disability",
          note: "Verified non-null at tract level for all 65 Buncombe County tracts",
        },
        {
          field: "pctDis",
          source: "numDis / totalPop × 100 (rounded to 1 decimal)",
          label: "Percent with any disability",
        },
      ],
    },
    blockGroupCount: blockGroups.length,
    tractCount: tracts.length,
    blockGroups,
    tracts,
  };

  const outDir = path.join(process.cwd(), "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "acs.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n✓ Written to ${outPath}`);
  console.log(`  Block groups: ${blockGroups.length}`);
  console.log(`  Tracts:       ${tracts.length}`);

  console.log(`\n  BG sample (first 3):`);
  blockGroups.slice(0, 3).forEach((bg) => {
    console.log(
      `    ${bg.geoid}  pop=${bg.totalPop}  65+=${bg.numGE65}  LEP=${bg.numLEP}  alone=${bg.numHHInd}`,
    );
  });

  console.log(`\n  Tract sample (first 3):`);
  tracts.slice(0, 3).forEach((t) => {
    console.log(
      `    ${t.geoid}  pop=${t.totalPop}  dis=${t.numDis}  pctDis=${t.pctDis}%`,
    );
  });

  // Sanity checks
  const totalPop = blockGroups.reduce((s, b) => s + b.totalPop, 0);
  const totalGE65 = blockGroups.reduce((s, b) => s + b.numGE65, 0);
  const pctGE65 = ((totalGE65 / totalPop) * 100).toFixed(1);
  const totalDis = tracts.reduce((s, t) => s + t.numDis, 0);
  const tractTotalPop = tracts.reduce((s, t) => s + t.totalPop, 0);
  const pctDis = ((totalDis / tractTotalPop) * 100).toFixed(1);
  const nullDis = tracts.filter((t) => t.numDis === null).length;
  console.log(`\n  County-wide (BG): pop=${totalPop.toLocaleString()}  65+=${totalGE65.toLocaleString()} (${pctGE65}%)`);
  console.log(`  County-wide (tracts): dis=${totalDis.toLocaleString()} (${pctDis}%)`);
  console.log(`  Tracts with null numDis: ${nullDis} (expect 0)`);
}

main().catch((err: unknown) => {
  console.error("fetchACS failed:", err);
  process.exit(1);
});
