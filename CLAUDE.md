# portfolio-new — CLAUDE.md

Bruce Peters' 3D portfolio. React + Vite + Three.js + Tailwind. Dev: `npm run dev` → localhost:5174. Deploy: `npm run deploy` (gh-pages).

---

## Architecture

**Layout model:** Normal scrolling document. `App.jsx` renders one `<ProjectSection>` per entry in `PROJECTS`. The Three.js canvas is a **fixed background** (`#scene-container`, `pointer-events:none`, `z-0`). A rAF-throttled scroll listener maps the viewport center between adjacent section centers to a `nodeFloat ∈ [0, N-1]` and calls `scene.setScroll(nodeFloat)`. The 3D camera is a pure function of that value via CatmullRom splines in `scene.js` — no wheel/touch physics.

**Three.js:** Vanilla Three.js in a `useEffect`+`useRef` pattern (`src/scene/`). Not React Three Fiber — the design shipped 1,385 lines of tuned Three.js and rewriting as R3F would add risk with no visual gain. Orbit controls are disabled except in Tune Mode.

**Tune Mode (localhost only):** `Shift+T` enters an in-scene editor for tweaking 3D card/scene-element positions. It locks page scroll, re-enables `pointer-events` on the canvas, and surfaces a `TuneMode.jsx` inspector panel. Hidden on production builds — guarded by `window.location.hostname === 'localhost'`.

**Slim 3D cards:** `buildProjectCard` / `projectCardTexture` accept `slim: true` (default). Slim cards show screenshot only — no text overlay. The DOM `<ProjectCard>` owns all prose. Projects without an `image` field return `null` from `buildProjectCard` and are skipped silently.

**External link transition:** Clicking a CTA calls `scene.startExitAnimation()` then opens the URL, with a white-flash overlay (`z-[100]`) timed to the animation.

**ASI hazard rule:** In `builders.js`, never start a line with `[` after a closing `)`. The JS engine parses `)\n[[...].forEach(` as a computed property access → `undefined.forEach`. Prefix any array-literal-starting line with `;[` when it follows a `)`.

---

## /bp/ Design System

Source: `Portfolio Website/design-system/HANDOFF.md` + `tokens.css`. Tokens live in `tailwind.config.js` and `src/index.css`. Use Tailwind classes; never raw hex.

### Identity

The mark is Bruce's initials as a phoneme — `/bp/` — set as a code token in a terminal/builder world. Rules:
- **Always lowercase.** Never `BP`.
- **Always a pill** (border-radius 999px). Never a box.
- **No gradients.**
- Min height 20px (14px for `bp` without slashes). Clearspace = cap-height of "b" on all sides.

```html
<span class="bp-pill bp-logo"><span class="bp-slash">/</span>bp<span class="bp-slash">/</span></span>
```

### Colors

| Tailwind token | Hex | Role |
|---|---|---|
| `accent` | `#57d36a` | **PRIMARY.** Logo, actions, success, caret, links. Phosphor green. |
| `bg` | `#101012` | Page background (ink-850) |
| `fg` / `cream` | `#f4f0e8` | Primary text — warm, never pure white |
| `dim` | `#9a958b` | Secondary text |
| `dim2` | `#6f6b62` | Metadata, mono labels |
| `line` | `#26262b` | Borders, inputs |
| `ink.800` | `#161619` | Raised panel |
| `ink.700` | `#1d1d21` | Card / terminal body |
| `lime` | `#c7ee5e` | Secondary phoneme — highlights, warm data |
| `coral` | `#ec9576` | Warm phoneme — human, storytelling accent |
| `magenta` | `#e63b6d` | Hot phoneme — emphasis, alerts. **One per view max.** |
| `violet` | `#9b8cff` | Rare phoneme / alt links |

Semantic: `--ok` = green, `--warn` = lime, `--hot` = magenta.

### Typography

| Font | Tailwind class | Rule |
|---|---|---|
| Bricolage Grotesque | `font-display` / `font-serif` | If a *human would say it*, use this. Display, headings, prose. |
| JetBrains Mono | `font-mono` | If a *machine would print it* (label, path, stat, timestamp, tag), use this. |

The tension between human voice (Bricolage) and machine output (JetBrains Mono) **is** the personality.

Tracking: `0.18em` uppercase for mono labels; `-0.02em` tight for display.

### Spacing, radius, motion

- **8pt base.** `--s-1`…`--s-10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.
- **Radius:** pill = 999px, card = 14px, sm = 8px, xs = 5px.
- **Elevation:** `--shadow-card`, `--shadow-pop`, `--glow-green` (green halo on primary/logo).
- **Motion:** fast = 140ms, base = 240ms, slow = 480ms. Caret blink = 1.05s.
- **Layout:** max-width 1180px, gutter clamp(20–64px).

### Voice

Plainspoken, present-tense, lowercase. A builder talking about what he's building.

- **Do:** "i build things that outlast me." · "my code scored every point." Lead with the verb; name the real thing; lowercase headers read like commit messages.
- **Don't:** mission-statement abstraction ("Infrastructure for human potential."), hype verbs ("Leveraging cutting-edge AI…"), résumé adjectives ("passionate, results-driven").

---

## Components

Two primitives underlie everything: **the pill** (human, tappable) and **the terminal** (machine output).

| Component | File | Notes |
|---|---|---|
| Identity mark | `IdentityBlock.jsx` | Fixed top-left. The `/bp/` pill. |
| Nav links | `NavBlock.jsx` | Fixed chrome. Social/external links. |
| Dot rail | `DotRail.jsx` | Fixed right-side section nav indicator. |
| Project section | `ProjectSection.jsx` | Wrapper per PROJECTS entry. Cards alternate left/right by index parity; `isOverview`/`isAbout`/`isArchive` nodes are centered blocks. |
| Project card | `ProjectCard.jsx` | DOM card — owns all prose, stats, tags, CTA. |
| About card | `AboutCard.jsx` | The about node — bio, skills, stats. |
| Loading screen | `LoadingScreen.jsx` | Fades out when scene signals loaded. |
| Tune Mode | `TuneMode.jsx` | Dev-only 3D position inspector. localhost-gated. |

---

## Data

All project content is in `src/data/projects.js`. `PROJECTS` is the canonical list consumed by both `App.jsx` (DOM rendering) and `scene.js` (3D camera path). Each entry has:

- `id`, `index`, `label`, `title`, `desc`, `tags`, `stats`, `year`, `cta`
- `pos` — 3D world position of the camera focus point
- `focusOffset` — camera position offset relative to `pos`
- `lookAt` — where the camera points
- `image` — screenshot path (optional; omit → no 3D card)
- `cardRotY` — Y-axis rotation of the floating 3D card (optional)
- `isOverview`, `isAbout`, `isArchive` — layout variant flags

`SCREENSHOT_PANES` and `SCENE_ELEMENTS` in the same file drive ambient floating panes and named 3D objects respectively.

---

## Scene files

| File | Role |
|---|---|
| `src/scene/scene.js` | Entry point. `initScene()` → returns `{ setScroll, destroy, enterTuneMode, exitTuneMode, startExitAnimation }`. Camera path is CatmullRom splines parameterized by `nodeFloat`. |
| `src/scene/builders.js` | Three.js geometry builders — FRC field, robot, floating cards, about pills. Watch the ASI hazard rule above. |
| `src/scene/textures.js` | Canvas-based texture generators for 3D cards. |
| `src/scene/tuneGizmos.js` | Tune Mode drag/select helpers. |
| `src/scene/autoPlayback.js` / `autoPlayback2025.js` | Replay match logs for the robot2025 section animation. |

---

## Open items (from original handoff)

- **Iron Panthers team number** — intentionally omitted. Drop it in `scene.js` (`drawTerminal()` rows) and anywhere a team ID appears.
- **Real project screenshots** — Word Wiz, Robot Sim, Scouting are currently the main screenshot panes.
- **Favicon / social** — export the `/bp/` pill at 512px.
- **Light mode** — not defined; system is dark-first.
