import SoundToggle from './SoundToggle.jsx'

const LINK_CLASS = "text-fg text-[11px] tracking-[0.18em] py-1.5 border-b border-transparent hover:text-accent hover:border-accent transition-colors duration-200 bg-transparent border-0 cursor-pointer font-[family-name:inherit] uppercase p-0 leading-none"

export default function NavBlock({ onExternalLink, onToggleResume, resumeMode }) {
  return (
    <nav className="fixed top-7 right-8 z-20">
      <ul className="flex gap-[22px] list-none p-0 m-0 font-mono text-[11px] uppercase tracking-[0.18em] items-center">
        {[
          { label: 'GitHub', href: 'https://github.com/bruce-peters' },
          { label: 'Word Wiz', href: 'https://wordwizai.com' },
          { label: 'Contact', href: 'mailto:brucebpeters12@gmail.com' },
        ].map(({ label, href }) => {
          const isMailto = href.startsWith('mailto')
          return (
            <li key={label}>
              {isMailto ? (
                <a href={href} className={`inline-block no-underline ${LINK_CLASS}`}>
                  {label}
                </a>
              ) : (
                <button onClick={() => onExternalLink?.(href)} className={LINK_CLASS}>
                  {label}
                </button>
              )}
            </li>
          )
        })}
        <li>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block no-underline ${LINK_CLASS}`}
          >
            Résumé
          </a>
        </li>
        <li>
          <button onClick={onToggleResume} className={LINK_CLASS}>
            {resumeMode ? '3d view' : 'text view'}
          </button>
        </li>
        <li>
          <SoundToggle />
        </li>
      </ul>
    </nav>
  )
}
