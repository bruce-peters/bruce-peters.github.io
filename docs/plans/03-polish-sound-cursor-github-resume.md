# Feature Plan — Polish Pass: Sound, Cursor Reactions, GitHub Stats, Resume Mode

> A bundle of high-perceived-craft touches. Each is independently shippable; ordered here
> by ROI. (Boot sequence is already done and out of scope.)

---

## A. Sound design (opt-in, muted by default)

### Goal
Tasteful, restrained audio that makes the site feel like *software*: a soft mechanical
*thunk* when a section snaps active, a faint tick on dot-rail nav, a subtle phosphor hum bed.
One tasteful **mute/unmute** toggle. Muted by default — sound is never sprung on a visitor.

### Architecture
- New `src/lib/audio.js` — a tiny Web Audio manager:
  - Lazily creates a single `AudioContext` on **first user gesture** (browser autoplay
    policy requires this; resume the context inside a click/keydown handler).
  - `play(name)` with a small set of pre-decoded buffers; gracefully no-ops if muted or
    context unavailable.
  - Global gain node for master volume; `setMuted(bool)` persisted to `localStorage`.
  - Synthesize where possible (short osc+envelope clicks) to avoid shipping audio assets;
    use tiny files only for the richer "thunk"/hum. Keep total audio payload < ~50 KB and
    lazy-loaded (never on the critical path).
- A `SoundToggle.jsx` control placed in the fixed chrome (near `NavBlock`, top-right). Pill,
  `/bp/` styling, speaker-on/off icon (lucide-react is already a dependency).

### Hook points
- **Section snap:** in `App.jsx`, the scroll→node mapping already computes the active node;
  fire `audio.play('snap')` when the rounded active index changes (debounced — only on
  settle, not during continuous scroll). The scene already emits `onProjectChange`
  (`scene.js:264`) → cleanest hook is in `handleProjectChange` (`App.jsx:25`).
- **Dot-rail / nav click:** `audio.play('tick')` in `DotRail` and `NavBlock` handlers.
- **External-link exit:** a soft "whoosh" synced to `startExitAnimation` (`App.jsx:95`).
- **Hum bed (optional):** very low-volume looping pad while the tab is focused; pause on
  `visibilitychange`. Ship behind the same toggle, default off even when sound is on
  (separate `ambient` flag) — ambient drone is divisive.

### Risks / care
- Respect `prefers-reduced-motion`? Sound is separate, but couple it: if a user wants
  reduced motion, default ambient off and keep only discrete UI sounds.
- Never autoplay. Toggle defaults to muted; first unmute is the gesture that unlocks the
  context.
- Keep volumes low; A/B with real ears. Restraint is the whole game — one bad sound reads
  as amateur, the opposite of the goal.

**Effort:** ~0.5 day.

---

## B. Cursor reactions

### Goal
Make the fixed 3D background and chrome feel alive and responsive to the pointer without
hijacking scroll.

### What already exists
`scene.js` already does subtle **mouse parallax** on the camera (`PARALLAX = 0.3`,
`scene.js:188`, applied at `scene.js:279`). Build on it rather than duplicating.

### Additions (pick a subset)
1. **Idle camera/robot tracking** — when the user hasn't scrolled for a few seconds, let the
   `lookCurve` target drift slightly toward the mouse, or have the replayed robot's tower
   (see plan 01) tilt toward the cursor. Cheap life; reset on scroll. Implement in the
   `scene.js` tick where parallax is applied.
2. **Magnetic pills** — primary CTAs / nav links subtly translate toward the cursor on
   near-hover (a few px, eased). A small `useMagnetic` hook applied to the green pills in
   `ProjectCard`/`NavBlock`. High craft-signal, low cost. Gate behind
   `prefers-reduced-motion`.
3. **Custom cursor** *(optional, higher risk)* — a small ring that lags the pointer and
   scales over interactive elements. Adds personality but easy to overdo / hurt usability on
   trackpads. If done: keep the native cursor visible too (accessibility), make it a subtle
   accent ring, disable on touch devices.
4. **Pointer-reactive scene elements** — the floating screenshot panes (`SCREENSHOT_PANES`)
   could parallax at differing depths relative to the cursor for a diorama feel. The pane
   controller already updates per-frame; add a mouse term.

### Risks / care
- Don't fight scroll or add input latency. All effects are additive offsets eased toward a
  target, never blocking.
- Respect `prefers-reduced-motion` — disable magnetic/custom-cursor/idle-drift.
- Touch devices: no hover; feature-detect and skip.

**Effort:** ~0.5 day for parallax-idle + magnetic pills; +0.5 day if custom cursor.

---

## C. Live GitHub stats

### Goal
Turn claims ("1000+ hrs", "7+ yrs building") into *evidence*: a live contribution heatmap
and/or real repo/commit/language stats, rendered in the `/bp/` style.

### Data source — pick based on auth tolerance
- **REST, unauthenticated** (`api.github.com/users/bruce-peters`, `/repos`): public repo
  count, stars, top languages, latest push. **No token, but 60 req/hr/IP** rate limit.
  Safe for low-traffic; cache hard.
- **Contribution graph (the green squares)** needs the **GraphQL API**, which **requires a
  token**. A client-embedded token is a leak. Options:
  - **Pre-render at build time:** a Node script in `scripts/` fetches the contribution
    calendar using a token from CI/local env (`GITHUB_TOKEN`, never committed) and writes
    `public/github-stats.json`. The site loads the static JSON — zero client token, zero
    runtime rate limit, instant. **Recommended.** Re-run on deploy (`npm run deploy`).
  - Third-party SVG (`ghchart`, `github-readme-stats`) — easy but external dependency and
    off-brand styling. Avoid; we want it in our own design language.

### Rendering
- New `src/components/GitHubStats.jsx`:
  - Reads `public/github-stats.json` (or live REST for the simple numbers).
  - **Contribution heatmap** drawn as a grid of cells, colored in `accent` opacity ramp
    (phosphor green intensity = activity). Matches the design system far better than
    GitHub's default green.
  - A few stat readouts (repos, total commits/contributions, top languages) reusing the
    bordered `.stat` box pattern from `ProjectCard` (`ProjectCard.jsx:96-114`).
- Placement: in the **About** section (`AboutCard.jsx`) — augment the existing
  hardcoded stats array (the about entry already has `stats` like `["7+","yrs building"]`
  in `projects.js`). A live heatmap directly under the bio is the strongest "real builder"
  beat.

### Build wiring
- `scripts/fetch-github-stats.mjs` → writes `public/github-stats.json`.
- Add to deploy: `"deploy": "node scripts/fetch-github-stats.mjs && npm run build && gh-pages -d dist"`
  (token via env in the shell/CI that runs deploy). Keep a committed fallback JSON so a
  missing token doesn't break the build — script logs a warning and leaves the fallback.

### Risks / care
- **Token never in client/bundle.** Build-time only.
- Stale data is fine (it's a portfolio); regenerate on deploy.
- Empty/failed fetch → component renders nothing or the static fallback, never a broken box.

**Effort:** ~0.5–1 day (build script + heatmap canvas/DOM).

---

## D. Resume mode / "View résumé" button

### Goal
Two things, ideally both:
1. **View résumé** — one obvious button to get the PDF (the recruiter who has 30 seconds).
2. **Recruiter mode** — a button that flattens the 3D experience into a fast, scannable,
   printable HTML summary for someone who won't scroll a 3D scene.

### D1. View-résumé button (quick win)
- Drop `public/resume.pdf` (the `/bp/`-styled résumé; export to match brand).
- Add a **Résumé** link to `NavBlock.jsx` (`NavBlock.jsx:5-8` array) — opens the PDF in a new
  tab. Treat like the other external links (it doesn't need the white-flash exit anim, but
  could use it for consistency).
- Also surface it in the About section CTA row next to "view work".

### D2. Recruiter / reader mode (bigger)
- A toggle (URL `?mode=resume` or a chrome button) that renders a **separate, flat DOM view**:
  no canvas, no scroll-driven camera — just a clean single-column document:
  - Header: name, role, contact, links, résumé download.
  - Each project as a compact row: title, one-line impact, tags, stat, link. Drives off the
    **same `PROJECTS` data** in `projects.js` — single source of truth, no content dupe.
  - Archive collapsed to a list.
  - Print stylesheet (`@media print`) so ⌘P yields a clean PDF-like page.
- Implementation: gate in `App.jsx` — if recruiter mode, render `<ResumeView>` instead of the
  3D `<main>` + scene `useEffect` (skip `initScene` entirely so it's instant and light).
  New `src/components/ResumeView.jsx`.
- Entry points: a small "recruiter mode" / "text version" link in the chrome, plus respect
  `?mode=resume` deep-links. Persist choice in `localStorage` so a returning recruiter skips
  the 3D.

### Why both
The 3D scene *wows*; the flat view *converts*. The same content powering both means no
maintenance tax. This is the "I'd actually hire him — and he made it easy to" close.

### Risks / care
- Keep `ResumeView` driven by `PROJECTS` so it never drifts from the main site.
- Recruiter mode must be genuinely fast: do **not** init Three.js when it's active (guard the
  `import('./scene/scene.js')` effect in `App.jsx:33`).
- Make the PDF and the HTML résumé say the same thing.

**Effort:** D1 ~1 hr. D2 ~0.5–1 day.

---

## Suggested order

1. **D1 — View-résumé button** (1 hr, pure conversion value).
2. **B — magnetic pills + idle parallax** (cheap, high craft signal).
3. **C — GitHub heatmap** (turns claims into evidence).
4. **A — sound design** (memorable, but needs careful tuning).
5. **D2 — recruiter mode** (most code; do once the above land).

Custom cursor (B3) and ambient hum (A) are the two "only if they feel right" extras — easy to
overdo, so prototype and gut-check before committing.

---

## Cross-cutting

- **`prefers-reduced-motion`** gates magnetic/cursor/idle-drift/ambient — `ProjectCard.jsx:10`
  already reads it; centralize in a `useReducedMotion` hook and reuse.
- **No new heavy deps** — Web Audio, Canvas, and `fetch` are native; `lucide-react` (icons)
  is already present. Keep every addition off the critical loading path.
- **Touch/mobile** — feature-detect hover/pointer; skip cursor effects; sound toggle still
  available.
