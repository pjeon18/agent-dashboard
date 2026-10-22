import type { Agent, PartId } from '../lib/agent'
import { audit } from '../lib/audit'

const ROWS: { label: string; get: (a: Agent) => { v: string; known: boolean } }[] = [
  { label: 'Who picks the route', get: a => ({ v: a.route.value, known: a.route.kind !== 'unknown' }) },
  ...([
    ['engine', 'Engine'], ['map', 'Map'], ['rules', 'Rules of the road'],
    ['destination', 'Destination'], ['memory', 'Memory'], ['instructor', 'Instructor'],
  ] as [PartId, string][]).map(([k, label]) => ({
    label, get: (a: Agent) => ({ v: a.parts[k].unknown ? a.parts[k].value : `${a.parts[k].value}${a.parts[k].caption ? ` · ${a.parts[k].caption}` : ''}`, known: !a.parts[k].unknown }),
  })),
  { label: 'Practice', get: a => ({ v: a.practice.headline, known: a.practice.rows.length > 0 }) },
  { label: 'Tests', get: a => ({ v: a.test.headline, known: !a.kpis.tests.unknown }) },
  { label: 'A real run', get: a => ({ v: `${a.kpis.run.value}${a.kpis.run.unknown ? '' : ` · ${a.kpis.run.caption}`}`, known: !a.kpis.run.unknown }) },
]

export function Compare({ agents, onOpen }: { agents: Agent[]; onOpen: (id: string) => void }) {
  return (
    <div className="stage">
      <section className="card compare">
        <div className="cmp-scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th />
                {agents.map(a => {
                  const t = audit(a)
                  return (
                    <th key={a.id}>
                      <button className="link" onClick={() => onOpen(a.id)}>{a.name}</button>
                      <span className="cmp-known">{t.known} of {t.total} known</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => (
                <tr key={r.label}>
                  <td className="cmp-label">{r.label}</td>
                  {agents.map(a => {
                    const c = r.get(a)
                    return <td key={a.id} className={c.known ? '' : 'unknown'}>{c.v}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
