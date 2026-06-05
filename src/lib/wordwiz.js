const BASE = 'https://api.wordwizai.com'

// Module-level cache: one token + one session reused across all demo attempts.
let tokenPromise = null
let sessionPromise = null

// ─── Auth ────────────────────────────────────────────────────────────────────

async function fetchToken() {
  const user = import.meta.env.VITE_WORDWIZ_DEMO_USER
  const pass = import.meta.env.VITE_WORDWIZ_DEMO_PASS
  if (!user || !pass) throw new ApiError('Demo credentials not configured.', 0)

  const body = new URLSearchParams({ username: user, password: pass })
  const res = await fetch(`${BASE}/auth/token?remember_me=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new ApiError(`Auth failed (${res.status})`, res.status)
  const data = await res.json()
  return data.access_token
}

// Lazy, memoized — concurrent callers share the same promise.
export function login() {
  if (!tokenPromise) tokenPromise = fetchToken().catch(e => { tokenPromise = null; throw e })
  return tokenPromise
}

function clearAuth() {
  tokenPromise = null
  sessionPromise = null
}

// ─── Session bootstrap ───────────────────────────────────────────────────────

async function fetchSession(token) {
  const actRes = await authFetch('/activities/', token)
  if (!actRes.ok) throw new ApiError(`Activities fetch failed (${actRes.status})`, actRes.status)
  const activities = await actRes.json()
  if (!activities.length) throw new ApiError('No activities found on demo account.', 0)

  // Prefer "unlimited" activity (id=1 typically); fall back to first available.
  const activity =
    activities.find(a => a.activity_type === 'unlimited') ||
    activities.find(a => a.activity_type === 'free_read') ||
    activities[0]

  const sesRes = await authFetch('/session/', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_id: activity.id }),
  })
  if (!sesRes.ok) throw new ApiError(`Session create failed (${sesRes.status})`, sesRes.status)
  const session = await sesRes.json()
  return session.id
}

// Lazy, memoized — one session reused across all demo recordings.
export function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = login()
      .then(token => fetchSession(token))
      .catch(e => { sessionPromise = null; throw e })
  }
  return sessionPromise
}

// ─── Fetch helper ────────────────────────────────────────────────────────────

function authFetch(path, token, opts = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
}

// ─── Analysis ────────────────────────────────────────────────────────────────
// The backend streams results as Server-Sent Events (SSE).
// Each line: `data: {"type": "...", "data": {...}}`
// Known event types: processing_started, processing_mode, results, error.

// onProgress(type, data) is called for each non-final SSE event so the UI can
// show live pipeline steps.
export async function analyze(attemptedSentence, audioBlob, onProgress) {
  let token = await login()
  let sessionId = await ensureSession()

  const res = await _doAnalyze(attemptedSentence, audioBlob, token, sessionId)

  // 401 mid-session: re-auth + re-session once, then retry.
  if (res.status === 401) {
    clearAuth()
    token = await login()
    sessionId = await ensureSession()
    const retry = await _doAnalyze(attemptedSentence, audioBlob, token, sessionId)
    return parseSSEResponse(retry, onProgress)
  }

  return parseSSEResponse(res, onProgress)
}

async function _doAnalyze(sentence, blob, token, sessionId) {
  const form = new FormData()
  form.append('attempted_sentence', sentence)
  form.append('session_id', String(sessionId))
  // File name matters less than Content-Type; WAV is most reliable.
  form.append('audio_file', blob, 'recording.wav')
  return fetch(`${BASE}/ai/analyze-audio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    // Do NOT set Content-Type — browser sets multipart boundary automatically.
    body: form,
  })
}

// Parse the SSE stream and return the final normalized results.
async function parseSSEResponse(res, onProgress) {
  if (!res.ok && res.status !== 200) {
    throw new ApiError(`Analyze failed (${res.status})`, res.status)
  }

  const text = await res.text()
  const lines = text.split('\n')

  let finalData = null
  let feedbackText = null
  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    let event
    try { event = JSON.parse(line.slice(5).trim()) } catch { continue }

    const { type, data } = event
    if (type === 'analysis') {
      finalData = data
    } else if (type === 'feedback') {
      feedbackText = data?.text ?? null
    } else if (type === 'error') {
      const msg = data?.message || 'Analysis failed.'
      if (msg.includes('SNR') || msg.includes('audio quality') || msg.includes('no speech')) {
        throw new ApiError('Audio quality too low — speak clearly and closer to your mic.', 400)
      }
      throw new ApiError(msg, 400)
    } else if (type === 'processing_started' || type === 'processing_mode') {
      onProgress?.(type, data)
    }
    // audio_feedback_file events are ignored (TTS audio blob — not needed in portfolio)
  }

  if (!finalData) throw new ApiError('No results received from the server.', 0)
  return { ...normalize(finalData), feedback: feedbackText }
}

// ─── Normalization ────────────────────────────────────────────────────────────
// Converts the raw `results` SSE event data to the stable shape the UI uses.
// UPDATE this function once a live successful probe reveals the exact shape.
//
// Stable UI shape:
//   { words: [{ text: string, correct: boolean, phonemes: [{ symbol: string, ok: boolean, actual?: string }] }] }
//
// Probe hint: after Bruce configures CORS for bruce-peters.github.io, call the
// analyze endpoint with a real recording, save the raw SSE response to
// docs/wordwiz-sample-response.txt, and update this function to match.

// Raw shape from the `analysis` SSE event:
// {
//   pronunciation_dataframe: {
//     type:                 { "0": "substitution"|"match"|"deletion"|"insertion", ... }
//     ground_truth_word:    { "0": "she", "1": "sells", ... }
//     expected_phonemes:    { "0": ["ʃ","i"], ... }   ← target phonemes
//     actual_phonemes:      { "0": ["ð","a","ɪ"], ... }
//     missed:               { "0": [], "1": [], ... }  ← expected phonemes not spoken
//     added:                { "0": ["ð"], ... }        ← extra phonemes spoken
//     substituted:          { "0": [["ʃ","a"],["i","ɪ"]], ... }  ← [expected,actual] pairs
//     per:                  { "0": 1.5, "1": 0.25, ... }  ← phoneme error rate (0=perfect)
//   },
//   per_summary: { sentence_per, total_phonemes, total_errors }
// }
export function normalize(raw) {
  if (Array.isArray(raw?.words)) return raw  // already normalized

  const df = raw?.pronunciation_dataframe
  if (!df) return { words: [], raw }

  const keys = Object.keys(df.ground_truth_word).sort((a, b) => Number(a) - Number(b))

  const words = keys
    .map(k => {
      const text = df.ground_truth_word[k]
      if (!text) return null  // skip insertion rows with no ground-truth word

      const per = df.per[k] ?? 0
      const expected = df.expected_phonemes[k] || []

      // Consume missed/substituted arrays to correctly handle duplicate phoneme symbols.
      const missedLeft = [...(df.missed[k] || [])]
      const subLeft = [...(df.substituted[k] || [])]  // [[exp, act], ...]

      const phonemes = expected.map(symbol => {
        const mIdx = missedLeft.indexOf(symbol)
        if (mIdx >= 0) {
          missedLeft.splice(mIdx, 1)
          return { symbol, ok: false, actual: null }
        }
        const sIdx = subLeft.findIndex(([exp]) => exp === symbol)
        if (sIdx >= 0) {
          const actual = subLeft[sIdx][1]
          subLeft.splice(sIdx, 1)
          return { symbol, ok: false, actual }
        }
        return { symbol, ok: true }
      })

      return { text, correct: per === 0, phonemes }
    })
    .filter(Boolean)

  return { words, raw }
}

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
