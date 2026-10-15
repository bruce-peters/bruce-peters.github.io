import { createRoot } from 'react-dom/client'
import AnatomyPlate from '../src/components/AnatomyPlate.jsx'
import { FIGURES } from '../src/anatomy/index.js'

// ?only=<id> shows one plate; ?width=<px> sets the column width.
const params = new URLSearchParams(window.location.search)
const only = params.get('only')
const width = Number(params.get('width')) || 440
const ids = Object.keys(FIGURES).filter((id) => !only || id === only)

createRoot(document.getElementById('root')).render(
  <main style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center', padding: '24px 16px 200px' }}>
    {ids.map((id) => (
      <section key={id} data-figure={id} style={{ width: '100%', maxWidth: width }}>
        <AnatomyPlate id={id} />
      </section>
    ))}
  </main>
)
