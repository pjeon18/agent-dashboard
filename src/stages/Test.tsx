import type { Agent } from '../lib/agent'

export function Test({ agent }: { agent: Agent }) {
  return (
    <div className="card scorecard">
      <h2 className="headline">{agent.test.headline}</h2>
      {agent.test.checks.map(c => (
        <section key={c.q} className={`check ${c.tone ?? ''}`}>
          <div className="check-q">
            <h3>{c.q}</h3>
            <p>{c.detail}</p>
          </div>
          <div className="check-viz">{c.viz}</div>
          <div className="check-a">
            <span className={`result ${c.tone === 'todo' || c.tone === 'unknown' ? 'muted' : ''}`}>{c.result}{c.of && <small>{c.of}</small>}</span>
            <span className={`verdict ${c.tone === 'ok' ? 'ok' : ''}`}>{c.verdict}</span>
          </div>
        </section>
      ))}
    </div>
  )
}
