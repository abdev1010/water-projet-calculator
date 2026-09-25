# Project W

Research dashboard and financial model for the Sitapur packaged drinking water venture.

## Run it

```bash
rm -rf node_modules package-lock.json   # first run on your Mac — see note below
npm install
npm run dev      # http://localhost:5173
npm test         # engine + validator tests
npm run build    # production build into dist/
```

**First run on macOS:** `node_modules` was installed from a Linux VM, and npm has a
[known bug with optional dependencies](https://github.com/npm/cli/issues/4828) that leaves
the wrong platform binaries for esbuild and rollup. Delete `node_modules` and
`package-lock.json` once and reinstall — after that it behaves normally.

## What exists so far

**Phase 0 — shell.** Sidebar, routes, light/dark theme.

**One-page calculator** (`/calculator`) — every input on the left prefilled from the example
research, every derived figure on the right: project cost, funding split, production volume,
cost per bottle, revenue and break-even. This is the page to use day to day.

**Phase 1 — the engine and the project cost calculator.**

- `src/model/engine.ts` — one pure function, `computeScenario()`. Every number in the UI comes from it. No component calculates anything.
- `src/model/validate.ts` — guard rails that flag the ways a model like this fails quietly.
- `src/model/fixtures/exampleModel.ts` — the illustrative 100-point model, kept as a regression fixture because it contains four real defects.
- `src/model/engine.test.ts` — asserts the engine catches all four.
- `src/store/scenarios.ts` — multiple scenarios, persisted to localStorage, with JSON export/import.
- `src/pages/ProjectCost.tsx` — editable capital tables, derived funding split.

Routes for unit economics, scenario compare, machine comparison and the research index exist but are placeholders.

## The two rules the engine enforces

**Production volume is resolved in exactly one place.** A model that states its output in more than one spot will eventually state two different figures. Everything downstream reads `monthlyVolume`, which is derived from the line rate — and the line rate is the *slowest machine in the line*, not the filler's badge rating.

**Variable and fixed costs stay separate.** Fixed-cost-per-bottle depends on volume, so folding labour into a single "landed cost" and then using that figure for break-even is circular. Break-even uses variable cost only.

## Data and backups

Everything lives in this browser's localStorage under `pw:scenarios`. It does not sync between devices and it is one cleared cache away from gone.

**Export a backup regularly.** The Export button downloads a JSON file; Import reads it back. That file is also how you move data between machines — commit it to the repo or email it to yourself.

## Deploying later

Built for static hosting from day one but not wired up yet. When you decide:

```bash
VITE_BASE=/poject-w/ npm run build
```

The app uses `HashRouter`, so it works under a subpath with no server configuration.

**Before you deploy anywhere public, read this:** GitHub Pages sites are publicly readable. Access control is an Enterprise-only feature, so even a private repository publishes an open, indexable site. Your costs, vendor quotes, margins and financing structure would be on the open web. If you want it online and private, Cloudflare Pages with Access gives you the same static hosting from the same repo with an email login in front, on the free tier.

## Conventions

- `src/model/` contains no React and no I/O. It is the only place business figures are computed, and it is testable without a browser.
- Rounding happens in `src/model/format.ts` at display time. The engine works in full precision throughout.
- Every capital line item carries a `confidence` flag — `verified`, `indicative` or `assumption`. The validator uses it to tell you how much of your project cost rests on guesses.
