import { useState, useEffect, useRef, useCallback } from 'react'
import { PROJECTS } from './data/projects.js'
import { initScene } from './scene/scene.js'
import IdentityBlock from './components/IdentityBlock.jsx'
import NavBlock from './components/NavBlock.jsx'
import Hero from './components/Hero.jsx'
import DotRail from './components/DotRail.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import Counter from './components/Counter.jsx'
import Instructions from './components/Instructions.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import TuneMode from './components/TuneMode.jsx'

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

  const handleProjectChange = useCallback((project, index) => {
    setActiveProject(project)
    setActiveIndex(index)
  }, [])

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

  const goToIndex = useCallback((i) => {
    sceneRef.current?.goToIndex(i)
  }, [])

  const openExternalLink = useCallback((href) => {
    setExiting(true)
    sceneRef.current?.startExitAnimation(() => {
      window.open(href, '_blank', 'noopener,noreferrer')
      setTimeout(() => setExiting(false), 200)
    })
  }, [])

  // Tune mode toggle (Shift+T)
  useEffect(() => {
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
    <div className="relative w-full h-full">
      <div ref={containerRef} id="scene-container" className="fixed inset-0 z-0" />

      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[5]"
        style={{ opacity: 0.06 }}
      >
        <div className="relative w-0 h-0">
          <div className="absolute bg-fg" style={{ width: '1px', height: '240px', top: '-120px', left: '0' }} />
          <div className="absolute bg-fg" style={{ width: '240px', height: '1px', top: '0', left: '-120px' }} />
        </div>
      </div>

      <div
        id="auto-playback-hud"
        className="hidden fixed bottom-7 right-7 z-20 px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase border border-dim/40 text-dim bg-black/40 backdrop-blur-sm pointer-events-none"
      >
        AUTO REPLAY
      </div>
      {/* White flash overlay for external link transitions */}
      <div
        className="fixed inset-0 z-[100] bg-white pointer-events-none"
        style={{
          opacity: exiting ? 1 : 0,
          transition: exiting ? 'opacity 700ms ease-in' : 'opacity 500ms ease-out',
        }}
      />

      <IdentityBlock />
      <NavBlock onExternalLink={openExternalLink} />
      <Hero isOverview={!!activeProject?.isOverview} />
      <Instructions />
      <Counter project={activeProject} />
      <DotRail activeIndex={activeIndex} goToIndex={goToIndex} />
      <ProjectCard project={activeProject} onExternalLink={openExternalLink} />
      <TuneMode
        tuneMode={tuneMode}
        editorState={editorState}
        onEnter={enterTune}
        onExit={exitTune}
        scene={sceneRef.current}
        goToIndex={goToIndex}
        activeProject={activeProject}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />
      <LoadingScreen loaded={loaded} />
    </div>
  )
}
