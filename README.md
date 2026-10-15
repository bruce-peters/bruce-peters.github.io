# brucepeters.dev

Bruce Peters' portfolio: a scrolling 3D scene (Three.js) with one section per project, built with React, Vite and Tailwind.

**Live:** https://brucepeters.dev

## Run it locally

Requires Node.js 20.19+ or 22.12+ (Vite 8).

```bash
git clone https://github.com/bruce-peters/bruce-peters.github.io
cd bruce-peters.github.io
npm ci
npm run dev        # http://localhost:5174
```

Production build:

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ locally
```

### Optional: Word Wiz live demo

One section embeds a live demo of [Word Wiz AI](https://wordwizai.com) that signs in to a demo account. Copy `.env.example` to `.env.local` and fill in the demo credentials to enable it. Without them the rest of the site works and the demo shows a "Demo credentials not configured." error when used. These values end up in the client bundle, so only use a throwaway demo account.

## Project structure

| Path | What's there |
|---|---|
| `src/data/projects.js` | All project content (titles, descriptions, links, screenshots, 3D positions) |
| `src/scene/` | Vanilla Three.js scene: camera path, 3D cards, robot/field models |
| `src/components/` | React UI: project cards, nav, résumé view, Desmos lab, Word Wiz demo |
| `src/anatomy/` | Animated SVG "anatomy" figures for the major projects |
| `public/` | Optimized models, screenshots, résumé PDF, robot log replays |
| `scripts/` | Asset pipeline: model/image optimization, robot log → replay JSON, anatomy figure builds |

See `CLAUDE.md` for architecture details and the asset pipeline commands.

## Deployment

- `brucepeters.dev` is served by Vercel.
- `.github/workflows/deploy.yml` also publishes `main` to GitHub Pages (`bruce-peters.github.io`). It runs `npm ci`, so `package-lock.json` must stay in sync with `package.json`. After changing dependencies, run `npm install` and commit the updated lockfile.
