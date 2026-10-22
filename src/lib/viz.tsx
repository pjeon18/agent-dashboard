/** Small charts shared by every agent's test and road views. */

export function Dots({ ok, total, cols = 30 }: { ok: number; total: number; cols?: number }) {
  return (
    <div className="dots" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols * 18 }}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < ok ? 'ok' : 'bad'} />)}
    </div>
  )
}

export function Misses({ items }: { items: string[] }) {
  return <ul className="evidence">{items.map(t => <li key={t}><span className="bad">✕</span> {t}</li>)}</ul>
}

export function Hist({ cols }: { cols: { x: string; n: number; dark?: boolean }[] }) {
  const max = Math.max(...cols.map(c => c.n))
  return (
    <div className="hist">
      {cols.map((c, i) => (
        <div key={c.x} className="hist-col">
          <span className="hist-n">{c.n}</span>
          <span className={`hist-bar ${c.dark ? 'down' : ''}`} style={{ height: `${(c.n / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
          <span className="hist-x">{c.x}</span>
        </div>
      ))}
    </div>
  )
}

/** Methods against a pass line, lower is better. */
export function PassLine({ bars, line, max }: { bars: { label: string; v: number }[]; line: number; max: number }) {
  return (
    <div className="passline">
      {bars.map((b, i) => (
        <div className="pl-row" key={b.label}>
          <span className="pl-label">{b.label}</span>
          <span className="pl-track">
            <i className={b.v <= line ? 'ok' : ''} style={{ width: `${Math.max(0.6, (b.v / max) * 100)}%`, animationDelay: `${i * 60}ms` }} />
            <em style={{ left: `${(line / max) * 100}%` }} />
          </span>
          <span className="pl-v">{b.v.toFixed(3)}</span>
        </div>
      ))}
      <div className="pl-key"><em /> pass line {line.toFixed(3)}</div>
    </div>
  )
}
