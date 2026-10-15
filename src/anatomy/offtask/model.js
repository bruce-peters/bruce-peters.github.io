// Published results of the off-task detection paper (submitted to LAK27),
// copied from Table 1 of gaze-analyzing/paper/main.tex. Only numbers that
// appear in the paper are used here; no per-window predictions, no session
// data, no names.
//
// Balanced accuracy on the fixed test set: trained on 11 hand-coded
// sessions, tested on 3 held-out kindergarten sessions, scored only on the
// 9,268 one-second windows where two independent coders agree (kappa 0.68).

export const CONTEXTS = [
  { key: 'all', name: 'all windows', windows: 9268, offTask: 9.5 },
  { key: 'instruction', name: 'teacher instruction', windows: 2614, offTask: 7.9 },
  { key: 'discussion', name: 'discussion', windows: 1896, offTask: 9.2 },
  { key: 'independent', name: 'independent work', windows: 2049, offTask: 5.8 },
  { key: 'speech', name: 'speech', windows: 6027, offTask: 9.8 },
  { key: 'quiet', name: 'quiet', windows: 3241, offTask: 8.9 },
]

// The four ways of watching, in the order they stand on the bench.
export const MODELS = [
  {
    key: 'dinov2',
    name: 'dinov2 + small head',
    short: 'dinov2',
    scores: [0.671, 0.779, 0.708, 0.722, 0.663, 0.695],
  },
  {
    // The best of the four classifiers trained on the 96 hand-built gaze,
    // head-pose, body-pose, object and speech features.
    key: 'features',
    name: 'hand-built features (random forest)',
    short: 'features',
    scores: [0.657, 0.683, 0.686, 0.71, 0.643, 0.695],
  },
  {
    key: 'gcn',
    name: 'pose graph network',
    short: 'pose graph',
    scores: [0.654, 0.682, 0.689, 0.749, 0.666, 0.638],
  },
  {
    // Zero-shot. Scored differently: pooled over the 18 student-sessions of
    // the whole corpus with readable output, not on the fixed test set, and
    // not broken down by context.
    key: 'vlm',
    name: 'zero-shot vision-language model',
    short: 'vlm',
    scores: [0.582, null, null, null, null, null],
  },
]

// Nearest-neighbour check on the hand-built features (main.tex, Sec. 5):
// 51% of windows sit next to another window of the same student-session,
// against 4% by chance.
export const SAME_STUDENT = 0.51
export const SAME_STUDENT_CHANCE = 0.04

// The meters read balanced accuracy from chance (0.5) to 0.8.
export const SCALE = [0.5, 0.8]
