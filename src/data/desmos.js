// Desmos graphs shown in the "desmos lab" node. Kept out of projects.js so the
// Tune Mode serializer (which rewrites projects.js) never drops them.
//
// `kind` is the desmos.com app the graph lives in ("calculator" or "3d") and
// `id` is the hash from its URL. `image` is a dark-mode capture made by
// scripts/capture-desmos.mjs; re-run that script after editing a graph.
// `featured` gets the big 2×2 tile.
export const DESMOS_GRAPHS = [
  {
    slug: "neural-net",
    title: "Neural Net",
    kind: "calculator",
    id: "ieebmdwnna",
    blurb:
      "draw a digit on a 16×16 grid and it tells you what you wrote. a 256 → 32 → 24 → 16 → 10 network trained on mnist, with all 9.5k weights stored as desmos lists and the forward pass written as plain math.",
    tag: "mlp · 9.5k weights",
    year: "2026",
    featured: true,
  },
  {
    slug: "tetris",
    title: "Tetris",
    kind: "calculator",
    id: "sqdgvulzzs",
    blurb:
      "playable tetris on a 10×20 board. pieces spawn, fall, collide, and stack off a single ticker, with on-screen buttons for controls.",
    tag: "game · ticker",
    year: "2025",
  },
  {
    slug: "boids",
    title: "Boids",
    kind: "calculator",
    id: "7800e621f5",
    blurb:
      "a flock that follows three rules (separation, alignment, cohesion). each boid's sight is drawn out so you can see what it's reacting to.",
    tag: "sim · flocking",
    year: "2025",
  },
  {
    slug: "cloth",
    title: "Cloth Simulation",
    kind: "calculator",
    id: "naape8wm9c",
    blurb:
      "a 6×6 grid of points held together by springs, with friction and elasticity. the four corners are draggable, so you can pull it around and watch it settle.",
    tag: "sim · springs",
    year: "2026",
  },
  {
    slug: "game-of-life",
    title: "Conway's Game of Life",
    kind: "calculator",
    id: "d812755892",
    blurb:
      "conway's game of life on a 50×50 grid. click cells to toggle them, then let it run.",
    tag: "cellular automaton",
    year: "2025",
  },
  {
    slug: "kinematics",
    title: "Kinematics",
    kind: "calculator",
    id: "a2acfa5411",
    blurb:
      "a procedural centipede. its legs plant and step on their own as the body chases a dot around the screen.",
    tag: "procedural animation",
    year: "2025",
  },
  {
    slug: "cube-game",
    title: "Cube Game",
    kind: "calculator",
    id: "zbc0s6jwna",
    blurb:
      "a 2d platformer. collisions get resolved with minimum translation vectors, the same trick real physics engines use.",
    tag: "game · mtv collision",
    year: "2025",
  },
  {
    slug: "text-renderer",
    title: "Text Renderer",
    kind: "calculator",
    id: "95b9787a40",
    blurb:
      "a font renderer with every letter from a to z built by hand out of curve points. the first note in the graph says \"this is a really bad idea.\"",
    tag: "font · a–z",
    year: "2025",
  },
  {
    slug: "waves",
    title: "Waves",
    kind: "calculator",
    id: "b06ea07a65",
    blurb:
      "a boat riding simulated waves, with the water surface recomputed every tick and the boat placed on top of it.",
    tag: "sim · water",
    year: "2025",
  },
  {
    slug: "waves-3d",
    title: "3D Waves",
    kind: "3d",
    id: "2f8a157044",
    blurb:
      "the waves sim rebuilt in desmos 3d, with the water as a full surface and the boat riding on it.",
    tag: "desmos 3d",
    year: "2025",
  },
  {
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    kind: "calculator",
    id: "ovidttqzxy",
    blurb:
      "two-player tic-tac-toe. click a square to play, and it checks all eight win lines and catches draws.",
    tag: "game · 2 player",
    year: "2026",
  },
  {
    slug: "concavity",
    title: "Concavity",
    kind: "calculator",
    id: "w9he7vjnfs",
    blurb:
      "drop a bunch of points and it wraps a hull around them, walking from point to point by angle. all of it is recursion, since desmos doesn't have loops.",
    tag: "geometry · recursion",
    year: "2026",
  },
].map((g) => ({
  ...g,
  href: `https://www.desmos.com/${g.kind}/${g.id}`,
  image: `/screenshots/desmos/${g.slug}.webp`,
}));
