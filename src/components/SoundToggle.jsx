import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { setMuted, isMuted } from '../lib/audio.js'

export default function SoundToggle() {
  const [muted, setMutedState] = useState(() => isMuted())

  const toggle = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <button
      onClick={toggle}
      title={muted ? 'Enable sound' : 'Mute sound'}
      className="text-fg py-1.5 border-b border-transparent hover:text-accent hover:border-accent transition-colors duration-200 bg-transparent border-0 cursor-pointer p-0 leading-none flex items-center"
      style={{ outline: 'none' }}
    >
      {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
    </button>
  )
}
