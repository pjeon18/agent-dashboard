import { Fragment, useState } from 'react'
import type { Agent, PartId, Slot } from '../lib/agent'

const FLOW: { id: PartId; name: string }[] = [
  { id: 'map', name: 'The map' },
  { id: 'rules', name: 'Rules of the road' },
  { id: 'engine', name: 'The engine' },
  { id: 'instructor', name: 'The instructor' },
]
const STEER: { id: PartId; name: string; col: number }[] = [
  { id: 'memory', name: 'Memory', col: 3 },
  { id: 'destination', name: 'The destination', col: 5 },
]
const NAME: Record<PartId, string> = Object.fromEntries([...FLOW, ...STEER].map(p => [p.id, p.name])) as Record<PartId, string>

export function Car({ agent }: { agent: Agent }) {
  const [part, setPart] = useState<PartId>(agent.defaultPart ?? 'engine')
  const custom = agent.detail?.[part]

  const card = (id: PartId, name: string, style: React.CSSProperties, extra = '') => {
    const s = agent.parts[id]
    return (
      <button key={id} className={`part ${extra} ${s.unknown ? 'unknown' : ''} ${part === id ? 'on' : ''}`} style={style} onClick={() => setPart(id)}>
        <span className="part-name">{name}</span>
        <span className="part-value">{s.value}</span>
        <span className="part-caption">{s.caption}</span>
      </button>
    )
  }

  return (
    <div className="car">
      <section className="card flow">
        {FLOW.map((p, i) => (
          <Fragment key={p.id}>
            {card(p.id, p.name, { gridColumn: i * 2 + 1, gridRow: 1 })}
            {i < FLOW.length - 1 && <span className="arrow" style={{ gridColumn: i * 2 + 2 }} aria-hidden>→</span>}
          </Fragment>
        ))}
        <span className="steer-label" aria-hidden>Steers the engine</span>
        {STEER.map(p => card(p.id, p.name, { gridColumn: p.col, gridRow: 3 }, 'small'))}
      </section>

      <section className="card part-detail" key={part}>
        {custom ?? <GenericDetail name={NAME[part]} slot={agent.parts[part]} />}
      </section>
    </div>
  )
}

function GenericDetail({ name, slot }: { name: string; slot: Slot }) {
  return (
    <>
      <h2 className="headline">{slot.headline ?? `${name}: ${slot.value}`}</h2>
      {slot.unknown && <p className="unknown-note">{slot.caption}. This part is empty or can't be seen from outside.</p>}
      {slot.facts && (
        <table className="facts">
          <tbody>{slot.facts.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
        </table>
      )}
    </>
  )
}

/** Fixed route: one line through set stops. Agent-picked: a branching path. */
export function RouteGlyph({ kind }: { kind: 'fixed' | 'agent' }) {
  return (
    <svg className="rglyph" viewBox="0 0 120 56" aria-hidden>
      {kind === 'fixed' ? (
        <>
          <path d="M8 28 H112" />
          {[8, 43, 78, 112].map(x => <circle key={x} cx={x} cy="28" r="5" />)}
        </>
      ) : (
        <>
          <path d="M8 28 H40 C52 28 52 10 64 10 H76 M40 28 C52 28 52 46 64 46 H112 M76 10 C88 10 88 28 100 28 H112" />
          <circle cx="8" cy="28" r="5" /><circle cx="40" cy="28" r="5" /><circle cx="64" cy="46" r="5" /><circle cx="76" cy="10" r="5" className="faint" /><circle cx="112" cy="28" r="5" />
        </>
      )}
    </svg>
  )
}
