# Stranded

> AI-powered disaster response triage for vulnerable populations.

## Current State

Built and working now:

- `/dashboard` renders a responder dashboard with a MapLibre map centered on Asheville.
- The map shows registrant pins, hand-traced damage polygons, and a toggleable demographic overlay for age 65+, disability, limited English proficiency, and composite vulnerability.
- The dashboard includes a ranked priority list, a stats bar, a selected-registrant details panel, and deterministic dispatch briefing text.
- Local API routes read registrants and damage polygons from SQLite and the dashboard computes risk scores in the browser.

Data that exists:

- 15 synthetic registrants in Buncombe County, seeded into SQLite.
- 10 hand-traced damage polygons in `notes/damagePolygons.geojson`.
- ACS 5-year data and Census block group geometries cached in `public/data/`.

Not built yet:

- Multi-agent LLM reasoning.
- Vision LLM damage detection.
- Voice registration.
- Welfare check loop.

## What It Does (Planned)

- Pre-disaster: vulnerable individuals or caregivers register their dependencies (oxygen, mobility, dialysis, language, etc.).
- During disaster: AI analyzes damage from satellite/aerial imagery, scores each registrant by combined damage × dependency × time-since-contact, and produces natural-language dispatch briefings for responders.
- Stretch: AI voice agents proactively call registrants to confirm safety and escalate non-responders.

## Tech Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · MapLibre GL JS · SQLite + better-sqlite3 · Drizzle · Turf · Anthropic SDK

## Data Sources

- US Census American Community Survey (5-year estimates)
- NOAA Emergency Response Imagery (Hurricane Helene, Sept 2024)
- Maxar Open Data (pre-event baseline)
- OpenStreetMap (via MapLibre + Nominatim)

## Local Development

```bash
pnpm install
cp .env.local.example .env.local
pnpm db:generate && pnpm db:migrate
pnpm tsx lib/seed/seedScript.ts
pnpm dev
```

Open `http://localhost:3000`.

No environment keys are required for the current Layer 1 dashboard. `.env.local.example` includes keys for planned LLM, voice, SMS, and local tunnel work.

## Architecture

`app/` contains the Next.js routes, including `/`, `/register`, `/dashboard`, and local API routes.

`components/` contains dashboard, map, and shared UI components.

`lib/` contains database schema/client code, migrations entrypoint, seed logic, and risk scoring.

`drizzle/` contains generated SQLite migration files.

`public/data/` contains cached ACS data and Census block group GeoJSON used by the demographic overlay.

`notes/` contains source notes and manually traced damage polygons.

`scripts/` contains one-shot data fetch and seed verification scripts.

## Layers (Build Plan)

| Layer | Description | Status |
|-------|-------------|--------|
| 0 | Foundation + data pipeline | ✅ Complete |
| 1 | Static dashboard + map | ✅ Complete |
| 2 | Multi-agent LLM reasoning | 🔲 Planned |
| 3 | Vision LLM damage detection | 🔲 Planned |
| 4 | Accessible registration + voice intake | 🔲 Planned |
| 5 | Welfare check loop | 🔲 Planned |

## Sources & Inspiration

See `notes/sources.md`.

## License

TBD
