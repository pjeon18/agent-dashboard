import { useMemo, useState } from 'react'
import { INSTRUCTOR, MEMORY, QUESTIONS, asks, describedAgent, toLink, type Described } from '../lib/described'
import { audit } from '../lib/audit'

type Props = {
  initial: Described
  onSave: (d: Described) => void
  onDelete?: () => void
  onCancel: () => void
}

const GROUPS: { stage: string; keys: (keyof Described)[] }[] = [
  { stage: 'The car', keys: ['route', 'engine', 'map', 'rules', 'destination', 'memory', 'instructor'] },
  { stage: 'Practice', keys: ['changes'] },
  { stage: 'The test', keys: ['tests'] },
  { stage: 'On the road', keys: ['run'] },
]

export function Describe({ initial, onSave, onDelete, onCancel }: Props) {
  const [d, setD] = useState<Described>(initial)
  const [copied, setCopied] = useState(false)
  const set = <K extends keyof Described>(k: K, v: Described[K]) => setD(prev => ({ ...prev, [k]: v }))
  const a = useMemo(() => audit(describedAgent(d)), [d])
  const toAsk = asks(d)

  const field = (key: keyof Described) => {
    const q = QUESTIONS.find(x => x.key === key)!
    const known = String(d[key]).trim() !== ''
    return (
      <div className={`q ${known ? 'known' : ''}`} key={key}>
        <div className="q-head">
          <span className="q-part">{q.part}</span>
          <label className="q-ask" htmlFor={`f-${key}`}>{q.ask}</label>
        </div>
        {key === 'route' && (
          <>
            <Choice value={d.route} onChange={v => set('route', v)} options={[['fixed', 'Fixed steps'], ['agent', 'Decides its own']]} />
            <input id="f-route" className="text" placeholder="Anything to add (optional)" value={d.routeNote} onChange={e => set('routeNote', e.target.value)} />
          </>
        )}
        {key === 'memory' && (
          <>
            <Choice value={d.memory} onChange={v => set('memory', v)} options={Object.entries(MEMORY) as [Described['memory'], string][]} />
            <input id="f-memory" className="text" placeholder="Anything to add (optional)" value={d.memoryNote} onChange={e => set('memoryNote', e.target.value)} />
          </>
        )}
        {key === 'instructor' && (
          <>
            <Choice value={d.instructor} onChange={v => set('instructor', v)} options={Object.entries(INSTRUCTOR) as [Described['instructor'], string][]} />
            <input id="f-instructor" className="text" placeholder="Anything to add (optional)" value={d.instructorNote} onChange={e => set('instructorNote', e.target.value)} />
          </>
        )}
        {(key === 'engine' || key === 'destination') && (
          <input id={`f-${key}`} className="text" placeholder={q.hint} value={String(d[key])} onChange={e => set(key, e.target.value as never)} />
        )}
        {['map', 'rules', 'changes', 'tests', 'run'].includes(key) && (
          <textarea id={`f-${key}`} className="text" rows={key === 'run' ? 5 : 3} placeholder={q.hint} value={String(d[key])} onChange={e => set(key, e.target.value as never)} />
        )}
        {!['engine', 'destination', 'map', 'rules', 'changes', 'tests', 'run'].includes(key) && q.hint && <p className="q-hint">{q.hint}</p>}
      </div>
    )
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(toLink(d)); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="describe">
      <form className="d-form" onSubmit={e => { e.preventDefault(); onSave({ ...d, updated: new Date().toISOString() }) }}>
        <section className="card">
          <input className="d-name" placeholder="Agent name" value={d.name} onChange={e => set('name', e.target.value)} autoFocus />
          <input className="text" placeholder="What it does, in one line" value={d.what} onChange={e => set('what', e.target.value)} />
          <p className="q-hint">Fill in what you can find. Leave the rest blank: blanks become the questions to ask its maker.</p>
        </section>
        {GROUPS.map(g => (
          <section className="card" key={g.stage}>
            <h3 className="card-title">{g.stage}</h3>
            {g.keys.map(field)}
          </section>
        ))}
        <section className="card">
          <h3 className="card-title">Where this came from</h3>
          <textarea className="text" rows={2} placeholder="Links or notes, one per line" value={d.sources} onChange={e => set('sources', e.target.value)} />
        </section>
      </form>

      <aside className="d-side">
        <section className="card">
          <span className="kpi-label">What you know</span>
          <div className="big-known">{a.known}<small> of {a.total}</small></div>
          <div className="t-cells">{a.cells.map(c => <i key={c.label} className={c.known ? 'k' : ''} title={c.label} />)}</div>
          {toAsk.length > 0 && <>
            <h4 className="ask-h">Ask the maker</h4>
            <ol className="ask-list">{toAsk.map(q => <li key={q}>{q}</li>)}</ol>
          </>}
          <div className="d-actions">
            <button className="btn primary" onClick={() => onSave({ ...d, updated: new Date().toISOString() })} disabled={!d.name.trim()}>Save and view</button>
            <button className="btn" type="button" onClick={copy}>{copied ? 'Link copied' : 'Copy share link'}</button>
            <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
            {onDelete && <button className="btn ghost danger" type="button" onClick={onDelete}>Delete</button>}
          </div>
        </section>
      </aside>
    </div>
  )
}

function Choice<T extends string>({ value, onChange, options }: { value: T | ''; onChange: (v: T | '') => void; options: [T, string][] }) {
  return (
    <div className="choice">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(value === v ? '' : v)}>{label}</button>
      ))}
    </div>
  )
}
