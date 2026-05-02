# Stranded
 
**AI-powered disaster triage for vulnerable populations.**

<img width="1335" height="740" alt="Dashboard Screenshot" src="https://github.com/user-attachments/assets/c2708cfd-954a-4a89-9fce-0c42c9f4f61f" />


In a major disaster, the people most likely to die are the ones standard response can't reach — oxygen-dependent residents whose power is out, dialysis patients who can't evacuate, people who don't speak English. Stranded gives any FEMA-trained responder a real-time ranked list of who needs help first, with AI-generated dispatch briefings that tell them exactly what to bring and what to expect at the door.
 
Built at the AIIS Hackathon, @ University of Minnesota - Twin Cities · May 1-2 2026
 
LIVE HOSTED DEMO: 

[https://stranded-aiis-hackathon-project.vercel.app]
 
---
 
## The Problem
 
Standard disaster response assumes people can self-evacuate, call 911, or be reported by neighbors. For people with disabilities, life-sustaining equipment dependencies, or limited English proficiency, every one of those assumptions fails.
 
After Hurricane Helene struck western North Carolina in September 2024, Annie Harris — a resident of an Asheville retirement complex — was still without clean water two weeks later. She couldn't carry water buckets herself. Nobody came.
 
According to the US Census Bureau, 15.9% of people in the Helene disaster counties had a disability — higher than the statewide average. During Hurricane Florence (NC, 2018), two of every three deaths were adults over 60.
 
The gap isn't resources. It's information. Responders don't know who needs help, where they are, or what they need. Stranded closes that gap.
 
*Sources: WUNC/BPR (Oct 13 2024), US Census Bureau (Oct 11 2024). See notes/sources.md.*
 
---
 
## What It Does
 
**Pre-disaster:** Vulnerable individuals or their caregivers register their address and dependencies (oxygen, dialysis, mobility, deaf/HOH, cognitive, limited English, lives alone, medication-critical).
 
**During disaster:** Stranded cross-references the registrant database against damage data, scores each person by combined damage severity × dependency weight × time since contact, and surfaces the highest-risk cases to responders.
 
**AI dispatch briefings:** For each high-priority registrant, three Claude agents run sequentially:
- **Triage agent** — assesses priority tier (P1–P4), immediate risks, and time sensitivity
- **Dispatch agent** — generates a terse, radio-style briefing telling the responder what to bring and what to expect
- **Resource matcher** — outputs a controlled-vocabulary resource tag set (medical_o2, dialysis_transport, asl_interpreter, etc.)
The result: any responder with basic FEMA training can open Stranded, click a name, and have a complete situational picture in under 10 seconds — without requiring domain expertise to triage.
 
---
 
## Demo
 
> **Live demo:** [https://stranded-aiis-hackathon-project.vercel.app] — open on any device, no setup required.
 
The dashboard shows:
- Real-time priority list ranked by risk score
- Damage zone overlay on a live map (Hurricane Helene, Asheville/Swannanoa)
- Demographic vulnerability choropleth (% over 65, disability rate, LEP)
- AI-generated dispatch briefings with full-screen overlay for readability
---
 
## Data Pipeline
 
The data layer is built entirely on public sources:
 
| Source | What it provides | How it's used |
|--------|-----------------|---------------|
| US Census ACS 5-year | Block-group demographics (age, disability, LEP, single-household) | Vulnerability choropleth |
| TIGER/Line 2020 | Block group geometries for Buncombe County NC | Choropleth rendering + registrant BG lookup |
| Hand-traced damage polygons | 10 polygons over Asheville/Swannanoa neighborhoods | Damage overlay + risk scoring |
| Synthetic registrants (15) | Representative vulnerable population profiles | Priority list + dispatch demo |
| Turso (libSQL) | Hosted SQLite database | Production data persistence on Vercel |
 
Risk scoring formula:
 
```
risk = dependency_weight × damage_multiplier × contact_multiplier
```
 
Where:
- `dependency_weight` = sum of per-dependency weights (oxygen: 1.0, dialysis: 1.0, medication_critical: 0.8, mobility: 0.7, cognitive: 0.7, lives_alone: +0.3 multiplier...)
- `damage_multiplier` = 0 (none) / 0.5 (minor) / 1.5 (major) / 2.5 (destroyed)
- `contact_multiplier` = min(1 + hours_since_contact / 12, 3.0)
This is a real-time, individual-level analog of the Census Bureau's Community Resilience Estimates methodology, which uses 10 social vulnerability components to assess disaster resilience at the neighborhood level.
 
---
 
## Multi-Agent Architecture
 
Three Claude agents run sequentially per triage request:
 
```
POST /api/triage
    │
    ├─ Triage Agent (claude-sonnet-4-5)
    │   Input:  registrant + damage context + hours since contact
    │   Output: { priority_tier, primary_concern, immediate_risks,
    │             time_sensitivity, confidence }
    │
    ├─ Dispatch Agent (claude-sonnet-4-5)
    │   Input:  triage output + registrant + damage
    │   Output: { briefing, access_notes, priority_action }
    │
    └─ Resource Matcher (claude-haiku-4-5)
        Input:  dependencies + priority tier
        Output: { resource_tags[], rationale }
 
Results cached in SQLite (10-minute TTL).
P1/P2 briefings auto-generate on panel open.
P3/P4 require manual trigger.
```
 
---
 
## Tech Stack
 
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router, TypeScript) | Full-stack, Vercel-native |
| Map | MapLibre GL JS | Open source, no token required |
| Database | SQLite + Drizzle ORM + Turso | Local file in dev, hosted SQLite in production |
| LLM | Anthropic Claude (Sonnet 4.5 + Haiku 4.5) | Best reasoning quality for dispatch voice |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent |
| Geo | turf.js | Point-in-polygon, distance calculations |
 
---
 
## Local Development
 
```bash
git clone https://github.com/svaline29/Stranded-AIIS-Hackthon-Project
cd stranded
pnpm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
# For local dev, SQLite file is used automatically (no Turso needed)
# For production deploy, also add:
# TURSO_DATABASE_URL=your-turso-url
# TURSO_AUTH_TOKEN=your-turso-token
pnpm db:generate && pnpm db:migrate
pnpm tsx lib/seed/seedScript.ts
pnpm dev
# Open localhost:3000
```
 
No other API keys required for full functionality.
 
---
 
## What's Next
 
This hackathon build demonstrates the core triage and dispatch loop. The three features I'd build next, in order:
 
**1. Voice registration (highest priority)**
The system only works if vulnerable people are in the database. A Vapi voice agent would let anyone register by calling a phone number — no app, no internet, no literacy required. The AI agent asks 5 questions, geocodes the address, and creates the registrant record. A local area code number matching the disaster region makes it feel trustworthy and accessible.
 
**2. Proactive welfare check calls**
When disaster mode activates, the system calls every registrant in a damage zone. "Hi, this is Buncombe County emergency check-in. Are you safe?" Responses update contact status in real time, reordering the priority list. Non-responders escalate automatically. This closes the loop the current system leaves open.
 
**3. Vision LLM damage detection**
Replace hand-traced polygons with Claude vision running on NOAA Emergency Response Imagery tile pairs. Pre/post image comparison at the block level, outputting GeoJSON damage polygons that feed directly into the risk scoring pipeline. NOAA releases imagery within 24-48 hours of a US disaster — this would make Stranded deployable in the first response window of any major US event.
 
---
 
## Limitations
 
- Registrant database is synthetic (15 demo profiles). Real deployment requires community outreach for enrollment — the hardest problem this system faces is not technical.
- Damage polygons are hand-traced for this demo. Production deployment would source these from NOAA Emergency Response Imagery (released within 24-48hrs of major US disasters) via automated vision LLM detection — see What's Next.
- Risk scoring weights are defensible defaults, not clinically validated.
- Single-disaster scope (Buncombe County NC). Geographic generalization requires Census data pipeline extension to new counties.
- Dispatch briefing generation requires an Anthropic API key. Pre-cached briefings for all P1/P2 registrants are included in the demo deployment.
---
 
## Sources
 
- WUNC/BPR, Katie Myers — "After Helene, disabled folks and seniors still vulnerable and in need of water in western NC" (Oct 13 2024)
- US Census Bureau — "More Than Half a Million North Carolinians Under Disaster Declaration After Hurricane Helene Were at High Social Vulnerability to Disasters" (Oct 11 2024)
- NOAA Emergency Response Imagery — Hurricane Helene, Sept 2024
- US Census TIGER/Line 2020 — Block group geometries
- US Census ACS 5-year estimates — Buncombe County NC
- OpenStreetMap contributors (via MapLibre + CartoDB)
Full citations: notes/sources.md
 
---
 
