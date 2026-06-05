# Feature Plan — "The Robot's Mind": State-Machine Billboard Tower

> Render the superstructure state machine as a billboarding tower of state chips
> floating above the replayed robot, so a visitor literally watches the code think
> as the robot drives. Drives off the existing `.wpilog` match logs.

---

## 1. Goal & "wow" target

While the 2025 Reefscape robot replays its match (the `robot2025` node), a vertical
stack of state chips floats above it and updates in real time — the **active**
superstructure state lit in phosphor green, a few **recent** transitions fading out
below it, and a thin readout line (`STOW → INTAKE → L4_SCORE`). The claim "I wrote the
state machine that scored every point" stops being a sentence and becomes something you
*watch happen*.

Stretch: the elevator/pivot setpoints (numbers) the state commands, shown as a tiny
gauge so the state → mechanism causality is visible.

---

## 2. How it fits the existing architecture

- The 2025 robot is built and driven in `src/scene/autoPlayback2025.js` via
  `loadAutoPlayback2025(scene, allUpdaters)`. It already parents `robotGroup`,
  `elevatorGroup`, `pivotGroup` and drives them per-frame from
  `public/wpilog/akit_25_sim.auto.csv` in its `tick(elapsed)` updater.
- The tower attaches as a **child of `robotGroup`** so it tracks the robot's field
  position for free; only the chip *facing* needs billboarding.
- State data does **not** currently exist in the CSV — it must be added by the Python
  exporter (`scripts/wpilog_to_csv_2025.py`). This is the critical-path work item.
- Canvas-texture chips follow the established pattern in `src/scene/textures.js`
  (`wordPillTexture`, `statusPillTexture` already draw exactly this kind of pill).

---

## 3. Data pipeline (critical path — do this first)

### 3.1 Discover the state key in the raw log

The raw log is `public/wpilog/akit_25-04-17_15-54-07_newton_q62 (1)_sim.wpilog` (32 MB).
The exporter already has a "dump all entry names" branch (it prints every
`tname / name` when robot pose is missing — see `wpilog_to_csv_2025.py:137-139`).

**Action:** add a throwaway `--list` flag (or temporarily force the dump) and grep the
output for the superstructure state. Expected candidates (AdvantageKit `@AutoLogOutput`
convention):

- `/RealOutputs/Superstructure/State` or `/ReplayOutputs/Superstructure/State`
- `/RealOutputs/Superstructure/CurrentState` / `.../GoalState` / `.../WantedState`
- type string `string` (enum name) — easiest to render directly.

Log the exact key + type before writing any export code. If the state is logged as an
**int** enum ordinal instead of a string, also capture the enum's declaration order from
the robot repo so we can map ordinal → name in JS.

### 3.2 Extend the exporter

In `scripts/wpilog_to_csv_2025.py`:

- Add the discovered key to `TARGETS` (e.g. `"state": "/RealOutputs/Superstructure/State"`).
- States are **string** records, not Pose3d — add a decode branch. A WPILog string
  payload is raw UTF-8 bytes of the whole payload, so `payload.decode("utf-8", "replace")`.
  (If it's an int enum: `int.from_bytes(payload, "little")`.)
- Add a `state` column to `headers` (single column, carry-forward like the poses via the
  existing `latest`/`cursors` machinery — strings carry forward identically).
- Quote the value through `csv.writer` (already used) so commas/spaces are safe.

Re-run:
```
python scripts/wpilog_to_csv_2025.py "public/wpilog/akit_25-04-17_15-54-07_newton_q62 (1)_sim.wpilog"
```
Verify the new `state` column in `akit_25_sim.auto.csv` shows readable transitions
(e.g. `STOW`, `INTAKE`, `L4`, `SCORE`). Sanity-check the count of distinct states.

> ⚠️ The CSV is regenerated in place — confirm the robot/elevator/pivot columns are
> unchanged (diff the first data row against git) so the existing playback isn't disturbed.

### 3.3 Parse it in JS

In `autoPlayback2025.js`, the row builder (`autoPlayback2025.js:135-143`) currently maps
only numeric pose columns. Add:
```js
state: row[idx['state']] ?? '',
```
(no `parseFloat` — keep it a string). `idx` already maps header → column.

---

## 4. Rendering the tower

### 4.1 Chip primitive (new texture helper)

Add `stateChipTexture(label, { active })` to `src/scene/textures.js`, modeled on
`statusPillTexture` (textures.js:154):

- Active: bg `#57d36a`, fg `#0c0c0e`, optional green glow stroke.
- History: bg `#1d1d21` (ink-700), fg `#9a958b` (dim), thin `#26262b` border.
- Mono font, uppercase, `0.18em`-feel tracking (manual letter spacing on canvas).
- Return `{ tex, aspect }` like the others.

### 4.2 Billboarding

Two viable approaches — **prefer `THREE.Sprite`** (auto-faces camera, no per-frame math,
no camera reference needed):

- Build each chip as a `THREE.Sprite` with a `SpriteMaterial({ map: tex })`.
- Scale via `sprite.scale.set(h * aspect, h, 1)`.
- Stack them on local `+Y` above the robot: active chip highest/most prominent, history
  chips descending with decreasing opacity.
- Parent the whole `towerGroup` under `robotGroup` so it follows the robot; sprites
  ignore the robot's yaw automatically (they always face the camera). Position the tower
  base at roughly `y = robot height + 0.4 m`.

> Sprites sidestep the fact that `allUpdaters` callbacks receive only `(elapsed)` and have
> no camera handle. If we later want flat billboard planes instead, we'd pass `camera`
> into `loadAutoPlayback2025` and `quaternion.copy(camera.quaternion)` each tick.

### 4.3 Driving it each frame

Inside the existing `tick(elapsed)` in `autoPlayback2025.js`, after computing `row`:

- Read `row.state`. Maintain module-level `currentState` + a small `history` array
  (last ~3 distinct states with a timestamp).
- On change (`row.state !== currentState`): push old state into `history`, trim to N,
  set `currentState`, and trigger a **rebuild/redraw** of the affected sprite textures.
  Only redraw on transition (not every frame) — canvas texture regeneration is the
  expensive part; transitions are sparse (a few per second at most).
- Animate opacity/scale of history chips toward their resting values with a simple
  `lerp` each frame for a smooth "settle" (cheap, no texture work).

Caching: keep a `Map<stateName, {activeTex, historyTex}>` so each distinct state's
textures are generated once and reused — the set of states is small and fixed.

### 4.4 Visibility / lifecycle

- The tower should only be visible when the robot is (`robotGroup.visible`, set true once
  CSV loads — autoPlayback2025.js:147). Sprites parented under it inherit visibility.
- Optional: fade the whole tower in/out based on proximity to the `robot2025` node so it
  doesn't clutter distant views. The scene knows `activeIndex`; simplest is to gate on
  `robotGroup.visible` and accept it's always on. A nicer version passes a
  `setTowerVisible(bool)` out of the loader and toggles it from `scene.js` when
  `PROJECTS[activeIndex].id === 'robot2025'`.

---

## 5. Stretch: state → setpoint gauge

Once states render, add a small mechanism readout under the active chip:
- The elevator/pivot **poses** are already in the row. Convert elevator world-Y to a
  0–1 height bar; pivot quaternion → angle for a small dial.
- Renders the "this state commands these mechanisms" story. Pure canvas, same redraw path.

---

## 6. File-by-file change list

| File | Change |
|---|---|
| `scripts/wpilog_to_csv_2025.py` | Add state key to `TARGETS`; string-decode branch; `state` column; (optional) `--list` discovery flag. |
| `public/wpilog/akit_25_sim.auto.csv` | Regenerated with new `state` column. |
| `src/scene/textures.js` | New `stateChipTexture(label, opts)` helper. |
| `src/scene/autoPlayback2025.js` | Parse `state` col; build `towerGroup` of sprites under `robotGroup`; transition tracking + redraw + settle animation in `tick`. |
| `src/scene/scene.js` *(optional)* | Pass through a `setTowerVisible` gate tied to `activeIndex === robot2025`. |

No DOM/React changes required — this is entirely in the 3D layer.

---

## 7. Edge cases & risks

- **State logged as int, not string** → need an ordinal→name map from the robot repo.
  Mitigation: discovery step 3.1 settles this before any rendering work.
- **Key not present in this particular log** (Newton Q62) → the state machine output may
  not have been logged that match. Mitigation: during discovery, if absent, check the
  other raw log (`akit_26-...wpilog`) and consider regenerating from a log known to
  contain `/Superstructure/State`. Fallback: synthesize coarse states from mechanism poses
  (elevator height bands) — less authentic, last resort.
- **Texture churn / GC** — regenerating a `CanvasTexture` every frame would thrash. The
  cache + redraw-only-on-transition design avoids this. Dispose old textures only if not
  cached.
- **Tower readability over a busy field** — keep ≤4 chips; lean on the existing readability
  scrim; give the active chip a subtle dark backing plate sprite if contrast is poor.
- **Loop seam** — playback loops (`t = (elapsed - startSec) % totalSec`). Reset `history`
  and `currentState` when `t` wraps so the tower doesn't show a stale transition across the
  loop boundary.

---

## 8. Verification

1. `python scripts/...2025.py ...` → confirm `state` column populated, poses unchanged.
2. `npm run dev` → scroll to the `robot2025` node.
3. Watch a full loop: active chip tracks transitions, history fades, readout line matches
   the CSV's state sequence (cross-check a few timestamps against the CSV).
4. Confirm no FPS drop (transitions only redraw; check the Tune-Mode-style frame budget).
5. Confirm the tower stays above the robot through its full path and across the loop seam.

**Effort:** ~0.5 day if the state key exists as a string; +0.5 day if ordinal mapping or
log re-selection is needed. Discovery (step 3.1) is the gating unknown — do it first.
