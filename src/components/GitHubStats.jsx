import { useEffect, useState } from 'react'

export default function GitHubStats() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/github-stats.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.weeks?.length) setData(d) })
      .catch(() => {})
  }, [])

  if (!data) return null

  const { weeks, totalContributions, repos, topLanguages } = data
  const allDays = weeks.flatMap(w => w.contributionDays)
  const max = Math.max(...allDays.map(d => d.contributionCount), 1)

  const cellColor = (count) => {
    if (count === 0) return 'rgba(87,211,106,0.07)'
    const t = Math.pow(count / max, 0.55)
    return `rgba(87,211,106,${(0.18 + t * 0.82).toFixed(2)})`
  }

  return (
    <div className="mt-5">
      {/* Stat labels */}
      <div className="flex gap-4 mb-2.5 flex-wrap">
        {totalContributions > 0 && (
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-dim2">
            <span className="text-accent font-bold">{totalContributions.toLocaleString()}</span>{' '}contributions / yr
          </span>
        )}
        {repos > 0 && (
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-dim2">
            <span className="text-fg font-bold">{repos}</span>{' '}public repos
          </span>
        )}
      </div>

      {/* Contribution heatmap */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
          gap: '2px',
        }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {week.contributionDays.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.contributionCount}`}
                style={{
                  aspectRatio: '1',
                  borderRadius: '2px',
                  background: cellColor(day.contributionCount),
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Top languages */}
      {topLanguages?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-2">
          {topLanguages.map(lang => (
            <span
              key={lang}
              className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim2 border border-line rounded-full px-2 py-0.5"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
