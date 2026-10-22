import type { Data } from '../lib/types'
import { fmt } from '../lib/ui'

export function Practice({ data }: { data: Data }) {
  const laps = [
    { v: data.firstLap.v, passed: data.firstLap.passed, why: 'First run, before any fixes' },
    ...data.lessons.filter(l => l.passed !== undefined).map(l => ({ v: l.v, passed: l.passed!, why: l.fix })),
  ]
  const max = laps[0].passed
  const cut = Math.round((1 - laps[laps.length - 1].passed / max) * 100)

  return (
    <div className="practice">
      <section className="laps">
        <h2 className="headline">Rule changes cut the roles sent to Claude from {fmt(max)} to {fmt(laps[laps.length - 1].passed)}, {cut}% fewer</h2>
        <div className="lap-chart">
          {laps.map((l, i) => (
            <div className="lap" key={l.v}>
              <span className="lap-v">{l.v}</span>
              <span className="lap-bar"><i style={{ width: `${(l.passed / max) * 100}%`, animationDelay: `${i * 90}ms` }} /></span>
              <span className="lap-n">{fmt(l.passed)}</span>
              <span className="lap-why">{l.why}</span>
            </div>
          ))}
        </div>
        <p className="aside">The model itself never changed. Every improvement was a rule or an instruction.</p>
      </section>

      <section>
        <h3 className="section-title">Every change, in order</h3>
        <table className="lessons">
          <thead>
            <tr><th>Version</th><th>Problem</th><th>Change</th><th>Result</th></tr>
          </thead>
          <tbody>
            {data.lessons.map(l => (
              <tr key={l.v}>
                <td className="lv">{l.v}</td>
                <td>{l.problem}</td>
                <td>{l.fix}</td>
                <td className="lr">{l.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
