import { useState, useRef, useEffect, useCallback } from 'react'
import { analyze, ensureSession, ApiError } from '../lib/wordwiz.js'
import useInView from '../hooks/useInView.js'

const DEMO_SENTENCES = [
  'The house is by the shore.',
  'She sells sea shells by the sea shore.',
  'The cat sat on the mat.',
]

// Pre-recorded sample blob (silent placeholder — replace with a real .webm
// recording so mic-denied visitors still see the results flow).
let SAMPLE_BLOB = null
async function getSampleBlob() {
  if (SAMPLE_BLOB) return SAMPLE_BLOB
  // Minimal 1-second silent WebM — allows the API chain to fire even without a mic.
  // Swap in a real audio clip recorded against DEMO_SENTENCES[0] for production.
  try {
    const res = await fetch('/demo-audio-sample.webm')
    if (res.ok) { SAMPLE_BLOB = await res.blob(); return SAMPLE_BLOB }
  } catch {}
  return null
}

// Supported MIME type for MediaRecorder — prefer WebM/Opus.
function getSupportedMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

// Decode any browser-recorded audio blob to a 16 kHz mono WAV blob.
// The backend only accepts WAV or MP3; MediaRecorder outputs WebM/Opus.
async function blobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, 16000) // dummy ctx just to decode
  let decoded
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer)
  } catch {
    // Already WAV or undecodable — pass through as-is.
    return blob
  }

  const TARGET_SR = 16000
  // Resample via OfflineAudioContext
  const offCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_SR), TARGET_SR)
  const src = offCtx.createBufferSource()
  src.buffer = decoded
  src.connect(offCtx.destination)
  src.start(0)
  const rendered = await offCtx.startRendering()

  const samples = rendered.getChannelData(0)
  return pcmToWav(samples, TARGET_SR)
}

function pcmToWav(samples, sampleRate) {
  const numSamples = samples.length
  const dataLen = numSamples * 2
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)

  const write = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  const wu16 = (o, v) => view.setUint16(o, v, true)
  const wu32 = (o, v) => view.setUint32(o, v, true)

  write(0, 'RIFF'); wu32(4, 36 + dataLen); write(8, 'WAVE')
  write(12, 'fmt '); wu32(16, 16); wu16(20, 1); wu16(22, 1)
  wu32(24, sampleRate); wu32(28, sampleRate * 2); wu16(32, 2); wu16(34, 16)
  write(36, 'data'); wu32(40, dataLen)

  let off = 44
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

const STATES = /** @type {const} */ ({
  IDLE: 'idle',
  RECORDING: 'recording',
  UPLOADING: 'uploading',
  RESULTS: 'results',
  ERROR: 'error',
})

export default function WordWizDemo() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [containerRef, inView] = useInView({ threshold: 0.1 })

  // Warm up login + session when panel scrolls into view (before user clicks).
  useEffect(() => {
    if (inView && panelOpen) ensureSession().catch(() => {})
  }, [inView, panelOpen])

  return (
    <div ref={containerRef} className="mt-5">
      {!panelOpen ? (
        <button
          onClick={() => setPanelOpen(true)}
          className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-bg bg-accent rounded-full px-[22px] py-2.5 border-0 cursor-pointer transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)]"
          style={{ pointerEvents: 'auto' }}
        >
          Try it live →
        </button>
      ) : (
        <DemoPanel onClose={() => setPanelOpen(false)} />
      )}
    </div>
  )
}

function DemoPanel({ onClose }) {
  const [phase, setPhase] = useState(STATES.IDLE)
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [results, setResults] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const [selectedWord, setSelectedWord] = useState(null)
  const [micDenied, setMicDenied] = useState(false)
  const [uploadStep, setUploadStep] = useState('')

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const streamRef = useRef(null)
  const warmStreamRef = useRef(null)  // pre-fetched stream so first click has no delay

  const sentence = DEMO_SENTENCES[sentenceIdx]

  // ── Pre-fetch mic on panel open ─────────────────────────────────────────────
  // getUserMedia blocks on the browser permission prompt. Requesting it now
  // (while the user is reading the sentence) means the stream is ready by the
  // time they click "Read aloud", eliminating the ~2 s perceived delay.
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(s => { if (!cancelled) warmStreamRef.current = s })
      .catch(() => {})  // permission denied — handled gracefully in startRecording
    return () => {
      cancelled = true
      warmStreamRef.current?.getTracks().forEach(t => t.stop())
      warmStreamRef.current = null
    }
  }, [])

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMicLevel()
      silenceTimerRef.current && clearTimeout(silenceTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Mic level animation ─────────────────────────────────────────────────────
  function startMicLevel(stream) {
    try {
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(buf)
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)
        setMicLevel(Math.min(1, rms / 80))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {}
  }

  function stopMicLevel() {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    setMicLevel(0)
  }

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setPhase(STATES.RECORDING)
    setResults(null)
    setSelectedWord(null)
    setErrorMsg('')
    chunksRef.current = []

    let stream
    // Use the pre-fetched warm stream if available; otherwise request now.
    if (warmStreamRef.current) {
      stream = warmStreamRef.current
      warmStreamRef.current = null
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        const denied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError'
        setMicDenied(denied)
        if (denied) {
          setPhase(STATES.UPLOADING)
          trySampleBlob(sentence)
          return
        }
        setErrorMsg('Could not access microphone.')
        setPhase(STATES.ERROR)
        return
      }
    }
    streamRef.current = stream

    startMicLevel(stream)

    const mime = getSupportedMime()
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    recorderRef.current = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stopMicLevel()
      stream.getTracks().forEach(t => t.stop())
      const raw = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
      // Backend requires WAV; decode and re-encode from whatever MediaRecorder gave us.
      const wav = await blobToWav(raw)
      submitAudio(wav)
    }

    recorder.start(100)

    // Auto-stop after 8 s max
    silenceTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    }, 8000)
  }, [sentence])

  const stopRecording = useCallback(() => {
    silenceTimerRef.current && clearTimeout(silenceTimerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submitAudio(blob) {
    setPhase(STATES.UPLOADING)
    setUploadStep('sending audio')
    try {
      const data = await analyze(sentence, blob, (type, data) => {
        if (type === 'processing_started') setUploadStep('transcribing audio')
        else if (type === 'processing_mode') setUploadStep('aligning phonemes')
      })
      setResults(data)
      setPhase(STATES.RESULTS)
    } catch (e) {
      setErrorMsg(e?.message || 'Something went wrong. Please try again.')
      setPhase(STATES.ERROR)
    }
  }

  async function trySampleBlob(sent) {
    const blob = await getSampleBlob()
    if (!blob) {
      setErrorMsg('Microphone access is required for the demo.')
      setPhase(STATES.ERROR)
      return
    }
    submitAudio(blob)
  }

  const reset = useCallback(() => {
    setPhase(STATES.IDLE)
    setResults(null)
    setSelectedWord(null)
    setErrorMsg('')
  }, [])

  const nextSentence = useCallback(() => {
    setSentenceIdx(i => (i + 1) % DEMO_SENTENCES.length)
    reset()
  }, [reset])

  return (
    <div
      className="relative overflow-hidden border border-line rounded-[14px] p-5 mt-1"
      style={{
        background: 'rgba(22,22,25,0.82)',
        backdropFilter: 'blur(22px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
          // live demo
        </span>
        <button
          onClick={onClose}
          className="font-mono text-[11px] text-dim hover:text-fg transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          ✕ close
        </button>
      </div>

      {/* Target sentence */}
      <div className="mb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim2 mb-2">read aloud:</p>
        <div className="font-display text-[clamp(18px,2.5vw,24px)] font-bold leading-[1.3] tracking-[-0.01em] text-fg flex flex-wrap gap-x-2 gap-y-1">
          {phase === STATES.RESULTS && results?.words
            ? <ResultWords words={results.words} onSelect={setSelectedWord} selectedWord={selectedWord} />
            : sentence.split(' ').map((w, i) => (
                <span key={i} className="text-fg">{w}</span>
              ))
          }
        </div>
      </div>

      {/* Phoneme detail card */}
      {selectedWord && phase === STATES.RESULTS && (
        <PhonemeCard word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {phase === STATES.IDLE && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-bg bg-accent rounded-full px-[20px] py-2 border-0 cursor-pointer transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)]"
          >
            ● Read aloud
          </button>
        )}

        {phase === STATES.RECORDING && (
          <RecordingPill level={micLevel} onStop={stopRecording} />
        )}

        {phase === STATES.UPLOADING && (
          <UploadingPill step={uploadStep} />
        )}

        {(phase === STATES.RESULTS || phase === STATES.ERROR) && (
          <>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-bg bg-accent rounded-full px-[20px] py-2 border-0 cursor-pointer transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)]"
            >
              Try again
            </button>
            <button
              onClick={nextSentence}
              className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-cream bg-transparent border border-line rounded-full px-[20px] py-2 transition-all duration-200 hover:border-accent hover:text-accent cursor-pointer"
            >
              Next sentence →
            </button>
          </>
        )}
      </div>

      {/* Error message */}
      {phase === STATES.ERROR && (
        <div className="mt-3 font-mono text-[12px] text-coral leading-[1.5]">
          {micDenied
            ? 'Mic access denied. Enable your microphone in browser settings to try the demo.'
            : errorMsg}
        </div>
      )}

      {/* Accuracy summary */}
      {phase === STATES.RESULTS && results?.words && (
        <AccuracySummary words={results.words} />
      )}

      {/* GPT coaching tip */}
      {phase === STATES.RESULTS && results?.feedback && (
        <div className="mt-3 flex gap-2.5 items-start border border-line rounded-[10px] px-4 py-3 bg-[rgba(16,16,18,0.6)]">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-violet mt-0.5 shrink-0">tip</span>
          <p className="font-display text-[13px] leading-[1.55] text-cream m-0">{results.feedback}</p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResultWords({ words, onSelect, selectedWord }) {
  return words.map((w, i) => {
    const isSelected = selectedWord?.text === w.text && selectedWord?._idx === i
    const hasPhonemes = w.phonemes?.length > 0
    const clickable = !w.correct && hasPhonemes

    return (
      <span
        key={i}
        onClick={() => clickable && onSelect({ ...w, _idx: i })}
        className={[
          'transition-colors duration-200',
          w.correct ? 'text-cream' : 'text-coral',
          clickable ? 'cursor-pointer underline decoration-dotted underline-offset-4 hover:text-magenta' : '',
          isSelected ? 'text-magenta' : '',
        ].join(' ')}
        title={clickable ? 'Click to see phoneme breakdown' : undefined}
      >
        {w.text}
      </span>
    )
  })
}

function PhonemeCard({ word, onClose }) {
  const bad = word.phonemes?.filter(p => !p.ok) || []
  const good = word.phonemes?.filter(p => p.ok) || []

  return (
    <div className="mb-4 border border-line rounded-[10px] p-4 bg-[rgba(16,16,18,0.8)]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim2">missed sounds in</span>
          <h3 className="font-display font-bold text-[22px] text-coral leading-none mt-1">{word.text}</h3>
        </div>
        <button onClick={onClose} className="font-mono text-[11px] text-dim hover:text-fg border-0 bg-transparent p-0 cursor-pointer">✕</button>
      </div>

      {bad.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {bad.map((p, i) => (
            <PhonemeChip key={i} phoneme={p} hot />
          ))}
        </div>
      )}

      {good.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {good.map((p, i) => (
            <PhonemeChip key={i} phoneme={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function PhonemeChip({ phoneme, hot }) {
  return (
    <div className={`flex flex-col items-center border rounded-[8px] px-3 py-2 ${hot ? 'border-magenta/40 bg-magenta/5' : 'border-line bg-[rgba(22,22,25,0.6)]'}`}>
      <span className={`font-display font-bold text-[20px] leading-none ${hot ? 'text-magenta' : 'text-accent'}`}>
        /{phoneme.symbol}/
      </span>
      {phoneme.actual && hot && (
        <span className="font-mono text-[9px] text-dim2 tracking-[0.1em] uppercase mt-1">
          said /{phoneme.actual}/
        </span>
      )}
      {!hot && (
        <span className="font-mono text-[9px] text-dim2 tracking-[0.1em] uppercase mt-1">correct</span>
      )}
    </div>
  )
}

function RecordingPill({ level, onStop }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 border border-magenta/40 rounded-full px-4 py-2 bg-magenta/5">
        <span
          className="inline-block w-2 h-2 rounded-full bg-magenta"
          style={{ opacity: 0.6 + level * 0.4, transform: `scale(${0.8 + level * 0.5})`, transition: 'transform 80ms, opacity 80ms' }}
        />
        <span className="font-mono text-[12px] text-magenta tracking-[0.08em]">Recording…</span>
        {/* Mic level bar */}
        <div className="w-16 h-1 rounded-full bg-line overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-75"
            style={{ width: `${level * 100}%` }}
          />
        </div>
      </div>
      <button
        onClick={onStop}
        className="font-mono font-bold text-[13px] text-cream bg-transparent border border-line rounded-full px-[18px] py-2 hover:border-fg transition-all cursor-pointer"
      >
        Stop
      </button>
    </div>
  )
}

function UploadingPill({ step }) {
  return (
    <div className="flex items-center gap-2 border border-line rounded-full px-4 py-2">
      <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
      <span className="font-mono text-[12px] text-dim tracking-[0.08em]">
        {step || 'analyzing'}…
      </span>
    </div>
  )
}

function AccuracySummary({ words }) {
  const total = words.length
  const correct = words.filter(w => w.correct).length
  const pct = total ? Math.round((correct / total) * 100) : 0
  const color = pct >= 80 ? 'text-accent' : pct >= 50 ? 'text-lime' : 'text-coral'

  return (
    <div className="mt-3 flex items-center gap-3">
      <span className={`font-display font-bold text-[22px] leading-none ${color}`}>{pct}%</span>
      <span className="font-mono text-[11px] text-dim tracking-[0.1em] uppercase">
        {correct}/{total} words correct
        {!words.some(w => !w.correct) ? ' — perfect!' : ' — tap a highlighted word for phoneme detail'}
      </span>
    </div>
  )
}
