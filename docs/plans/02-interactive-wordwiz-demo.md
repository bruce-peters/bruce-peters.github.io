# Feature Plan — Interactive Word Wiz Demo (inline, live backend)

> Let a visitor read a sentence aloud into their mic and watch Bruce's real phoneme
> pipeline (`api.wordwizai.com`) flag the exact sounds they missed — the single strongest
> "this person ships real ML systems" moment on the site.

---

## 1. Goal & "wow" target

At the Word Wiz (`reader`) node, a DOM panel shows a sentence. Visitor taps **Read aloud**,
speaks, and within ~2s the words light up: correctly-read words in cream, mis-pronounced
words tinted, and the **specific phoneme** they missed surfaced (`HOSE` vs `HOUSE`, with the
offending sound highlighted). It runs against the live production backend with a
pre-provisioned demo account — no signup, no friction.

This is the project's deepest substance signal. It belongs inline, not behind the
`wordwizai.com` CTA.

---

## 2. Reality check on difficulty

The user is right that it's tractable, and the endpoints are now **documented** (see §3,
pulled from `api.wordwizai.com/openapi.json`). The work is (a) wiring the known auth → session
→ analyze chain, (b) a demo credential that auto-signs-in, (c) a React component that records
audio and renders the phoneme response. No backend changes needed beyond creating a demo
account (and possibly a CORS allowance — see §3.5/§8).

The CLAUDE.md/textures already hint a reader demo was once envisioned: `phonemeCardTexture`,
`recordingPillTexture`, `statusPillTexture` exist in `src/scene/textures.js`. Those were for
a 3D version; this plan builds a **DOM** version (cleaner for forms, mic permissions, and
accessibility), consistent with "the DOM owns all prose" from CLAUDE.md.

---

## 3. API contract (resolved from `api.wordwizai.com/openapi.json`)

The backend is a FastAPI app. Base URL: `https://api.wordwizai.com`. Confirmed contract:

### 3.1 Auth — `POST /auth/token`
- **Content-Type:** `application/x-www-form-urlencoded` (OAuth2 password flow — **not** JSON).
- **Body fields:** `username` *(req)*, `password` *(req)*, plus optional
  `grant_type`/`scope`/`client_id`/`client_secret`. Optional query param `remember_me=true`
  (extends token lifetime — use it for the demo).
- **Returns** `Token`: `{ access_token: string, token_type: string }` (Bearer/JWT).
- **Auth scheme:** `OAuth2PasswordBearer` → all protected calls send
  `Authorization: Bearer <access_token>`.
- Account creation: `POST /auth/register` (JSON `{ username, email, password, full_name }`)
  → `UserResponse`. Easiest to just register the demo account once via the live site UI.

### 3.2 The analyze flow needs a **session**, which needs an **activity**
`/ai/analyze-audio` requires a `session_id`, and a session requires an `activity_id`. So the
demo's first-use bootstrap is a 3-step chain (all `Authorization: Bearer`):

1. `GET /activities/` → `ActivityOut[]` — each `{ id, title, activity_type, target_phoneme,
   activity_settings, ... }`. Pick a suitable pronunciation/free-read activity's `id`.
   (Alternatively hardcode a known `activity_id` once discovered, to skip this call.)
2. `POST /session/` JSON `{ activity_id }` → `SessionOut` `{ id, activity_id, user_id,
   created_at, is_completed, activity }`. **Create one session and reuse its `id`** for all
   demo recordings (don't create a session per attempt).
3. `POST /ai/analyze-audio` (see below) with that `session_id`.

### 3.3 Audio analysis — `POST /ai/analyze-audio` *(use this one)*
- **Content-Type:** `multipart/form-data`.
- **Form fields (all required):**
  - `attempted_sentence: string` — the target sentence the user is reading.
  - `session_id: integer` — from step 3.2.
  - `audio_file: binary` — the recorded audio blob.
- **Response:** ⚠️ **the only remaining unknown.** This endpoint declares no FastAPI
  `response_model`, so the 200 body shape is **absent from the OpenAPI spec**. The per-word /
  per-phoneme result structure that drives the UI must be captured from **one live call**
  (with the demo token) or from the Word Wiz repo. *This is the one thing to nail before
  building the results UI* — see §3.5.

### 3.4 Richer variant — `POST /ai/analyze-audio-with-phonemes` *(skip for v1)*
Same as above plus required `client_phonemes: string` (and optional `client_words`) — the
client must supply the expected phoneme string for the target sentence (client-side G2P).
More moving parts; **the plain `/ai/analyze-audio` is the demo path.** Revisit only if the
plain endpoint's response lacks the phoneme detail we want to visualize.

### 3.5 The one live probe to run before building the UI
With the demo creds, run the full chain once and **save the raw `analyze-audio` JSON** to
`docs/wordwiz-sample-response.json`. That single artifact defines the results UI. Suggested
probe (manual, one-off):
```
# 1. token
curl -s -X POST https://api.wordwizai.com/auth/token \
  -d 'username=DEMO_USER&password=DEMO_PASS&remember_me=true'
# 2. activities  → pick an id   3. session → get id   4. analyze with a sample wav
curl -s -X POST https://api.wordwizai.com/ai/analyze-audio \
  -H "Authorization: Bearer $TOK" \
  -F attempted_sentence='the cat sat' -F session_id=$SID -F audio_file=@sample.wav
```
Also note from this probe: the **CORS** headers (`Access-Control-Allow-Origin`) on the
responses — confirm they permit the portfolio origin (GitHub Pages domain + `localhost`).
If absent, that's a one-line backend change Bruce controls; flag as a dependency (see §8).

### 3.6 Sentence source
The API is activity/session-oriented; for the portfolio demo, **hardcode 2–3 target
sentences** in the component and pass them as `attempted_sentence`. No need to consume the
activity's own sentence generation — keeps the demo to one call per attempt.

---

## 4. Credentials & security

- Create a **dedicated demo account** (e.g. `demo@wordwizai.com`) with throwaway data.
- The password **will be visible** in the client bundle — treat it as public. Mitigations:
  - Scope the demo account to read-only / demo data; rate-limit it server-side.
  - Do **not** reuse any real credential.
  - Optionally, put login behind a tiny serverless proxy later; for v1, embedding the demo
    creds is acceptable given the account is sandboxed.
- Put creds in an env-injected constant (`VITE_WORDWIZ_DEMO_USER` / `_PASS`) via Vite
  `import.meta.env`, with a committed `.env.example`. (Still public after build — this is
  for tidiness, not secrecy.)

---

## 5. Component architecture

New: `src/components/WordWizDemo.jsx` + a small `src/lib/wordwiz.js` API client.

### 5.1 `src/lib/wordwiz.js` (API client)

- `const BASE = 'https://api.wordwizai.com'`
- `login()` — `POST /auth/token` with **`application/x-www-form-urlencoded`** body
  (`username`, `password`, `remember_me=true`) — build it with `URLSearchParams`, **not**
  JSON. Cache `access_token` in a module variable + `sessionStorage`. Lazy + memoized: first
  caller triggers it, concurrent callers await the same promise.
- `ensureSession()` — lazy + memoized bootstrap: `GET /activities/` → pick an `activity_id`
  (or use a hardcoded known id) → `POST /session/ {activity_id}` → cache the returned
  `session.id`. Reused across all attempts. All calls send `Authorization: Bearer <token>`.
- `analyze(attemptedSentence, audioBlob)` — ensures token + session, then
  `POST /ai/analyze-audio` as `multipart/form-data` with fields `attempted_sentence`,
  `session_id`, `audio_file` (a `FormData` — **do not** set Content-Type manually; let the
  browser add the multipart boundary). Returns the JSON through a **normalizer** (see below).
- **Normalization layer** `normalize(raw)` → the UI's stable shape
  `{ words: [{ text, correct, phonemes: [{ symbol, ok }] }] }`. The raw shape comes from the
  §3.5 live probe; only this function touches it, so an API change is a one-spot fix.
- Robust errors: network, **401 → re-`login()` once then retry**, 4xx/5xx → typed error for
  the UI. A 401 can also mean the cached session belongs to an expired token — clear the
  session cache on re-login.

### 5.2 `src/components/WordWizDemo.jsx`

State machine: `idle → recording → uploading → results → error`.

- **Mic capture:** `navigator.mediaDevices.getUserMedia({ audio })` + `MediaRecorder`.
  Record to the format the API wants. If it wants WAV but MediaRecorder gives WebM/Opus,
  either (a) send WebM if the backend's ASR accepts it, or (b) decode via `AudioContext`
  and re-encode to 16-kHz mono WAV (small inline encoder). Confirm in discovery (step 3).
- **UI states:**
  - `idle`: target sentence rendered word-by-word in `font-display`; primary green
    **Read aloud** pill (matches `ProjectCard` CTA styling, `ProjectCard.jsx:121`).
  - `recording`: live mic level meter (from an `AnalyserNode`), a "Recording…" pill
    (mirror `recordingPillTexture` visual in DOM), **Stop** button, auto-stop on silence
    (~1.5 s) as a nicety.
  - `uploading`: skeleton/"analyzing…" shimmer; this is the ~2 s window — show the pipeline
    steps (`aligning phonemes → scoring`) to make latency feel intentional.
  - `results`: each word colored by `correct`; click/hover a flagged word to expand its
    phoneme breakdown using the `/bp/` phoneme treatment (big phoneme glyph + "as in" +
    waveform, à la `phonemeCardTexture`). One mis-phoneme highlighted in `magenta`
    (the "one hot phoneme per view" rule from CLAUDE.md).
  - `error`: graceful message + retry; mic-denied gets a specific "enable mic" hint.
- **Replay / try again:** keep the recorded blob so the user can re-listen and re-record.

### 5.3 Mounting it

The Word Wiz section is rendered by `ProjectSection` → `ProjectCard` for `id === 'reader'`.
Options:
- **A (recommended):** render `<WordWizDemo>` *inside* the reader section, below the normal
  `ProjectCard` prose — an expandable "Try it live" panel that lazy-mounts on first
  in-view (reuse `useInView`, as `ProjectCard.jsx:9` does) so the mic/SDK code and any login
  only fire when the user scrolls there, not on page load.
- **B:** a dedicated CTA ("Try the demo") that expands the panel — even lazier, zero work
  until intent. Pairs well with A.

Defer the `login()` call until the user clicks **Read aloud** the first time (not on mount)
— avoids hammering the backend for every page visit and keeps the demo account's rate limit
healthy.

---

## 6. Design-system mapping

| Element | Token / pattern |
|---|---|
| Target sentence | `font-display`, `text-fg` |
| Correct word | `text-cream` |
| Missed word | `text-coral` (warm "human" miss) or `text-magenta` for the single worst |
| Phoneme glyph | big `font-display`, `text-accent`, "as in" in `font-mono text-dim` |
| Record button | green pill, copy of `ProjectCard` primary CTA |
| Recording pill | `magenta`/coral dot + mono label, pill radius |
| Panel container | match `ProjectCard` glass: `rgba(22,22,25,0.82)`, `backdrop-blur`, `border-line`, `rounded-[14px]` |
| Mic level meter | `accent` bar, `line` track |

---

## 7. File-by-file change list

| File | Change |
|---|---|
| `docs/wordwiz-sample-response.json` *(new)* | Raw `/ai/analyze-audio` 200 body from the §3.5 probe — defines the results UI. |
| `.env.example` / Vite env | `VITE_WORDWIZ_DEMO_USER`, `VITE_WORDWIZ_DEMO_PASS`. |
| `src/lib/wordwiz.js` *(new)* | Memoized `login()` (form-encoded) + `ensureSession()` + `analyze()` (multipart) + `normalize()` + typed errors. |
| `src/components/WordWizDemo.jsx` *(new)* | Recorder + state machine + phoneme results UI. |
| `src/components/ProjectSection.jsx` | Render `<WordWizDemo>` for `project.id === 'reader'` (lazy on in-view). |
| `src/data/projects.js` *(optional)* | A `demoSentences` field on the reader entry, or keep sentences in the component. |

---

## 8. Edge cases & risks

- **Unknown response shape** → the single open contract item (`/ai/analyze-audio` has no
  documented `response_model`). Resolve via the §3.5 live probe *before* building the results
  UI; the `normalize()` adapter quarantines it.
- **CORS blocked** → demo can't call the API from the portfolio origin. *Hard dependency*;
  confirm via the §3.5 probe. Fix is server-side (Bruce controls it) or a tiny proxy.
- **Mic permission denied / no mic** → explicit fallback: offer a **pre-recorded sample**
  that plays a canned audio blob through `analyze()` so the wow still lands without a mic.
  (Also the demo path for the recruiter on a locked-down work laptop.)
- **Audio format mismatch** → likely failure mode: `audio_file` may need WAV while
  MediaRecorder yields WebM/Opus. Confirm via the §3.5 probe; include the 16-kHz-mono WAV
  re-encode fallback (`AudioContext` decode + inline encoder) if the backend rejects WebM.
- **Session lifecycle** → reuse one session id; on 401 clear both token and session caches,
  re-`login()`, re-`ensureSession()`, retry once.
- **Latency / cold starts** → the AWS backend may cold-start. Show honest progress; consider
  a warm-up `login()`/ping when the panel scrolls into view (before the user clicks record).
- **Demo account abuse** → public creds. Sandbox + server rate-limit; rotate if abused.
- **Token expiry mid-session** → `analyze()` retries `login()` once on 401.
- **Mobile Safari MediaRecorder quirks** → test iOS; may need `audio/mp4` mime. Feature-detect
  and pick a supported `mimeType`; fall back to the pre-recorded sample if recording is
  unsupported.
- **Bundle weight** → keep the client dependency-free (native `fetch`, `MediaRecorder`,
  `AudioContext`); no SDK. Lazy-mount so it never touches the critical loading path.

---

## 9. Verification

1. **§3.5 probe done:** the `token → activities → session → analyze-audio` curl chain returns
   200 with a parseable body, saved to `docs/wordwiz-sample-response.json`; CORS headers
   confirmed for the portfolio origin.
2. `npm run dev` → scroll to reader node → panel lazy-mounts; no network until interaction.
3. Click **Read aloud**, speak the sentence correctly → all words cream.
4. Mispronounce one word → that word tints, phoneme breakdown highlights the right sound.
5. Deny mic → pre-recorded sample path works end-to-end.
6. Throttle network (DevTools) → progress states read as intentional, errors recover.
7. Test on mobile Safari + Chrome.

**Effort:** ~1–1.5 days. The contract is now known; the only gating unknown is the
`analyze-audio` response shape + audio format, both settled by the §3.5 probe. The UI is
straightforward once `normalize()` returns the stable shape.
