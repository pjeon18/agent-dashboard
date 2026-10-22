import { useEffect, useMemo, useState } from 'react'
import type { Agent } from './lib/agent'
import type { Data } from './lib/types'
import { radarAgent } from './agents/radar'
import { claudeCodeAgent, type CCData } from './agents/claudeCode'
import { capabilityAgent, type CapData } from './agents/capability'
import { Car, RouteGlyph } from './stages/Car'
import { Practice } from './stages/Practice'
import { Test } from './stages/Test'

export type Stage = 'car' | 'practice' | 'test' | 'road'

const STAGES: { id: Stage; n: number; name: string; ask: string }[] = [
  { id: 'car', n: 1, name: 'The car', ask: 'What is it made of?' },
  { id: 'practice', n: 2, name: 'Practice', ask: 'How did it get better?' },
  { id: 'test', n: 3, name: 'The test', ask: 'Is it any good?' },
  { id: 'road', n: 4, name: 'On the road', ask: 'What does a real run look like?' },
]

export default function App({ radar, cc, cap }: { radar: Data; cc: CCData; cap: CapData }) {
  const agents = useMemo<Agent[]>(() => [radarAgent(radar), claudeCodeAgent(cc), capabilityAgent(cap)], [radar, cc, cap])
  const params = new URLSearchParams(location.search)
  const [agentId, setAgentId] = useState(params.get('a') ?? 'radar')
  const [stage, setStage] = useState<Stage>((params.get('s') as Stage) || 'car')
  const agent = agents.find(a => a.id === agentId) ?? agents[0]

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('a', agent.id)
    url.searchParams.set('s', stage)
    history.replaceState(null, '', url)
  }, [agent.id, stage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = STAGES.findIndex(s => s.id === stage)
      if (e.key === 'ArrowRight' && i < 3) setStage(STAGES[i + 1].id)
      if (e.key === 'ArrowLeft' && i > 0) setStage(STAGES[i - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage])

  const active = STAGES.findIndex(s => s.id === stage)

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><RouteMark /> Agent visualizer</div>
        <span className="side-label">Agents</span>
        {agents.map(a => (
          <button key={a.id} className={`side-item ${a.id === agent.id ? 'on' : ''}`} onClick={() => setAgentId(a.id)}>
            <span className="side-name">{a.name}</span>
            <span className="side-kind">{a.route.kind === 'fixed' ? 'Fixed route' : 'Picks its route'}</span>
          </button>
        ))}
      </aside>

      <main className="canvas" key={agent.id}>
        <header className="page-head">
          <h1>{agent.name}</h1>
          <p>{agent.line}</p>
        </header>

        <section className="kpis">
          <div className="kpi hero">
            <RouteGlyph kind={agent.route.kind} />
            <span className="kpi-label">Who picks the route</span>
            <span className="kpi-value">{agent.route.value}</span>
            <span className="kpi-cap">{agent.route.caption}</span>
          </div>
          <div className={`kpi ${agent.kpis.cost.unknown ? 'unknown' : ''}`}>
            <span className="kpi-label">Cost</span>
            <span className="kpi-value">{agent.kpis.cost.value}</span>
            <span className="kpi-cap">{agent.kpis.cost.caption}</span>
          </div>
          <div className={`kpi ${agent.kpis.run.unknown ? 'unknown' : ''}`}>
            <span className="kpi-label">Latest run</span>
            <span className="kpi-value">{agent.kpis.run.value}</span>
            <span className="kpi-cap">{agent.kpis.run.caption}</span>
          </div>
          <div className={`kpi ${agent.kpis.tests.unknown ? 'unknown' : ''}`}>
            <span className="kpi-label">Tests</span>
            <span className="kpi-value">{agent.kpis.tests.value}</span>
            <span className="kpi-cap">{agent.kpis.tests.caption}</span>
          </div>
        </section>

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
