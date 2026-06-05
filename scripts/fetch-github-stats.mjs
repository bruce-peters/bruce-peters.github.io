// Build-time script: fetches the GitHub contribution calendar + repo stats via
// the GraphQL API (requires GITHUB_TOKEN env var) and writes public/github-stats.json.
// If GITHUB_TOKEN is missing, logs a warning and exits 0 — the existing fallback
// JSON is left untouched so the build never breaks.
//
// Usage: node scripts/fetch-github-stats.mjs
// In CI / deploy shell: GITHUB_TOKEN=<token> node scripts/fetch-github-stats.mjs

import { writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/github-stats.json')
const USERNAME = 'bruce-peters'

const token = process.env.GITHUB_TOKEN
if (!token) {
  console.warn('[fetch-github-stats] No GITHUB_TOKEN — keeping existing fallback.')
  process.exit(0)
}

const now = new Date()
const from = new Date(now)
from.setFullYear(from.getFullYear() - 1)

const query = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
    repositories(first: 1, privacy: PUBLIC) {
      totalCount
    }
    topRepositories(first: 12, orderBy: { field: STARGAZERS, direction: DESC }) {
      nodes {
        primaryLanguage { name }
      }
    }
  }
}
`

let res
try {
  res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-stats-fetch',
    },
    body: JSON.stringify({
      query,
      variables: { login: USERNAME, from: from.toISOString(), to: now.toISOString() },
    }),
  })
} catch (e) {
  console.error('[fetch-github-stats] Network error:', e.message)
  process.exit(0)
}

if (!res.ok) {
  console.error(`[fetch-github-stats] GitHub API ${res.status}: ${await res.text()}`)
  process.exit(0)
}

const json = await res.json()
if (json.errors) {
  console.error('[fetch-github-stats] GraphQL errors:', JSON.stringify(json.errors))
  process.exit(0)
}

const user = json.data.user
const cal = user.contributionsCollection.contributionCalendar

const langCounts = {}
user.topRepositories.nodes.forEach(n => {
  const l = n.primaryLanguage?.name
  if (l) langCounts[l] = (langCounts[l] || 0) + 1
})
const topLanguages = Object.entries(langCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([l]) => l)

const output = {
  totalContributions: cal.totalContributions,
  repos: user.repositories.totalCount,
  weeks: cal.weeks,
  topLanguages,
  fetchedAt: now.toISOString(),
}

writeFileSync(OUT, JSON.stringify(output, null, 2))
console.log(
  `[fetch-github-stats] Wrote ${OUT} — ${cal.totalContributions} contributions, ` +
  `${output.repos} repos, langs: ${topLanguages.join(', ')}`
)
