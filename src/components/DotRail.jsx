import { useState, useRef, useCallback } from 'react'
import { PROJECTS } from '../data/projects.js'
import { play } from '../lib/audio.js'

const mainProjects = PROJECTS.filter(p => !p.isArchive)
const archiveWorks = PROJECTS.filter(p => p.isArchive)

export default function DotRail({ activeIndex, goToIndex }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const dotRefs = useRef({})
  const railRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const mouseY = e.clientY
    let closestIndex = null
    let closestDist = Infinity

    Object.entries(dotRefs.current).forEach(([idx, el]) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dotCenterY = rect.top + rect.height / 2
      const dist = Math.abs(mouseY - dotCenterY)
      if (dist < closestDist) {
        closestDist = dist
        closestIndex = parseInt(idx)
      }
    })

    setHoveredIndex(closestIndex)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  return (
    <div
      ref={railRef}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end gap-3.5 pr-7 pl-10 py-6"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main projects */}
      {mainProjects.map((p) => {
        const i = PROJECTS.indexOf(p)
        const isActive = i === activeIndex
        const isHovered = hoveredIndex === i && !isActive
        const showLabel = isActive || isHovered
        const label = p.isOverview ? 'Intro' : p.label.split('·')[0].trim()

        return (
          <div
            key={p.id}
            ref={el => { dotRefs.current[i] = el }}
            onClick={() => { play('tick'); goToIndex(i) }}
            className="flex items-center gap-3 cursor-pointer"
            style={{ color: isActive ? '#f4f0e8' : isHovered ? '#cbc6bc' : '#9a958b' }}
          >
            <span
              className="text-[9px] tracking-[0.2em] uppercase whitespace-nowrap text-right transition-all duration-[200ms]"
              style={{
                opacity: showLabel ? 1 : 0,
                transform: showLabel ? 'translateX(0)' : 'translateX(6px)',
              }}
            >
              {label}
            </span>
            <span
              className="w-2 h-2 rounded-full border flex-shrink-0 transition-all duration-[200ms]"
              style={{
                background: isActive ? '#57d36a' : isHovered ? 'rgba(87,211,106,0.25)' : 'transparent',
                borderColor: isActive ? '#57d36a' : isHovered ? '#57d36a' : '#9a958b',
                transform: isActive ? 'scale(1.25)' : isHovered ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isActive ? '0 0 12px #57d36a' : isHovered ? '0 0 6px rgba(87,211,106,0.4)' : 'none',
              }}
            />
          </div>
        )
      })}

      {/* Separator */}
      <div className="w-3.5 h-px self-end" style={{ background: 'rgba(154,149,139,0.2)' }} />

      {/* Archive works */}
      <div className="flex flex-col gap-1.5 items-end">
        {archiveWorks.map((p) => {
          const i = PROJECTS.indexOf(p)
          const isActive = i === activeIndex
          const isHovered = hoveredIndex === i && !isActive

          return (
            <div
              key={p.id}
              ref={el => { dotRefs.current[i] = el }}
              onClick={() => { play('tick'); goToIndex(i) }}
              className="flex items-center gap-3 cursor-pointer"
            >
              {/* Label pops out to the left */}
              <span
                className="text-[8px] tracking-[0.18em] uppercase whitespace-nowrap text-right transition-all duration-[200ms]"
                style={{
                  color: isActive ? '#57d36a' : '#9a958b',
                  opacity: isActive || isHovered ? 1 : 0,
                  transform: isActive || isHovered ? 'translateX(0)' : 'translateX(6px)',
                }}
              >
                {p.title}
              </span>
              <span
                className="transition-all duration-200 flex-shrink-0"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isActive ? '#57d36a' : isHovered ? 'rgba(87,211,106,0.3)' : '#1d1d21',
                  border: `1px solid ${isActive ? '#57d36a' : isHovered ? '#57d36a' : '#34343a'}`,
                  boxShadow: isActive ? '0 0 6px #57d36a' : isHovered ? '0 0 4px rgba(87,211,106,0.35)' : 'none',
                  transform: isHovered && !isActive ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
