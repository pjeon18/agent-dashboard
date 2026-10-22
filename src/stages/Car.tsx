import { Fragment, useState } from 'react'
import type { Data } from '../lib/types'
import { Logo, Score, fmt, pay } from '../lib/ui'

type Part = 'map' | 'rules' | 'engine' | 'you' | 'destination'

export function Car({ data }: { data: Data }) {
  const [part, setPart] = useState<Part>('engine')
  const dropped = Object.values(data.runs[0]?.dropped_by ?? {}).reduce((a, b) => a + b, 0)

  const PARTS: { id: Part; name: string; value: string; caption: string }[] = [
    { id: 'map', name: 'The map', value: `${data.car.boards.length}`, caption: 'company job boards' },
    { id: 'rules', name: 'Rules of the road', value: fmt(dropped), caption: 'postings dropped by free code checks' },
    { id: 'engine', name: 'The engine', value: 'Claude Opus', caption: `scores what's left, $${data.car.perPosting.toFixed(3)} each` },
    { id: 'you', name: 'The instructor', value: 'You', caption: 'decide what to apply to' },
  ]

  return (
    <div className="car">
      <section className="flow">
        {PARTS.map((p, i) => (
          <Fragment key={p.id}>
            <button className={`part ${part === p.id ? 'on' : ''}`} style={{ gridColumn: i * 2 + 1 }} onClick={() => setPart(p.id)}>
              <span className="part-name">{p.name}</span>
              <span className="part-value">{p.value}</span>
              <span className="part-caption">{p.caption}</span>
            </button>
            {i < PARTS.length - 1 && <span className="arrow" style={{ gridColumn: i * 2 + 2 }} aria-hidden>→</span>}
          </Fragment>
        ))}
        <span className="steer" aria-hidden />
        <button className={`part dest ${part === 'destination' ? 'on' : ''}`} onClick={() => setPart('destination')}>
          <span className="part-name">The destination</span>
          <span className="part-value">Your profile</span>
          <span className="part-caption">every score is measured against it</span>
        </button>
      </section>

      <section className="part-detail" key={part}>
        {part === 'map' && <MapDetail data={data} />}
        {part === 'rules' && <RulesDetail data={data} />}
        {part === 'engine' && <EngineDetail data={data} />}
        {part === 'destination' && <DestinationDetail data={data} />}
        {part === 'you' && <YouDetail data={data} />}
      </section>
    </div>
  )
}

function MapDetail({ data }: { data: Data }) {
  return (
    <>
      <h2 className="headline">{data.car.boards.length} companies, read straight from their own job boards</h2>
      <div className="logo-wall">
        {data.car.boards.map(b => (
          <div className="logo-tile" key={b.company}>
            <Logo data={data} company={b.company} size={32} />
            <span>{b.company}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function RulesDetail({ data }: { data: Data }) {
  const r = data.runs[0]
  const dropped = r.dropped_by
  const total = Object.values(dropped).reduce((a, b) => a + b, 0)
  const max = Math.max(...Object.values(dropped))
  return (
    <>
      <h2 className="headline">{fmt(total)} of {fmt(r.postings_fetched)} postings dropped before any AI reads them</h2>
      <table className="rules">
        <tbody>
          {data.car.filters.map((f, i) => (
            <tr key={f.key}>
              <td className="rule-name">{f.plain}</td>
              <td className="rule-bar"><i style={{ width: `${Math.max(0.5, ((dropped[f.key] ?? 0) / max) * 100)}%`, animationDelay: `${i * 60}ms` }} /></td>
              <td className="rule-n">{fmt(dropped[f.key] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="aside">Cost of these checks: $0. Every drop records its reason.</p>
    </>
  )
}

function EngineDetail({ data }: { data: Data }) {
  const ex = data.kept.find(r => r.company === data.example.company && r.title === data.example.title)!
  return (
    <>
      <h2 className="headline">Claude reads each role and returns a score with proof</h2>
      <div className="io">
        <div className="io-in">
          <h4>Reads</h4>
          <div className="in-card">
            <span className="in-name">The posting</span>
            <span className="in-fact">{fmt(data.example.chars)} characters, cut to {fmt(data.example.sent)}</span>
            <span className="in-bar"><i style={{ width: `${(data.example.sent / data.example.chars) * 100}%` }} /></span>
            <span className="in-note">Benefits, legal text and repeats removed first</span>
          </div>
          <div className="in-card">
            <span className="in-name">Your profile</span>
            <span className="in-fact">Target roles, wants, dealbreakers</span>
          </div>
        </div>
        <span className="io-arrow" aria-hidden>→</span>
        <article className="io-out">
          <h4>Returns</h4>
          <div className="answer">
            <div className="role-head">
              <Logo data={data} company={ex.company} size={40} />
              <div>
                <div className="role-title">{ex.title}</div>
                <div className="role-sub">{ex.company} · {ex.location}{pay(ex.payMin, ex.payMax) && ` · ${pay(ex.payMin, ex.payMax)}`}</div>
              </div>
              <Score n={ex.score} by={ex.scorer} />
            </div>
            <div className="answer-cols">
              <div>
                <h5>Why it fits</h5>
                <ul>{ex.reasons.map(r => <li key={r}>{r}</li>)}</ul>
              </div>
              <div>
                <h5>Gaps</h5>
                <ul>{ex.gaps.map(r => <li key={r}>{r}</li>)}</ul>
              </div>
            </div>
            <blockquote>“{ex.quote}”<span className="check">Quote found in the posting</span></blockquote>
          </div>
        </article>
      </div>
    </>
  )
}

function DestinationDetail({ data }: { data: Data }) {
  return (
    <>
      <h2 className="headline">What counts as a good fit, in a file you edit</h2>
      <div className="dest-cols">
        <div>
          <h4>Roles, best first</h4>
          <ol>{data.car.families.map(f => <li key={f}>{f}</li>)}</ol>
        </div>
        <div>
          <h4>Wants</h4>
          <ul>{data.car.wants.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
        <div>
          <h4>Dealbreakers</h4>
          <ul>{data.car.dealbreakers.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
      </div>
    </>
  )
}

function YouDetail({ data }: { data: Data }) {
  return (
    <>
      <h2 className="headline">It never applies. You do.</h2>
      <div className="steps">
        <div><b>1</b>A trip finds a strong new role</div>
        <div><b>2</b>You get an email</div>
        <div><b>3</b>You apply, save or remove it in the tracker</div>
      </div>
      <h4>Your decisions so far</h4>
      <ul className="calls">
        {data.calls.map(c => (
          <li key={c.title}>
            <Logo data={data} company={c.company} size={28} />
            <span className="call-title">{c.title}<span className="dim"> · {c.company}</span></span>
            <span className="call-status">{c.status === 'removed' ? 'Removed' : c.status}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
