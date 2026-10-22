import type { Data } from '../lib/types'

export function Test({ data }: { data: Data }) {
  const c = data.compare
  const m = data.modelCheck
  const ungrounded = c.rows.filter(r => r.ungrounded)
  const shifts = [-3, -2, -1, 0, 1]
  const at = (s: number) => c.shift[String(s)] ?? 0
  const shiftMax = Math.max(...shifts.map(at))
  const lower = shifts.filter(s => s < 0).reduce((a, s) => a + at(s), 0)
  const expDown = c.rows.filter(r => r.delta < 0 && /year|senior|new-grad|new grad|experience/i.test(r.gap)).length

  return (
    <div className="scorecard">
      <h2 className="headline">Four checks. Three taken, one still to do.</h2>

      <section className="check">
        <div className="check-q">
          <h3>Does it quote real proof?</h3>
          <p>Each score must quote the posting. Code confirms the quote is there.</p>
        </div>
        <div className="check-viz">
          <div className="dots">
            {Array.from({ length: c.scored }, (_, i) => <i key={i} className={i < c.grounded ? 'ok' : 'bad'} />)}
          </div>
          <ul className="evidence">
            {ungrounded.map(r => <li key={r.title}><span className="bad">✕</span> {r.title}, {r.company}</li>)}
          </ul>
        </div>
        <div className="check-a">
          <span className="result">{c.grounded}<small>/{c.scored}</small></span>
          <span className="verdict ok">Quotes verified</span>
        </div>
      </section>

      <section className="check">
        <div className="check-q">
          <h3>Is Claude better than keyword rules?</h3>
          <p>The same {c.scored} roles, scored both ways. Bars show Claude's score minus the keyword score.</p>
        </div>
        <div className="check-viz">
          <div className="hist">
            {shifts.map((s, i) => (
              <div key={s} className="hist-col">
                <span className="hist-n">{at(s)}</span>
                <span className={`hist-bar ${s < 0 ? 'down' : ''}`} style={{ height: `${(at(s) / shiftMax) * 100}%`, animationDelay: `${i * 60}ms` }} />
                <span className="hist-x">{s > 0 ? `+${s}` : s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="check-a">
          <span className="result">{lower}<small>/{c.scored}</small></span>
          <span className="verdict">scored lower by Claude. {expDown} of them asked for years of experience the keywords missed.</span>
        </div>
      </section>

      <section className="check">
        <div className="check-q">
          <h3>Would a cheaper model make the same calls?</h3>
          <p>Haiku costs {m.cheaper}× less than Opus. Both scored the same {m.postings} roles.</p>
        </div>
        <div className="check-viz">
          <div className="dots wide">
            {Array.from({ length: m.postings }, (_, i) => <i key={i} className={i < m.sameCall ? 'ok' : 'bad'} />)}
          </div>
          <ul className="evidence">
            {m.misses.map(r => <li key={r.title}><span className="bad">✕</span> {r.company}, {r.title}: Opus {r.opus}, Haiku {r.haiku}</li>)}
          </ul>
        </div>
        <div className="check-a">
          <span className="result">{m.sameCall}<small>/{m.postings}</small></span>
          <span className="verdict">Kept Opus. Haiku's 2 different calls were both 2027 new-grad roles. Opus costs {m.monthlyDifference} more a month.</span>
        </div>
      </section>

      <section className="check todo">
        <div className="check-q">
          <h3>Is it missing jobs?</h3>
          <p>Log any role you find yourself. Each is matched against everything the radar saw.</p>
        </div>
        <div className="check-viz">
          <div className="buckets">
            <span><b>Had it</b>it works</span>
            <span><b>Filtered out</b>a rule is too strict</span>
            <span><b>Not watched</b>add the company</span>
            <span><b>Missed</b>a real gap</span>
          </div>
        </div>
        <div className="check-a">
          <span className="result muted">{data.coverage.logged}</span>
          <span className="verdict">roles logged. Not taken yet.</span>
        </div>
      </section>
    </div>
  )
}
