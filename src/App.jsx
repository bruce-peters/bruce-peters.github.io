import { useState, useEffect, useRef, useCallback } from 'react'
import { PROJECTS } from './data/projects.js'
import { initScene } from './scene/scene.js'
import IdentityBlock from './components/IdentityBlock.jsx'
import NavBlock from './components/NavBlock.jsx'
import DotRail from './components/DotRail.jsx'
import ProjectSection from './components/ProjectSection.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import TuneMode from './components/TuneMode.jsx'

const isLocalhost = window.location.hostname === 'localhost'

export default function App() {
  const [activeProject, setActiveProject] = useState(PROJECTS[0])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [tuneMode, setTuneMode] = useState(false)
  const [editorState, setEditorState] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [exiting, setExiting] = useState(false)
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const sectionRefs = useRef([])

  const handleProjectChange = useCallback((project, index) => {
    setActiveProject(project)
    setActiveIndex(index)
  }, [])

  // Init the 3D background scene
  useEffect(() => {
    if (!containerRef.current) return
    try {
      const scene = initScene(containerRef.current, handleProjectChange, () => setLoaded(true))
      sceneRef.current = scene
      return () => scene.destroy()
    } catch (e) {
      setError(e.message + '\n' + e.stack)
    }
  }, [handleProjectChange])

  // Drive the background camera from the document scroll position.
  // nodeFloat ∈ [0, N-1] is interpolated from where the viewport center sits
  // between adjacent section centers, so the camera eases between projects.
  useEffect(() => {
    let raf = null
    const compute = () => {
      raf = null
      const secs = sectionRefs.current.filter(Boolean)
      if (secs.length === 0) return
      const vpCenter = window.scrollY + window.innerHeight / 2
      const centers = secs.map(el => {
        const r = el.getBoundingClientRect()
        return r.top + window.scrollY + r.height / 2
      })

      let node
      if (vpCenter <= centers[0]) node = 0
      else if (vpCenter >= centers[centers.length - 1]) node = centers.length - 1
      else {
        node = centers.length - 1
        for (let i = 0; i < centers.length - 1; i++) {
          if (vpCenter >= centers[i] && vpCenter <= centers[i + 1]) {
            node = i + (vpCenter - centers[i]) / (centers[i + 1] - centers[i])
            break
          }
        }
      }
      sceneRef.current?.setScroll(node)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(compute) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    compute()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Dot-rail / nav → scroll the matching section into view
  const goToIndex = useCallback((i) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const openExternalLink = useCallback((href) => {
    setExiting(true)
    sceneRef.current?.startExitAnimation(() => {
      window.open(href, '_blank', 'noopener,noreferrer')
      setTimeout(() => setExiting(false), 200)
    })
  }, [])

  // Tune mode toggle (Shift+T) — localhost only
  useEffect(() => {
    if (!isLocalhost) return
    const onKey = (e) => {
      if (e.key === 'T' && e.shiftKey) {
        setTuneMode(prev => {
          if (prev) {
            sceneRef.current?.exitTuneMode()
            setEditorState(null)
            setSelectedId(null)
            return false
          } else {
            sceneRef.current?.enterTuneMode(setEditorState, setSelectedId)
            return true
          }
        })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const enterTune = useCallback(() => {
    sceneRef.current?.enterTuneMode(setEditorState, setSelectedId)
    setTuneMode(true)
  }, [])

  const exitTune = useCallback(() => {
    sceneRef.current?.exitTuneMode()
    setTuneMode(false)
    setEditorState(null)
    setSelectedId(null)
  }, [])

  if (error) {
    return (
      <div style={{ color: 'red', padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
        ERROR: {error}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {/* Fixed 3D background */}
      <div ref={containerRef} id="scene-container" />

      {/* Readability scrim — keeps cards legible over a busy scene */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(16,16,18,0.55) 100%)' }}
      />

      {/* Fixed chrome */}
      <IdentityBlock />
      <NavBlock onExternalLink={openExternalLink} />
      <DotRail activeIndex={activeIndex} goToIndex={goToIndex} />

      {/* White flash overlay for external link transitions */}
      <div
        className="fixed inset-0 z-[100] bg-white pointer-events-none"
        style={{
          opacity: exiting ? 1 : 0,
          transition: exiting ? 'opacity 700ms ease-in' : 'opacity 500ms ease-out',
        }}
      />

      {/* Scrolling content — one section per project node */}
      <main className="relative z-10">
        {PROJECTS.map((p, i) => (
          <ProjectSection
            key={p.id}
            ref={el => { sectionRefs.current[i] = el }}
            project={p}
            side={i % 2 === 0 ? 'left' : 'right'}
            onExternalLink={openExternalLink}
            goToIndex={goToIndex}
          />
        ))}
      </main>

      {isLocalhost && <TuneMode
        tuneMode={tuneMode}
        editorState={editorState}
        onEnter={enterTune}
        onExit={exitTune}
        scene={sceneRef.current}
        goToIndex={goToIndex}
        activeProject={activeProject}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />}
      <LoadingScreen loaded={loaded} />
    </div>
  )
}
