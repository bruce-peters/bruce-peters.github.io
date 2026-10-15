# Superstructure anatomy figure (pilot)

An isometric anatomy figure for the 2025 robot section (`robot2025`, work 06). It sits in its own plate above the project card, in the same 440px column. The 2025 card is 407px tall at 1440×900, so a plate around 400px tall keeps both on one screen.

## Source of truth

`Iron-Panthers/SIM-2025`, `src/main/java/frc/robot/subsystems/superstructure/Superstructure.java` at `0457264` (Apr 18 2025, branch `comp/worlds`), the last commit before Worlds. HEAD has the offseason BFS refactor, which is not what ran at Worlds.

- 14 states. Each sets an elevator target (inches), a pivot target (degrees) and a tongue target (servo degrees).
- Routing is hand-written next-hop rules, one per state. A step is taken only when `superstructureReachedTarget()` is true (elevator within 1 in, pivot within 0.01).
- Guards inside states:
  - TOP holds the pivot until the elevator passes 5 in.
  - PREVENT_TIPPING sends the elevator to 13 in while the pivot is between −60° and 90°, then to 31.6 in once the arm is past vertical. It hands off when the elevator is at target and the pivot is within 0.05 rot.
  - STOW sends the elevator to bottom once the pivot is below −0.27°, and holds it at 11.5 in if the pivot is below −100° with the elevator under 12 in.
  - SETUP_L3 holds the pivot until the elevator passes 32 in.
  - CLIMB holds the pivot until the elevator is between 4 and 27 in.
  - DESCORE_HIGH and DESCORE_LOW hold the elevator until the pivot passes −60°.
- SETUP_L4 → SCORE_L4 needs both tongue pole sensors (`pole1Detected && pole2Detected`).

Motion timing in the figure is approximate. Targets, routes and guards are exact.

## The machine

A miniature signal-box lever frame on a bench, wired through a cable trough to a bench model of the 2025 elevator and pivot.

- 13 levers, one per state (ZERO only runs at power-on). Each has a number plate, a lamp and an electric lever lock. A cut-open locking tray sits under the frame.
- Two indication lamps, `elev` and `pivot`. A lever lock releases only when both are lit.
- A small terminal screen on the frame types the route as it is worked, with the 1.05s caret.
- The mast has a carriage on bushings, a chain, and a motor with a gearbox at the base. The 25 in pivot arm carries the end effector and the servo tongue with two pole switches. The intake sits at the foot of the mast and a reef branch post stands where the tongue meets it at L4.
- One lit part (phosphor green) is the lever being worked. One magenta signal marks a lever lock that is holding.

## Interaction

Click a lever or press its number key to set the target state. An idle tour cycles STOW → L4 → STOW → L2 → INTAKE. Motion stops when the plate is offscreen. Reduced motion jumps straight to the final pose.

Plate corners read `// fig 06`, `superstructure interlock`, `pull a lever`, and a live readout such as `setup_l4 · 31.6 in · 144°`.

## Build

- `src/anatomy/superstructure/model.js` is a pure port of the Worlds state machine, shared by the build script and the page. `scripts/check-superstructure.mjs` asserts the routes against the Java.
- `scripts/build-anatomy.mjs` (`npm run build:anatomy`) draws the static art with the anatomy kit, writes a generated module, and runs the kit audit with `--audit`.
- `src/components/AnatomyPlate.jsx` is lazy-loaded. `ProjectSection` renders it above `ProjectCard` when a project has `anatomy`.
- Theme tokens are remapped to /bp/ inside the plate only (warm inks, phosphor green lit part, coral, lime and violet channels, JetBrains Mono, 14px radius). Dark only.

## Verification

Route check passes, `--audit` passes, the line-end check prints zero, and captures at 1440 and 390 wide plus 4× close-ups of every junction look right.
