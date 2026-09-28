# ViaFast — Campus Transport Intelligence

**Track. Predict. Optimize.**

ViaFast is a frontend-only mobility platform for university campus transport (built around the official FAST-NUCES Multan bus routes). It unifies five role-based experiences — Student, Parent, Driver, Admin Command Center, and a public Overview — with a live simulated bus map, predictive ETAs, and a local heuristic AI engine for route optimization, capacity rebalancing, extra-bus planning, and breakdown response.

No backend, no API keys, no database required — everything runs in the browser from seeded data.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 6** (dev server + build)
- **Tailwind CSS v4** (CSS-first `@theme` tokens — no `tailwind.config`)
- **motion/react** (animation), **lucide-react** (icons), **canvas-confetti**

## Getting started

Prerequisite: **Node.js 18+**

```bash
npm install      # install dependencies
npm run dev      # start dev server → http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run lint     # TypeScript typecheck (tsc --noEmit)
```

## Project structure

```
src/
├─ App.tsx                 # top-level state + role routing (no router lib)
├─ main.tsx                # entry
├─ index.css               # Tailwind v4 theme tokens + base styles
├─ types.ts                # shared domain types
├─ data/
│  └─ initialData.ts       # seeded routes, stops, vehicles, drivers, students
├─ utils/
│  ├─ aiEngines.ts         # local heuristic AI (ETA, capacity, optimization…)
│  └─ dataImport.ts        # CSV/schedule import helpers
└─ components/
   ├─ ui/                  # reusable design-system primitives (Button, Modal, Drawer…)
   ├─ LandingPage.tsx      # public overview + corridor cards
   ├─ AdminCommandCenter.tsx
   ├─ StudentPortal.tsx / ParentPortal.tsx / DriverPortal.tsx
   ├─ LiveMobilityMap.tsx  # SVG live bus simulation
   ├─ RouteStopsModal.tsx  # click a route number → see all its stops
   └─ …feature modals (payments, auth, what-if, extra bus, etc.)
```

## Features

- **Live map & simulation** — buses ease stop-to-stop in real time; play/pause and speed controls.
- **Route stops on demand** — click any route number (Overview corridor cards or Admin corridor-load cards) to open the full ordered stop list with pickup/return times and the captain's tap-to-call number.
- **Role portals** — Student (ETA, QR pass, fees), Parent (safety status, driver call), Driver (stop sequencing, manifest, incident reporting), Admin (fleet telemetry, AI recommendations, what-if simulator, batch route updates, staff ride passes).
- **Local ViaAI engine** — capacity rebalancing, delay prediction, extra-bus proposals, and breakdown replacement, all computed client-side.
- **Official schedule** — the printable timetable mirrors the university's published transport routes.

## Notes

- This is a demonstration/prototype: data is in-memory and resets on reload.
- Route/stop/driver data is seeded from the official transport schedule.
