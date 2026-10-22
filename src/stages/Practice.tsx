import type { Agent } from '../lib/agent'
import { fmt } from '../lib/ui'

export function Practice({ agent }: { agent: Agent }) {
  const p = agent.practice
  const max = p.chart ? Math.max(...p.chart.map(l => l.n)) : 0

  return (
    <div className="practice">
      <section className="card">
        <h2 className="headline">{p.headline}</h2>
        {p.chart && (
          <div className="lap-chart">
            {p.chart.map((l, i) => (
              <div className="lap" key={l.v}>
                <span className="lap-v">{l.v}</span>
                <span className="lap-bar"><i style={{ width: `${(l.n / max) * 100}%`, animationDelay: `${i * 90}ms` }} /></span>
                <span className="lap-n">{fmt(l.n)}</span>
                <span className="lap-why">{l.why}</span>
              </div>
            ))}
          </div>
        )}
        {p.note && <p className="aside">{p.note}</p>}
      </section>

      {p.rows.length > 0 && <section className="card">
      <table className="lessons">
        <thead><tr>{p.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {p.rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={j === 0 && r.length > 2 ? 'lv' : j === r.length - 1 && r.length > 2 ? 'lr' : j === 0 ? 'lt' : ''}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </section>}
    </div>
  )
}
