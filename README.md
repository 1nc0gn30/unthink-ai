# Unthink AI

A client-side decision engine for trivial everyday dilemmas. Enter 2 to 6 options, choose a tie-breaker mode, and lock in one answer immediately—zero login, zero paywalls, and zero API key required.

- **Live URL**: [https://unthink-ai.757tech.pro/](https://unthink-ai.757tech.pro/)
- **Source**: [https://github.com/1nc0gn30/unthink-ai](https://github.com/1nc0gn30/unthink-ai)

## What It Does

- **5 Client-Side Decision Modes**:
  1. **Instant Verdict** — Seeded deterministic tie-break with confidence score, lead margin, and runner-up dismissal.
  2. **Weighted Coin & Elimination Tournament** — Pairs options in head-to-head best-of-3 weighted coin flips until one champion survives, displaying the full bracket log.
  3. **2-Minute Regret Minimizer** — Scores each option on reversibility, execution friction, and upside to pick the highest 48-hour regret floor.
  4. **Pro/Con Tiebreaker** — Tallies pros (`+2`), cons (`-1.5`), and priority weight (`1–5`), applying a transparent seeded tie-break when scores deadlock.
  5. **Deadpan Oracle** — Dry, blunt directive paired with tie-break metrics.
- **Quick Everyday Presets**: One-click starter dilemmas for *Lunch*, *Weekend*, *Side Project*, *Watch Tonight*, and *Coffee Run*.
- **Gut-Check Override**: If a verdict sparks instant disappointment, swap to the runner-up with one click and record the psychological reveal.
- **Local Decision Log & Streak Stats**: Stores up to 40 recent verdicts in `localStorage` (`unthink_ai_history_v2`) with day streak, total verdicts, estimated overthinking saved, and one-click option reload.
- **Copyable Verdict Card**: Exports a formatted plain-text verdict summary to the clipboard.
- **Optional BYOK Gemini Enhancer**: Collapsed and off by default. Users who want an LLM-rewritten one-liner can pass their own Gemini API key to `POST /api/decide`; if unreachable, the app falls back to the local verdict without interrupting the flow.

## Local Development

```bash
npm install
npm run dev      # Express + Vite dev server on http://localhost:3000
npm run lint     # TypeScript type-check (tsc --noEmit)
npm test         # Engine unit tests + production guardrail checks
npm run build    # Production bundle -> dist/
```

## Architecture

- `src/engine/decisionEngine.ts` — Pure deterministic PRNG (`FNV-1a` + `Mulberry32`) and scoring logic for all 5 modes, verdict card formatter, and streak calculation.
- `src/engine/presets.ts` — Curated trivial dilemma presets and mode metadata.
- `src/engine/storage.ts` — Safe `localStorage` persistence wrapper.
- `src/components/VerdictStage.tsx` — Tactile reveal ticker, verdict card, mode breakdowns, gut-check prompt, and clipboard copy.
- `src/components/HistoryPanel.tsx` — Streak metrics and persisted decision feed.
- `netlify/functions/decide.ts` & `server.ts` — Optional BYOK Gemini endpoint (`POST /api/decide`), never required for core operation.
- `tests/engine.test.ts` & `tests/guardrail.test.ts` — Automated unit and SEO/AEO/Netlify hygiene tests.

## Support

Unthink AI is 100% open-access with zero paywalls. If it saved you ten minutes of menu scrolling:

- **Buy Us a Coffee (Stripe)**: [https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X](https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X)
- **Solana Tip**: `GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK`

Engineered by **Neal Frazier Tech** ([@1nc0gn30](https://github.com/1nc0gn30)) • [NullAI Platform](https://nullai.tech)
