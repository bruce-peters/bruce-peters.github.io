export default function NavBlock({ onExternalLink }) {
  return (
    <nav className="fixed top-7 right-8 z-10">
      <ul className="flex gap-[22px] list-none p-0 m-0 text-[11px] uppercase tracking-[0.18em]">
        {[
          { label: 'GitHub', href: 'https://github.com/bruce-peters' },
          { label: 'Word Wiz', href: 'https://wordwizai.com' },
          { label: 'Contact', href: 'mailto:brucebpeters12@gmail.com' },
        ].map(({ label, href }) => {
          const isMailto = href.startsWith('mailto')
          return (
            <li key={label}>
              {isMailto ? (
                <a
                  href={href}
                  className="inline-block text-fg no-underline py-1.5 leading-none border-b border-transparent hover:text-accent hover:border-accent transition-colors duration-200"
                >
                  {label}
                </a>
              ) : (
                <button
                  onClick={() => onExternalLink?.(href)}
                  className="text-fg text-[11px] tracking-[0.18em] py-1.5 border-b border-transparent hover:text-accent hover:border-accent transition-colors duration-200 bg-transparent border-0 cursor-pointer font-[family-name:inherit] uppercase p-0 leading-none"
                >
                  {label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
