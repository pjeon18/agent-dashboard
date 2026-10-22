import { useState } from 'react'
import type { Data, Role } from '../lib/types'
import { Logo, Score, fmt, pay, when } from '../lib/ui'

type Step = 'read' | 'passed' | 'claude' | 'strong'

export function RadarRoad({ data }: { data: Data }) {
  const [step, setStep] = useState<Step>('strong')
  const [r1, r2] = data.runs
  const c = data.compare
  const strong = data.kept.filter(k => k.scorer === 'llm' && (k.score ?? 0) >= 4)
  const [role, setRole] = useState<Role | null>(strong[0] ?? null)

  const STEPS: { id: Step; n: number; label: string; cost: string }[] = [
    { id: 'read', n: r1.postings_fetched, label: `read from ${r1.boards} job boards`, cost: '5 seconds' },
    { id: 'passed', n: r1.passed_filter, label: 'passed the free checks', cost: '$0' },
    { id: 'claude', n: c.scored, label: 'read by Claude, best first', cost: `$${c.cost.toFixed(2)}` },
    { id: 'strong', n: strong.length, label: 'rated 4 or 5', cost: 'for you to decide' },
  ]

  return (
    <div className="road">
      <h2 className="headline">From {fmt(r1.postings_fetched)} postings to {strong.length} strong matches, for ${c.cost.toFixed(2)}</h2>

      <div className="narrow">
        {STEPS.map((s, i) => (
          <button key={s.id} className={`lane ${step === s.id ? 'on' : ''}`} style={{ ['--h' as string]: `${190 - i * 22}px` }} onClick={() => setStep(s.id)}>
            <span className="lane-n">{fmt(s.n)}</span>
            <span className="lane-label">{s.label}</span>
            <span className="lane-cost">{s.cost}</span>
          </button>
        ))}
      </div>

      <div className="road-body">
        <div className="road-list">
          {step === 'read' && <Dropped data={data} />}
          {step === 'passed' && <RoleList data={data} roles={data.kept} role={role} onRole={setRole} note="Scores shown are after Claude's re-read; the rest are keyword scores." />}
          {step === 'claude' && <ClaudeTable data={data} />}
          {step === 'strong' && <RoleList data={data} roles={strong} role={role} onRole={setRole} />}
        </div>
        {(step === 'strong' || step === 'passed') && <RolePanel data={data} role={role} />}
      </div>

      <section className="trips">
        <h3 className="section-title">Trips so far</h3>
        <table className="trip-table">
          <tbody>
            <tr><td className="tw">{when(r1.start)}</td><td>Read {fmt(r1.postings_fetched)} postings, kept {fmt(r1.passed_filter)} with free checks. Scored by keywords; no API key yet.</td><td className="tc">$0</td></tr>
            <tr><td className="tw">{when(r2.start)}</td><td>{r2.new_postings} new postings since the last trip. Both dropped by the free checks.</td><td className="tc">$0</td></tr>
            <tr><td className="tw">Oct 20</td><td>Claude re-read the top {c.scored}. {fmt(c.tokensIn)} tokens in, {fmt(c.tokensOut)} out.</td><td className="tc">${c.cost.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Dropped({ data }: { data: Data }) {
  const r = data.runs[0]
  const drops = Object.entries(r.dropped_by).sort((a, b) => b[1] - a[1])
  const [open, setOpen] = useState(drops[0][0])
  const d = data.dropped[open]
  return (
    <>
      <h3 className="section-title">{fmt(drops.reduce((a, [, n]) => a + n, 0))} dropped by the free checks</h3>
      <div className="drop-tabs">
        {drops.map(([k, n]) => (
          <button key={k} className={open === k ? 'on' : ''} onClick={() => setOpen(k)}>
            <span>{data.dropped[k]?.plain ?? k}</span><b>{fmt(n)}</b>
          </button>
        ))}
      </div>
      {d && (
        <ul className="roles plain">
          {d.examples.slice(0, 14).map((e, i) => (
            <li key={i}>
              <Logo data={data} company={e.company} size={28} />
              <span className="rt">{e.title}<span className="dim"> · {e.company}{e.location ? ` · ${e.location}` : ''}</span></span>
              <span className="by">{e.why}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function RoleList({ data, roles, role, onRole, note }: { data: Data; roles: Role[]; role: Role | null; onRole: (r: Role) => void; note?: string }) {
  return (
    <>
      {note && <p className="aside top">{note}</p>}
      <ul className="roles">
        {roles.map(k => (
          <li key={k.url}>
            <button className={role?.url === k.url ? 'on' : ''} onClick={() => onRole(k)}>
              <Logo data={data} company={k.company} size={32} />
              <span className="rt">{k.title}<span className="dim"> · {k.company}</span></span>
              <Score n={k.score} by={k.scorer} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function RolePanel({ data, role }: { data: Data; role: Role | null }) {
  if (!role) return <aside className="role-panel empty">Pick a role to see why it scored that way.</aside>
  return (
    <aside className="role-panel" key={role.url}>
      <div className="role-head">
        <Logo data={data} company={role.company} size={44} />
        <div>
          <div className="role-title">{role.title}</div>
          <div className="role-sub">{role.company}{role.location ? ` · ${role.location}` : ''}{pay(role.payMin, role.payMax) ? ` · ${pay(role.payMin, role.payMax)}` : ''}</div>
        </div>
      </div>
      <div className="panel-score">
        <Score n={role.score} by={role.scorer} />
        <span>{role.scorer === 'llm' ? 'Claude' : 'Keyword rules'}{role.kw !== null && role.scorer === 'llm' && role.kw !== role.score && <span className="dim"> · keywords gave {role.kw}</span>}</span>
      </div>
      {role.reasons.length > 0 && <><h5>Why it fits</h5><ul>{role.reasons.map(x => <li key={x}>{x}</li>)}</ul></>}
      {role.gaps.length > 0 && <><h5>Gaps</h5><ul>{role.gaps.map(x => <li key={x}>{x}</li>)}</ul></>}
      {role.quote && <blockquote>“{role.quote}”{role.grounded ? <span className="qcheck">Quote found in the posting</span> : <span className="qcheck bad">Quote not found in the posting</span>}</blockquote>}
      <a className="open" href={role.url} target="_blank" rel="noreferrer">Open the posting ↗</a>
    </aside>
  )
}

function ClaudeTable({ data }: { data: Data }) {
  const c = data.compare
  return (
    <table className="ctable">
      <thead><tr><th>Role</th><th className="num">Keywords</th><th className="num">Claude</th><th>Claude's main concern</th></tr></thead>
      <tbody>
        {c.rows.map(r => (
          <tr key={r.url}>
            <td><span className="ct-role"><Logo data={data} company={r.company} size={26} /><span>{r.title}<span className="dim"> · {r.company}</span></span></span></td>
            <td className="num"><Score n={r.kw} /></td>
            <td className="num"><Score n={r.llm} by="llm" /></td>
            <td className="ct-gap">{r.gap}{r.ungrounded && <span className="bad"> · quote not found</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
