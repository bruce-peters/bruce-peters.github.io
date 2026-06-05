// Lazy Web Audio manager. Synthesizes all sounds to avoid shipping audio assets.
// Context created only on first unmute (respects browser autoplay policy).
// Muted by default — sound is never sprung on the visitor.

let ctx = null
let masterGain = null
let muted = (() => {
  try { return localStorage.getItem('audio-muted') !== 'false' } catch { return true }
})()

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.35
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const sounds = {
  // Soft mechanical thunk when a section snaps active
  snap() {
    const c = getCtx()
    const now = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1)
    g.gain.setValueAtTime(0.45, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
    osc.connect(g); g.connect(masterGain)
    osc.start(now); osc.stop(now + 0.15)
  },
  // Faint tick on dot-rail / nav click
  tick() {
    const c = getCtx()
    const now = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1100, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04)
    g.gain.setValueAtTime(0.22, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(g); g.connect(masterGain)
    osc.start(now); osc.stop(now + 0.07)
  },
  // Subtle whoosh synced to external-link exit animation
  whoosh() {
    const c = getCtx()
    const now = c.currentTime
    const len = Math.floor(c.sampleRate * 0.35)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1800, now)
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.35)
    filter.Q.value = 1.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.18, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    src.connect(filter); filter.connect(g); g.connect(masterGain)
    src.start(now)
  },
}

export function play(name) {
  if (muted) return
  try { sounds[name]?.() } catch {}
}

export function setMuted(val) {
  muted = val
  if (!val && !ctx) {
    // First unmute is the gesture that creates and activates the context
    getCtx()
  } else if (masterGain) {
    masterGain.gain.value = val ? 0 : 0.35
  }
  if (!val && ctx?.state === 'suspended') ctx.resume()
  try { localStorage.setItem('audio-muted', String(val)) } catch {}
}

export function isMuted() { return muted }
