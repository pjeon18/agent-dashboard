import type { Agent, PartId } from './agent'

/**
 * An agent you came across, described by answering the same questions the
 * built-in agents answer. Anything left blank stays unknown and is drawn hatched.
 */
export type Described = {
  id: string
  name: string
  what: string
  route: '' | 'fixed' | 'agent'
  routeNote: string
  engine: string
  map: string
  rules: string
  destination: string
  memory: '' | 'none' | 'conversation' | 'sessions'
  memoryNote: string
  instructor: '' | 'every' | 'risky' | 'after' | 'never'
  instructorNote: string
  changes: string
  tests: string
  run: string
  sources: string
  updated: string
}

export const blank = (): Described => ({
  id: Math.random().toString(36).slice(2, 9), name: '', what: '',
  route: '', routeNote: '', engine: '', map: '', rules: '', destination: '',
  memory: '', memoryNote: '', instructor: '', instructorNote: '',
  changes: '', tests: '', run: '', sources: '', updated: new Date().toISOString(),
})

export const MEMORY: Record<Exclude<Described['memory'], ''>, string> = {
  none: 'Nothing between runs', conversation: 'Within one conversation', sessions: 'Across sessions',
}
export const INSTRUCTOR: Record<Exclude<Described['instructor'], ''>, string> = {
  every: 'Approves every action', risky: 'Approves risky actions', after: 'Reviews afterwards', never: 'Never steps in',
}

const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

/* ── storage: per-browser list, plus share links that carry the whole description ── */

const KEY = 'agent-visualizer:described'

export function loadAll(): Described[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function saveAll(list: Described[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* private mode: keep in memory only */ }
}

export function toLink(d: Described) {
  const json = JSON.stringify(d)
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const url = new URL(location.href)
  url.search = ''
  url.hash = `agent=${b64}`
  return url.toString()
}

export function fromHash(): Described | null {
  const m = location.hash.match(/agent=([\w-]+)/)
  if (!m) return null
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))
    return { ...blank(), ...JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))) }
  } catch { return null }
}

/* ── the questions, in the order a person would answer them ── */

export type Question = { key: keyof Described; part: string; ask: string; hint: string }

export const QUESTIONS: Question[] = [
  { key: 'route', part: 'Who picks the route', ask: 'Does it follow fixed steps, or decide its own?', hint: 'A support bot that always looks up the order, then replies, is fixed. A coding agent that chooses what to run next decides its own.' },
  { key: 'engine', part: 'The engine', ask: 'Which model runs it?', hint: 'e.g. Claude Opus 5.5. Leave blank if the maker doesn’t say.' },
  { key: 'map', part: 'The map', ask: 'What can it read or act on?', hint: 'One per line: your inbox, a database, the web, payments…' },
  { key: 'rules', part: 'Rules of the road', ask: 'What stops it from doing harm?', hint: 'One per line: spending limits, read-only access, banned topics…' },
  { key: 'destination', part: 'The destination', ask: 'What is it trying to achieve?', hint: 'e.g. Resolve refund requests without a human.' },
  { key: 'memory', part: 'Memory', ask: 'What does it remember?', hint: '' },
  { key: 'instructor', part: 'The instructor', ask: 'When does a person step in?', hint: '' },
  { key: 'changes', part: 'Practice', ask: 'How has it improved over time?', hint: 'One change per line, e.g. “v2: stopped inventing order numbers”.' },
  { key: 'tests', part: 'The test', ask: 'How is it tested, and by whom?', hint: 'One per line, e.g. “Maker’s benchmark: 72% of tickets resolved”.' },
  { key: 'run', part: 'On the road', ask: 'What does one real run look like?', hint: 'One step per line. Start a line with ! for a problem.' },
]

export function answered(d: Described, key: keyof Described) {
  return String(d[key] ?? '').trim() !== ''
}

/** What to ask the maker, one plain question per unknown part. */
export function asks(d: Described): string[] {
  return QUESTIONS.filter(q => !answered(d, q.key)).map(q => q.ask)
}

/* ── turn a description into the same Agent shape the built-in agents use ── */

export function describedAgent(d: Described): Agent {
  const u = (key: keyof Described) => !answered(d, key)
  const list = (s: string) => lines(s)
  const tests = list(d.tests), changes = list(d.changes), steps = list(d.run)
  const slot = (key: keyof Described, value: string, caption: string, facts?: [string, string][]) =>
    u(key) ? { value: 'Not stated', caption: '', unknown: true } : { value, caption, facts }

  const parts: Agent['parts'] = {
    map: slot('map', `${list(d.map).length} ${list(d.map).length === 1 ? 'thing' : 'things'}`, list(d.map).join(', '), list(d.map).map((l, i) => [`${i + 1}`, l])),
    rules: slot('rules', `${list(d.rules).length} ${list(d.rules).length === 1 ? 'limit' : 'limits'}`, list(d.rules).join(', '), list(d.rules).map((l, i) => [`${i + 1}`, l])),
    engine: slot('engine', d.engine, 'the model behind it'),
    instructor: u('instructor') ? { value: 'Not stated', caption: '', unknown: true }
      : { value: INSTRUCTOR[d.instructor as Exclude<Described['instructor'], ''>], caption: d.instructorNote || 'when a person steps in' },
    memory: u('memory') ? { value: 'Not stated', caption: '', unknown: true }
      : { value: MEMORY[d.memory as Exclude<Described['memory'], ''>], caption: d.memoryNote || 'what it remembers' },
    destination: slot('destination', d.destination.length > 40 ? `${d.destination.slice(0, 38).trim()}…` : d.destination, 'what it is trying to achieve', [['Goal', d.destination]]),
  }
  for (const k of Object.keys(parts) as PartId[]) {
    if (parts[k].unknown) parts[k].headline = `Unknown: ${QUESTIONS.find(q => q.part === NAMES[k])?.ask ?? ''}`
  }

  return {
    id: `u:${d.id}`,
    name: d.name || 'Untitled agent',
    line: d.what || 'An agent you described.',
    route: u('route')
      ? { kind: 'unknown', value: 'Not stated', caption: 'Ask whether its steps are fixed or chosen as it goes.' }
      : { kind: d.route as 'fixed' | 'agent', value: d.route === 'fixed' ? 'Its builder wrote every step' : 'It decides each next step', caption: d.routeNote || (d.route === 'fixed' ? 'The same order every run.' : 'Steps are chosen while it runs.') },
    kpis: {
      cost: { value: 'Not stated', caption: 'cost per run', unknown: true },
      run: steps.length ? { label: 'A real run', value: `${steps.length} steps`, caption: (n => `${n} ${n === 1 ? 'problem' : 'problems'}`)(steps.filter(s => s.startsWith('!')).length) } : { label: 'A real run', value: 'None shown', caption: 'no example run', unknown: true },
      tests: tests.length ? { value: `${tests.length} ${tests.length === 1 ? 'test' : 'tests'}`, caption: 'published' } : { value: 'None shown', caption: 'no published tests', unknown: true },
    },
    parts,
    defaultPart: 'engine',
    practice: changes.length
      ? { headline: `${changes.length} known ${changes.length === 1 ? 'change' : 'changes'}`, columns: ['Change'], rows: changes.map(c => [c]) }
      : { headline: 'No history of changes published', columns: ['Change'], rows: [], note: 'Without a changelog you can’t tell whether problems you hit were already fixed, or never noticed.' },
    test: {
      headline: tests.length ? `${tests.length} published ${tests.length === 1 ? 'test' : 'tests'}` : 'No published tests',
      checks: tests.length
        ? tests.map(t => ({ q: t.split(':')[0], detail: t.includes(':') ? 'As described in your sources.' : '', result: t.includes(':') ? t.split(':').slice(1).join(':').trim() : '—', verdict: '', tone: 'ok' as const }))
        : [{ q: 'Has anyone tested it?', detail: 'No test results were found or given.', result: '—', verdict: 'Unknown', tone: 'unknown' as const, viz: <div className="hatch-box">No tests shown</div> }],
    },
    road: <DescribedRoad steps={steps} sources={list(d.sources)} />,
  }
}

const NAMES: Record<PartId, string> = {
  map: 'The map', rules: 'Rules of the road', engine: 'The engine', instructor: 'The instructor', memory: 'Memory', destination: 'The destination',
}

function DescribedRoad({ steps, sources }: { steps: string[]; sources: string[] }) {
  return (
    <div className="stage">
      <section className="card">
        <h2 className="headline">{steps.length ? `One run, ${steps.length} steps` : 'No real run shown'}</h2>
        {steps.length ? (
          <ol className="run-steps">
            {steps.map((s, i) => (
              <li key={i} className={s.startsWith('!') ? 'problem' : ''}>
                <span className="rs-n">{i + 1}</span>
                <span>{s.replace(/^!\s*/, '')}</span>
              </li>
            ))}
          </ol>
        ) : <div className="hatch-box">Ask for a recorded run: what it did, step by step, on a real task.</div>}
      </section>
      {sources.length > 0 && (
        <section className="card">
          <h3 className="card-title">Sources</h3>
          <ul className="sources">{sources.map(s => <li key={s}>{/^https?:/.test(s) ? <a href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
