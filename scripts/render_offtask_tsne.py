"""Renders the off-task project's 3D card image: the paper's t-SNE figure (hand-built features,
over 6,000 labeled windows from 23 student-sessions) redrawn in /bp/ colors.

The embedding is the paper's own. Sampling, features and t-SNE settings are imported from
gaze-analyzing/offtask_composite/poster/tsne_embedding.py, so the layout matches the published
figure. The first run caches the 2D points, an anonymous session index and the label in
assets-src/offtask/tsne.npz (no video ids, which carry real names), and later runs restyle from
that cache without the research repo.

Run with the research repo's venv the first time:
  ..\\gaze-analyzing\\.venv\\Scripts\\python.exe scripts/render_offtask_tsne.py
Then `npm run optimize:images` turns assets-src/screenshots/offtask-tsne.png into the webp.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "assets-src" / "offtask" / "tsne.npz"
OUT = ROOT / "assets-src" / "screenshots" / "offtask-tsne.png"

# The 3D card's image panel is 972x588 and crops to fill, so draw at exactly that aspect (2x).
W_PX, H_PX, DPI = 1944, 1176, 200

# /bp/ tokens (tailwind.config.js)
BG = "#0c0c0e"        # card image panel fill in textures.js
LINE = "#26262b"
DIM = "#9a958b"
DIM2 = "#6f6b62"
FG = "#f4f0e8"
REST = "#3a3935"      # windows from sessions that are not highlighted
ON_TASK = DIM2        # on-task recedes so off-task reads against it
OFF_TASK = "#e63b6d"  # magenta: the one hot color in the view

# Left panel highlights every eighth session in sorted order (S1, S9, S17) instead of the
# cleanest clusters, and greys the rest. 23 hues were confetti at card size. Lime, violet and
# coral pass the dataviz validator's CVD and normal-vision checks as a set (worst all-pairs
# deutan dE 15). They sit above its dark lightness band on purpose, since stepping them down
# into it drops lime vs coral to dE 4.9 for deuteranopes.
HIGHLIGHT = {0: "#c7ee5e", 8: "#9b8cff", 16: "#ec9576"}


def compute(research_repo: Path) -> None:
    sys.path.insert(0, str(research_repo))
    import pandas as pd
    from offtask_composite.poster.tsne_embedding import RUN_DIR, _embed, _stratified_sample

    full = pd.read_csv(RUN_DIR / "analysis" / "results_analyzed.csv", low_memory=False)
    lab = full[full["label_primary"].isin(["on_task", "off_task"])]
    sample = _stratified_sample(lab)
    participant = sample["video_id"] + " / " + sample["student_id"]
    order = {p: i for i, p in enumerate(sorted(participant.unique()))}
    emb = _embed(sample)
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        CACHE,
        xy=emb.astype(np.float32),
        session=participant.map(order).to_numpy(np.int16),
        off_task=(sample["label_primary"] == "off_task").to_numpy(),
    )
    print(f"cached {len(emb):,} windows across {len(order)} student-sessions -> {CACHE}")


def render() -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    d = np.load(CACHE)
    xy, session, off = d["xy"], d["session"], d["off_task"]
    n_sessions = int(session.max()) + 1

    plt.rcParams.update({
        "font.family": "monospace",
        "font.monospace": ["Cascadia Mono", "Consolas", "DejaVu Sans Mono"],
    })
    fig = plt.figure(figsize=(W_PX / DPI, H_PX / DPI), dpi=DPI, facecolor=BG)

    # Two plot areas side by side with a header row of mono labels above them. Each panel is
    # sized to the cloud's own aspect (equal x and y scale), and the header plus panels are
    # centered as one block, so there is no dead band between label and points.
    gutter, side, header, gap = 0.05, 0.03, 0.115, 0.035
    pw = (1 - 2 * side - gutter) / 2
    pad = 0.03 * (xy.max(0) - xy.min(0))
    lo, hi = xy.min(0) - pad, xy.max(0) + pad
    ph = pw * W_PX * (hi[1] - lo[1]) / (hi[0] - lo[0]) / H_PX
    bottom = (1 - (ph + gap + header)) / 2
    top = bottom + ph
    axes = [fig.add_axes([side + i * (pw + gutter), bottom, pw, ph]) for i in (0, 1)]

    # Same limits on both panels, so the two read as one embedding.
    for ax in axes:
        ax.set_facecolor(BG)
        ax.set_xlim(lo[0], hi[0])
        ax.set_ylim(lo[1], hi[1])
        ax.set_xticks([])
        ax.set_yticks([])
        for s in ax.spines.values():
            s.set_visible(False)

    dot = dict(s=9, linewidths=0)

    # Left: colored by student-session.
    ax = axes[0]
    rest = ~np.isin(session, list(HIGHLIGHT))
    ax.scatter(xy[rest, 0], xy[rest, 1], c=REST, alpha=0.9, **dot)
    for i, color in HIGHLIGHT.items():
        m = session == i
        ax.scatter(xy[m, 0], xy[m, 1], c=color, alpha=0.95, **dot)

    # Right: the same points colored by label, off-task drawn last so it is never buried.
    ax = axes[1]
    ax.scatter(xy[~off, 0], xy[~off, 1], c=ON_TASK, alpha=0.9, **dot)
    ax.scatter(xy[off, 0], xy[off, 1], c=OFF_TASK, alpha=0.95, **dot)

    # Header: what each panel is colored by, plus its key. Key dots are line markers, which
    # stay round in a non-square figure where a figure-space Circle would not.
    head = dict(fontsize=14, color=FG, va="baseline")
    key = dict(fontsize=12, color=DIM, va="baseline")
    y_key = top + gap
    y_head = y_key + 0.06
    x0 = side + 0.004
    x1 = side + pw + gutter + 0.004

    def legend(x, items):
        for label, color in items:
            fig.add_artist(plt.Line2D([x + 0.006], [y_key + 0.012], marker="o", markersize=8,
                                      markeredgewidth=0, color=color, transform=fig.transFigure))
            fig.text(x + 0.016, y_key, label, **key)
            x += 0.032 + 0.0105 * len(label)

    fig.text(x0, y_head, "BY STUDENT", **head)
    legend(x0, [(f"S{i + 1}", c) for i, c in HIGHLIGHT.items()] +
           [(f"other {n_sessions - len(HIGHLIGHT)}", REST)])
    fig.text(x1, y_head, "BY LABEL", **head)
    legend(x1, [("on-task", ON_TASK), ("off-task", OFF_TASK)])

    # Hairline between the panels.
    xm = side + pw + gutter / 2
    fig.add_artist(plt.Line2D([xm, xm], [bottom, top + gap + header], color=LINE, linewidth=1.2))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=DPI, facecolor=BG)
    plt.close(fig)
    print(f"wrote {OUT}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--research-repo", type=Path, default=ROOT.parent / "gaze-analyzing")
    ap.add_argument("--recompute", action="store_true", help="redo the embedding")
    args = ap.parse_args()
    if args.recompute or not CACHE.exists():
        compute(args.research_repo)
    render()


if __name__ == "__main__":
    main()
