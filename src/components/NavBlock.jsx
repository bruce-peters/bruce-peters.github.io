import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import SoundToggle from './SoundToggle.jsx'

const LINK_CLASS = "inline-block no-underline text-fg text-[11px] tracking-[0.18em] py-1.5 border-b border-transparent hover:text-accent hover:border-accent transition-colors duration-200 bg-transparent border-0 cursor-pointer font-[family-name:inherit] uppercase p-0 leading-none"

// Rows in the small-screen menu panel. h-11 keeps each one a 44px tap target.
const MENU_ROW_CLASS = "flex w-full h-11 items-center justify-between px-3 rounded-[8px] font-mono text-[11px] uppercase tracking-[0.18em] leading-none text-fg text-left no-underline bg-transparent border-0 cursor-pointer transition-colors duration-[140ms] hover:bg-ink-700 hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"

// Renders a nav entry as a link when it has an href, otherwise as a button.
function NavItem({ item, className, onSelect, children }) {
  if (item.href) {
    return (
      <a
        href={item.href}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        onClick={onSelect}
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={() => { onSelect?.(); item.onClick?.() }}
      className={className}
    >
      {children}
    </button>
  )
}

export default function NavBlock({ onExternalLink, onToggleResume, resumeMode }) {
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)
  const menuButtonRef = useRef(null)

  const items = [
    { label: 'GitHub', onClick: () => onExternalLink?.('https://github.com/bruce-peters'), external: true },
    { label: 'Contact', href: 'mailto:brucebpeters12@gmail.com' },
    { label: 'Résumé', href: '/resume.pdf', newTab: true, external: true },
    { label: resumeMode ? '3d view' : 'text view', onClick: onToggleResume },
  ]

  // The open menu closes on a tap outside the nav, on Escape, or once the page scrolls.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onPointerDown = (e) => {
      if (!navRef.current?.contains(e.target)) close()
    }
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      close()
      menuButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', close, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close)
    }
  }, [open])

  // Below `sm` the full link row runs into the /bp/ pill, so the links collapse
  // behind a menu pill. top-[35px] centres that 36px pill on the 50px /bp/ pill,
  // and z-[25] lifts the open panel over the dot rail (z-20).
  return (
    <nav ref={navRef} className="fixed top-[35px] sm:top-7 right-8 z-[25] sm:z-20 flex items-center gap-4 sm:gap-[22px]">
      <ul className="hidden sm:flex gap-[22px] list-none p-0 m-0 font-mono text-[11px] uppercase tracking-[0.18em] items-center">
        {items.map(item => (
          <li key={item.label}>
            <NavItem item={item} className={LINK_CLASS}>{item.label}</NavItem>
          </li>
        ))}
      </ul>

      <SoundToggle />

      <button
        ref={menuButtonRef}
        type="button"
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen(o => !o)}
        className={`sm:hidden flex items-center gap-2 h-9 pl-4 pr-3.5 rounded-full border bg-bg/75 backdrop-blur-sm font-mono text-[11px] uppercase tracking-[0.18em] leading-none cursor-pointer transition-colors duration-[140ms] hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent ${open ? 'border-accent text-accent' : 'border-line text-fg'}`}
      >
        menu
        <Plus
          size={12}
          aria-hidden="true"
          className={`transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}
        />
      </button>

      <ul
        id="nav-menu"
        className={`sm:hidden absolute right-0 top-full mt-3 w-44list-none m-0 p-1.5 rounded-[14px] border border-line bg-ink-800/95 backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-[opacity,transform,visibility] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1'}`}
      >
        {items.map(item => (
          <li key={item.label}>
            <NavItem item={item} className={MENU_ROW_CLASS} onSelect={() => setOpen(false)}>
              <span>{item.label}</span>
              {item.external && <span aria-hidden="true" className="text-dim2">↗</span>}
            </NavItem>
          </li>
        ))}
      </ul>
    </nav>
  )
}
