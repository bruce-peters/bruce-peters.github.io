// The 2026 scouting app as the tube-station figure uses it. Pure JS, no DOM.
// Sources, all in Iron-Panthers/2026-scout:
//   roles          src/lib/matches.ts (roleToColumn): eight scouts a match
//   match clock    src/lib/useMatchTimer.ts: 160 s, phase starts, the 3 s
//                  hold between auto and teleop
//   shot keys      the quantitative form's +1 / +5 / +20 buttons
//   ranking        the qualitative form: drag the alliance's three robots
//                  best to worst
//   offline queue  src/lib/offlineStorage.ts (localStorage `offline_matches`),
//                  re-uploaded later from the Offline Matches page
//   live checks    ManagerDashboard.tsx: Supabase Realtime on
//                  scouting_submissions marks each role in as it lands
//   reminders      a pg_cron job pages each scout 5 minutes before a match

// Six scouts follow one robot each; two rank one alliance's three robots.
export const ROLES = [
  { key: 'red1', name: 'red 1', alliance: 'red', kind: 'robot' },
  { key: 'red2', name: 'red 2', alliance: 'red', kind: 'robot' },
  { key: 'red3', name: 'red 3', alliance: 'red', kind: 'robot' },
  { key: 'qualRed', name: 'red qual', alliance: 'red', kind: 'alliance' },
  { key: 'qualBlue', name: 'blue qual', alliance: 'blue', kind: 'alliance' },
  { key: 'blue1', name: 'blue 1', alliance: 'blue', kind: 'robot' },
  { key: 'blue2', name: 'blue 2', alliance: 'blue', kind: 'robot' },
  { key: 'blue3', name: 'blue 3', alliance: 'blue', kind: 'robot' },
]

export const MATCH_SECONDS = 160
export const AUTO_HOLD = 3 // s the clock holds at 20 s, between auto and teleop
export const PHASES = [
  [0, 'auto'],
  [20, 't-shift'],
  [30, 'shift 1'],
  [55, 'shift 2'],
  [80, 'shift 3'],
  [105, 'shift 4'],
  [130, 'endgame'],
]
export const SHOT_KEYS = [1, 5, 20]
export const REMIND_MINUTES = 5

export function phaseAt(t) {
  let name = PHASES[0][1]
  for (const [start, label] of PHASES) if (t >= start) name = label
  return name
}

// Countdown as the app shows it, m:ss from 2:40.
export function clockText(t) {
  const left = Math.max(0, Math.ceil(MATCH_SECONDS - t))
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}
