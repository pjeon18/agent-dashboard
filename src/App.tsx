import { useEffect, useMemo, useState } from 'react'
import type { Agent } from './lib/agent'
import type { Data } from './lib/types'
import { radarAgent } from './agents/radar'
import { claudeCodeAgent, type CCData } from './agents/claudeCode'
import { capabilityAgent, type CapData } from './agents/capability'
import { blank, describedAgent, fromHash, loadAll, saveAll, type Described } from './lib/described'
import { audit } from './lib/audit'
import { Car, RouteGlyph } from './stages/Car'
import { Practice } from './stages/Practice'
import { Test } from './stages/Test'
import { Describe } from './stages/Describe'
import { Compare } from './stages/Compare'

export type Stage = 'car' | 'practice' | 'test' | 'road'
type View = 'agent' | 'describe' | 'compare'

const STAGES: { id: Stage; n: number; name: string; ask: string }[] = [
  { id: 'car', n: 1, name: 'The car', ask: 'What is it made of?' },
  { id: 'practice', n: 2, name: 'Practice', ask: 'How did it get better?' },
  { id: 'test', n: 3, name: 'The test', ask: 'Is it any good?' },
  { id: 'road', n: 4, name: 'On the road', ask: 'What does a real run look like?' },
]

const ROUTE_KIND = { fixed: 'Fixed route', agent: 'Picks its route', unknown: 'Route not stated' }

export default function App({ radar, cc, cap }: { radar: Data; cc: CCData; cap: CapData }) {
  const builtIn = useMemo<Agent[]>(() => [radarAgent(radar), claudeCodeAgent(cc), capabilityAgent(cap)], [radar, cc, cap])
  const [mine, setMine] = useState<Described[]>(() => {
    // A share link carries a whole description; keep it with the viewer's own agents.
    const shared = fromHash()
    const list = loadAll()
    if (shared && !list.some(d => d.id === shared.id)) list.push(shared)
    return list
  })
  const agents = useMemo(() => [...builtIn, ...mine.map(describedAgent)], [builtIn, mine])

  const params = new URLSearchParams(location.search)
  const shared = fromHash()
  const [view, setView] = useState<View>((params.get('view') as View) || 'agent')
  const [agentId, setAgentId] = useState(shared ? `u:${shared.id}` : params.get('a') ?? 'radar')
  const [stage, setStage] = useState<Stage>((params.get('s') as Stage) || 'car')
  const [editing, setEditing] = useState<Described | null>(null)
  const agent = agents.find(a => a.id === agentId) ?? agents[0]

  useEffect(() => saveAll(mine), [mine])

  useEffect(() => {
    const url = new URL(location.href)
    url.hash = ''
    url.search = ''
    if (view === 'agent') { url.searchParams.set('a', agent.id); url.searchParams.set('s', stage) }
    else url.searchParams.set('view', view)
    history.replaceState(null, '', url)
  }, [agent.id, stage, view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'agent' || (e.target as HTMLElement).closest('input, textarea')) return
      const i = STAGES.findIndex(s => s.id === stage)
      if (e.key === 'ArrowRight' && i < 3) setStage(STAGES[i + 1].id)
      if (e.key === 'ArrowLeft' && i > 0) setStage(STAGES[i - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, view])

  const open = (id: string) => { setAgentId(id); setView('agent'); setStage('car') }
  const startNew = () => { setEditing(blank()); setView('describe') }
  const save = (d: Described) => {
    setMine(list => list.some(x => x.id === d.id) ? list.map(x => x.id === d.id ? d : x) : [...list, d])
    setEditing(null)
    open(`u:${d.id}`)
  }
  const remove = (id: string) => {
    setMine(list => list.filter(x => x.id !== id))
    setEditing(null)
    open('radar')
  }

  const ownDescription = mine.find(d => `u:${d.id}` === agent.id)
  const t = audit(agent)
  const active = STAGES.findIndex(s => s.id === stage)

  const item = (a: Agent) => (
    <button key={a.id} className={`side-item ${view === 'agent' && a.id === agent.id ? 'on' : ''}`} onClick={() => open(a.id)}>
      <span className="side-name">{a.name}</span>
      <span className="side-kind">{ROUTE_KIND[a.route.kind]}</span>
    </button>
  )

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><RouteMark /> Agent visualizer</div>
        <button className="new-agent" onClick={startNew}>+ Describe an agent</button>
        <span className="side-label">Examples</span>
        {builtIn.map(item)}
        {mine.length > 0 && <span className="side-label">Yours</span>}
        {mine.map(d => item(describedAgent(d)))}
        <button className={`side-item compare-item ${view === 'compare' ? 'on' : ''}`} onClick={() => setView('compare')}>
          <span className="side-name">Compare all</span>
          <span className="side-kind">{agents.length} agents side by side</span>
        </button>
      </aside>

      {view === 'describe' && editing && (
        <main className="canvas" key={`d-${editing.id}`}>
          <header className="page-head">
            <h1>{mine.some(d => d.id === editing.id) ? `Edit ${editing.name || 'agent'}` : 'Describe an agent'}</h1>
            <p>Answer what you can find out. Every blank becomes a question to ask its maker.</p>
          </header>
          <Describe initial={editing} onSave={save} onCancel={() => { setEditing(null); setView('agent') }}
            onDelete={mine.some(d => d.id === editing.id) ? () => remove(editing.id) : undefined} />
        </main>
      )}

      {view === 'compare' && (
        <main className="canvas" key="compare">
          <header className="page-head">
            <h1>Compare</h1>
            <p>The same ten questions for every agent. Hatched means nobody has said.</p>
          </header>
          <Compare agents={agents} onOpen={open} />
        </main>
      )}

      {view === 'agent' && (
        <main className="canvas" key={agent.id}>
          <header className="page-head with-action">
            <div>
              <h1>{agent.name}</h1>
              <p>{agent.line}</p>
            </div>
            {ownDescription && <button className="btn" onClick={() => { setEditing(ownDescription); setView('describe') }}>Edit</button>}
          </header>

          <section className="kpis">
            <div className={`kpi hero ${agent.route.kind === 'unknown' ? 'unknown-hero' : ''}`}>
              <RouteGlyph kind={agent.route.kind} />
              <span className="kpi-label">Who picks the route</span>
              <span className="kpi-value">{agent.route.value}</span>
              <span className="kpi-cap">{agent.route.caption}</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">What you know</span>
              <span className="kpi-value">{t.known} of {t.total}</span>
              <div className="t-cells small">{t.cells.map(c => <i key={c.label} className={c.known ? 'k' : ''} title={c.label} />)}</div>
            </div>
            <div className={`kpi ${agent.kpis.run.unknown ? 'unknown' : ''}`}>
              <span className="kpi-label">{agent.kpis.run.label ?? 'Latest run'}</span>
              <span className="kpi-value">{agent.kpis.run.value}</span>
              <span className="kpi-cap">{agent.kpis.run.caption}</span>
            </div>
            <div className={`kpi ${agent.kpis.tests.unknown ? 'unknown' : ''}`}>
              <span className="kpi-label">Tests</span>
              <span className="kpi-value">{agent.kpis.tests.value}</span>
              <span className="kpi-cap">{agent.kpis.tests.caption}</span>
            </div>
          </section>

          {t.asks.length > 0 && (
            <section className="asks">
              <span className="asks-label">Ask the maker</span>
              {t.asks.map(q => <span key={q} className="ask-chip">{q}</span>)}
            </section>
          )}

          <nav className="route" aria-label="Stages">
            <div className="route-line"><i style={{ width: `${(active / 3) * 100}%` }} /></div>
            {STAGES.map((s, i) => (
              <button key={s.id} className={`stop ${s.id === stage ? 'on' : ''} ${i < active ? 'past' : ''}`} onClick={() => setStage(s.id)}>
                <span className="pin">{s.n}</span>
                <span className="stop-name">{s.name}</span>
                <span className="stop-ask">{s.ask}</span>
              </button>
            ))}
          </nav>

          <div className="stage" key={stage}>
            {stage === 'car' && <Car agent={agent} />}
            {stage === 'practice' && <Practice agent={agent} />}
            {stage === 'test' && <Test agent={agent} />}
            {stage === 'road' && agent.road}
          </div>
        </main>
      )}
    </div>
  )
}

function RouteMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <path d="M3 17 C7 17 7 5 11 5 S15 17 19 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="17" r="2.2" fill="currentColor" /><circle cx="19" cy="17" r="2.2" fill="currentColor" />
    </svg>
  )
}
