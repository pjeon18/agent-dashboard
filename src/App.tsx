import { useEffect, useState } from 'react'
import type { Data } from './lib/types'
import { Car } from './stages/Car'
import { Practice } from './stages/Practice'
import { Test } from './stages/Test'
import { Road } from './stages/Road'

export type Stage = 'car' | 'practice' | 'test' | 'road'

const STAGES: { id: Stage; n: number; name: string; ask: string }[] = [
  { id: 'car', n: 1, name: 'The car', ask: 'What is it made of?' },
  { id: 'practice', n: 2, name: 'Practice', ask: 'How did it get better?' },
  { id: 'test', n: 3, name: 'The test', ask: 'Is it any good?' },
  { id: 'road', n: 4, name: 'On the road', ask: 'What does a real trip look like?' },
]

export default function App({ data }: { data: Data }) {
  const [stage, setStage] = useState<Stage>(() => (new URLSearchParams(location.search).get('s') as Stage) || 'car')

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('s', stage)
    history.replaceState(null, '', url)
  }, [stage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      const i = STAGES.findIndex(s => s.id === stage)
      if (e.key === 'ArrowRight' && i < 3) setStage(STAGES[i + 1].id)
      if (e.key === 'ArrowLeft' && i > 0) setStage(STAGES[i - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage])

  const active = STAGES.findIndex(s => s.id === stage)

  return (
    <div className="app">
      <header className="top">
        <h1>{data.agent.name}</h1>
        <p>An AI agent that finds new-grad jobs worth applying to.</p>
      </header>

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

      <main className="stage" key={stage}>
        {stage === 'car' && <Car data={data} />}
        {stage === 'practice' && <Practice data={data} />}
        {stage === 'test' && <Test data={data} />}
        {stage === 'road' && <Road data={data} />}
      </main>
    </div>
  )
}
