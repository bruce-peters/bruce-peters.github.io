import { useEffect, useRef } from 'react'
import { SORTER_DATA, SORTER_SVG } from './art.generated.ts'
import { mountSoundSorter } from './live.ts'
import './soundsorter.css'

// The Word Wiz sound sorter, the same machine as on wordwizai.com. The art is
// written once in the effect and live.ts moves it; the plate's readout corner
// gets its short readout.
export default function SoundSorterFigure({ readout }) {
  const stage = useRef(null)

  useEffect(() => {
    const el = stage.current
    if (!el) return
    if (el.dataset.filled !== '1') {
      el.innerHTML = SORTER_SVG
      el.dataset.filled = '1'
    }
    const controls = mountSoundSorter(el, SORTER_DATA, { readout: readout.current })
    return () => controls.destroy()
  }, [readout])

  return (
    <div
      ref={stage}
      className="iso-stage ss-stage"
      tabIndex={0}
      role="group"
      aria-label="The Word Wiz sound sorter. Press space, or tap it, for the next reading."
    />
  )
}
