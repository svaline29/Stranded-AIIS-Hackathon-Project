# Stranded

> AI-powered disaster response triage for vulnerable populations.

When disasters strike, standard response systems assume people can self-evacuate, call 911, hike out, or be reported by neighbors. Disabled, elderly, and isolated residents are systematically missed. Stranded helps responders find and prioritize them in real time.

**Status:** In development (hackathon build).

## What it does (planned)

- Pre-disaster: vulnerable individuals or caregivers register their dependencies (oxygen, mobility, dialysis, language, etc.)
- During disaster: AI analyzes damage from satellite/aerial imagery, scores each registrant by combined damage × dependency × time-since-contact, and produces natural-language dispatch briefings for responders
- Stretch: AI voice agents proactively call registrants to confirm safety and escalate non-responders

## Tech stack

Next.js 14 (App Router, TypeScript) · Tailwind · shadcn/ui · MapLibre GL JS · SQLite + Drizzle · Anthropic Claude (Sonnet 4.5) · Vapi (voice) · US Census ACS

## Data sources

- US Census American Community Survey (5-year estimates)
- NOAA Emergency Response Imagery (Hurricane Helene, Sept 2024)
- Maxar Open Data (pre-event baseline)
- OpenStreetMap (via MapLibre + Nominatim)

## Local development

Coming soon — see SPEC.md for the build plan.

## License

TBD

## Sources & inspiration

See `notes/sources.md`.