# /bp/ — Design System Handoff

Identity + component spec for **Bruce Peters**. Hand this folder to a developer (or Claude Code) as-is. Everything below maps to real files in this directory.

> **One-line brief:** the mark is Bruce's initials notated as a phoneme — `/bp/` — drawn from Word Wiz's color-coded sound feedback and set as a code token, living in a terminal/builder world. Dark base, phosphor-green accent, mono as the native voice.

---

## 1. File map

```
design-system/
  tokens.css                          # SINGLE SOURCE OF TRUTH — all design tokens
  Bruce Peters — Design System.html   # the living spec (logo, color, type, components, voice)
  applied/
    Hero.html                         # flat re-skin of the portfolio hero (typing terminal)
    3D Hero.html                      # the re-skinned 3D floating-works scene (DOM overlay + WebGL)
    scene.js                          # the Three.js scene — heavily commented, BP.* mirrors tokens.css
  HANDOFF.md                          # this file
```

**Start here:** open `tokens.css`, then `Bruce Peters — Design System.html` in a browser to see every token applied.

---

## 2. Tokens → CSS variables

All tokens live as CSS custom properties on `:root` in `tokens.css`. Use the variables, never the raw hex.

### Color

| Token | Value | Role |
|---|---|---|
| `--green` | `#57d36a` | **PRIMARY.** Logo, primary action, success, caret, links. Doubles as terminal phosphor. |
| `--green-ink` | `#0c0c0e` | Text/icons on green |
| `--green-deep` | `#2f9d44` | Pressed / shadow on green |
| `--lime` | `#c7ee5e` | Secondary phoneme — highlights, warm data |
| `--coral` | `#ec9576` | Warm phoneme — human, storytelling accent |
| `--magenta` | `#e63b6d` | Hot phoneme — emphasis, alerts, "don't". One per view. |
| `--violet` | `#9b8cff` | Rare phoneme / alt links |
| `--ink-850` | `#101012` | Page background |
| `--ink-800` | `#161619` | Raised panel |
| `--ink-700` | `#1d1d21` | Card / terminal body |
| `--ink-600` | `#26262b` | Strong border, inputs |
| `--ink-500` | `#34343a` | Hairline on dark |
| `--cream` | `#f4f0e8` | Primary text (warm, never pure white) |
| `--dim-1` | `#9a958b` | Secondary text |
| `--dim-2` | `#6f6b62` | Metadata, mono labels |
| `--dim-3` | `#4c4943` | Faint / disabled |

Semantic aliases: `--ok` = green, `--warn` = lime, `--hot` = magenta.

### Type

| Token | Stack |
|---|---|
| `--font-display` | `'Bricolage Grotesque', sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

**The rule:** if a *human would say it*, set it in Bricolage. If a *machine would print it* (label, path, stat, timestamp, tag), set it in mono. That tension is the whole personality.

Scale tokens: `--t-mega`, `--t-h1`, `--t-h2`, `--t-h3`, `--t-body`, `--t-sm`, `--t-mono-label`, `--t-micro` (all clamped/fluid where noted). Tracking: `--tracking-label` (`0.18em`, mono uppercase), `--tracking-tight` (`-0.02em`, display).

**Google Fonts import** (already in each HTML `<head>`):
```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;0,800;1,500&display=swap" rel="stylesheet" />
```

### Spacing, radius, motion

- **Spacing** (8pt base): `--s-1`…`--s-10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.
- **Radius:** `--r-pill` (999px — THE pill: logo, tags, buttons), `--r-card` (14px), `--r-sm` (8px), `--r-xs` (5px — caret).
- **Elevation:** `--shadow-card`, `--shadow-pop`, `--glow-green` (the green halo used on primary/logo).
- **Motion:** `--ease` (confident), `--ease-snap` (pill pop), `--dur-fast` 140ms, `--dur` 240ms, `--dur-slow` 480ms, `--blink` 1.05s (caret).
- **Layout:** `--maxw` 1180px, `--gutter` clamp(20–64px).

---

## 3. The mark

`tokens.css` ships the logo as composable primitives — no image asset required:

```html
<span class="bp-pill bp-logo"><span class="bp-slash">/</span>bp<span class="bp-slash">/</span></span>
```

- `.bp-pill` — the pill primitive (mono, 800 weight, green bg, pill radius).
- `.bp-slash` — the phoneme delimiters (dimmed to 0.55 opacity).
- `.bp-caret` — the blinking green cursor (`@keyframes bp-blink`).
- `.bp-label` / `.bp-comment` — the `//` mono section markers (kept from Bruce's code-comment stickers).

**Rules:** lowercase always · never uppercase `BP` · no gradients · keep it a pill, never a box · min size 20px tall (14px for `bp` without slashes) · clearspace = cap-height of the "b" on all sides. Full do/don't grid is in the Design System HTML, §01.

---

## 4. Component inventory

Every component is in `Bruce Peters — Design System.html` (§04) with live markup to copy. Two primitives underlie everything: **the pill** (human, tappable) and **the terminal** (machine output).

| Component | Class / pattern | Notes |
|---|---|---|
| Primary button | `.btn .btn-primary` | Green pill, lifts + `--glow-green` on hover |
| Ghost button | `.btn .btn-ghost` | Hairline border → green on hover |
| Hot button | `.btn .btn-mag` | Magenta. One per view, max. |
| Tech chip | `.tech-chip` + `.dot` | Mono, pill, colored dot ties tech → a phoneme |
| Terminal block | `.term` / `.term-bar` / `.term-body` | Build-log pattern; 3 dots = magenta/lime/green |
| Stat readout | `.stat` / `.v` / `.l` | Big display number + mono caps label |
| Project card | `.proj` | Colored `.top` bar (accent), kicker, title, desc, chips |
| Section marker | `.bp-label.bp-comment` | The `// what i'm building` label |

---

## 5. Voice

Plainspoken, present-tense, lowercase — a builder talking about what he's building.

- **Say:** "i build things that outlast me." · "my code scored every point." · "a reading tutor that hears the sounds kids miss." Lead with the verb; name the real thing; lowercase headers read like commit messages.
- **Don't:** "Infrastructure for human potential." · "Leveraging cutting-edge AI…" · résumé adjectives ("passionate, results-driven"). No mission-statement abstraction, no hype verbs.

---

## 6. Wiring the 3D scene to real assets

`applied/3D Hero.html` = DOM overlay (crisp UI) + `<canvas>` (WebGL). `applied/scene.js` builds the scene. It is **commented as a spec**; the `BP.color` / `BP.font` object at the top mirrors `tokens.css` exactly.

**Architecture:** a `world` group holds every floating panel. `addPanel(texture, {x, y, z, scale, rot, glowColor})` places one. Panels are positioned in three depth layers (front: hero mark + primary card · mid: supporting cards · back: pills/stickers/atmosphere) and biased right (`world.position.x`) so the DOM headline column stays clear.

**To swap canvas-drawn placeholders for real screenshots:** the project cards are currently generated by `drawCard()` (a canvas texture). Replace those specific `addPanel(drawCard({...}), {...})` calls with a loaded image texture, keeping the same position object:

```js
const loader = new THREE.TextureLoader();
addPanel(loader.load('assets/word-wiz.png'), { x: 1.8, y: -2.0, z: 1.0, scale: 0.8, rot: 0.04 });
```

`addPanel` reads `texture.image` aspect for sizing — for `TextureLoader` (async) either pre-set the plane aspect or pass a known width/height. Keep the `/bp/` pill, phoneme pills, and `//` stickers as-is; they're identity, not content.

**Performance:** pixel ratio is capped at 2; ~16 panels + 220 particles. Honors `prefers-reduced-motion` (freezes parallax/bob). Three.js is pinned to `0.128.0`.

---

## 7. Open items for Bruce

- **Iron Panthers team number** — intentionally left off the marks and the build log rather than invented. Drop it in `scene.js` (`drawTerminal()` rows) and anywhere a team ID appears.
- **Real project screenshots** — for Word Wiz, Robot Sim, Scouting (see §6).
- **Favicon / social** — export the `/bp/` pill from the Design System HTML at 512px (or rasterize `.bp-pill`).
- **Light mode** — not yet defined; the system is dark-first. Add an inverted token set if needed.
```
