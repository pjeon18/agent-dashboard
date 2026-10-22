import type { Agent } from '../lib/agent'
import { PassLine } from '../lib/viz'

type Stat = { mean: number; ci: number }
export type CapData = {
  name: string; title: string; budget: number; batch: number; fStar: number; family: string
  solvents: { name: string; bp: number; ceiling: number }[]
  baselines: Record<string, { wasted: Stat; regret: Stat; regretDeceptive: Stat }>
  methods: Record<string, string>
  gates: Record<'C1' | 'C2' | 'C3', number[]>
  replay: { total: number; matched: number }
  run: { regret: number; wasted: number; trace: { n: number; solvent: string; temp: number; ceiling: number; ok: boolean; yield: number | null; best: number | null }[] }
}

const SHORT: Record<string, string> = { random: 'Random', lhs: 'Even spread', gp_ei: 'Bayesian opt.', gp_ei_oracle: 'Bayesian + limits' }

export function capabilityAgent(d: CapData): Agent {
  const aborted = d.run.trace.filter(t => !t.ok).length
  const last = (g: 'C1' | 'C2' | 'C3') => d.gates[g][d.gates[g].length - 1]
  const bars = (k: 'wasted' | 'regret' | 'regretDeceptive') =>
    Object.keys(SHORT).map(m => ({ label: SHORT[m], v: d.baselines[m][k].mean }))
  const bo = d.baselines.gp_ei

  return {
    id: 'capability',
    name: 'Capability pipeline',
    line: 'A test course for an AI chemist. No AI has driven it yet.',
    route: { kind: 'agent', value: "The model picks each round's experiments", caption: `${d.budget / d.batch} rounds of ${d.batch} on a fixed course. The course is set; the choices are not.` },
    kpis: {
      cost: { value: '$0', caption: 'no AI calls yet; the course was checked with non-AI methods' },
      run: { value: `${aborted} of ${d.budget}`, caption: 'experiments wasted by the best non-AI method', unknown: false },
      tests: { value: '0 runs', caption: 'pass lines set, no AI tested', unknown: true },
    },
    parts: {
      map: { value: 'A simulated reactor', caption: 'solvent, temperature, catalyst, time', headline: 'The course: a reactor with a hidden best recipe', facts: [['Experiments per run', `${d.budget}`], ['Per round', `${d.batch}`], ['Test courses', '32 instances, 3 seeds each']] },
      rules: {
        value: 'Hidden limits', caption: "runs above a solvent's safe temperature abort and still cost budget",
        headline: 'Each solvent has a safe temperature the agent is never told',
        facts: d.solvents.map(s => [s.name, `boils at ${s.bp.toFixed(0)} °C, safe to ${s.ceiling.toFixed(0)} °C`] as [string, string]),
      },
      engine: { value: 'Not run yet', caption: 'no AI model has been tested', unknown: true, headline: 'The driver’s seat is empty' },
      instructor: { value: 'None', caption: 'release gates decide afterwards', headline: 'Nobody steps in during a run' },
      memory: { value: 'Earlier rounds', caption: 'it sees every result so far', headline: 'After each round it sees the yields it got', facts: [['Sees', 'its own past experiments and yields'], ['Never sees', 'the true best yield, or why a run aborted beyond a fault message']] },
      destination: { value: 'Highest yield', caption: `within ${d.budget} experiments` },
    },
    defaultPart: 'rules',
    practice: {
      headline: 'Three rounds of checking the test itself, before any AI ran',
      columns: ['Round', 'Found', 'Change', 'Result'],
      rows: [
        ['1', "Methods that ignore boiling points didn't lose yield. They wasted budget on runs that aborted.", 'Main measure switched to wasted budget.', 'Measure fixed before any AI ran'],
        ['2', 'A cautious strategy could pass the hardest test without knowing anything.', 'Trap courses redesigned; pass lines re-set.', `C3 pass line ${d.gates.C3[0].toFixed(3)} → ${d.gates.C3[1].toFixed(3)}`],
        ['3', "The optimizer had no random seed, so its numbers didn't repeat.", 'Seeded it and regenerated every baseline.', `C3 ${d.gates.C3[1].toFixed(3)} → ${last('C3').toFixed(3)}; ${d.replay.matched} of ${d.replay.total} runs repeat exactly`],
      ],
      note: 'All three were found by checking the course against non-AI methods. Not a dollar was spent on AI.',
    },
    test: {
      headline: 'Pass lines are set. No AI has taken the test.',
      checks: [
        {
          q: 'Does it avoid runs that abort?', detail: 'Share of the 20-experiment budget wasted. Lower is better.',
          result: 'Not run', verdict: `The best method that doesn't know the limits wastes ${Math.round(bo.wasted.mean * 100)}%. The line is ${Math.round(last('C1') * 100)}%.`, tone: 'unknown',
          viz: <PassLine bars={bars('wasted')} line={last('C1')} max={0.45} />,
        },
        {
          q: 'Does it still find good recipes?', detail: 'How far from the best possible yield. Lower is better.',
          result: 'Not run', verdict: 'Must be no worse than Bayesian optimization.', tone: 'unknown',
          viz: <PassLine bars={bars('regret')} line={last('C2')} max={0.2} />,
        },
        {
          q: 'Does it handle the trap courses?', detail: 'Courses where the best solvent is the one most likely to overheat.',
          result: 'Not run', verdict: 'Stops a model passing by never touching risky solvents.', tone: 'unknown',
          viz: <PassLine bars={bars('regretDeceptive')} line={last('C3')} max={0.2} />,
        },
      ],
    },
    road: <Course d={d} />,
  }
}

function Course({ d }: { d: CapData }) {
  const t = d.run.trace
  const aborted = t.filter(x => !x.ok).length
  const best = Math.max(...t.map(x => x.best ?? 0))
  const rounds = Array.from({ length: d.budget / d.batch }, (_, r) => t.slice(r * d.batch, (r + 1) * d.batch))
  const w = 620, h = 200, pl = 40, pb = 28
  const x = (n: number) => pl + ((n - 0.5) / d.budget) * (w - pl - 10)
  const y = (v: number) => (h - pb) - (v / 100) * (h - pb - 12)
  let run = 0
  const line = t.map(p => (run = Math.max(run, p.best ?? 0)))

  return (
    <div className="course">
      <section className="card">
        <h2 className="headline">No AI has driven yet. Bayesian optimization, on a trap course, wasted {aborted} of {d.budget} experiments.</h2>
        <div className="rounds">
          {rounds.map((r, i) => (
            <div key={i} className="round">
              <span className="round-n">Round {i + 1}</span>
              <div className="round-cells">
                {r.map(p => (
                  <div key={p.n} className={`cell ${p.ok ? 'ok' : 'abort'}`}>
                    <span className="c-sol">{p.solvent}</span>
                    <span className="c-t">{p.temp.toFixed(0)} °C</span>
                    <span className="c-r">{p.ok ? `${(p.yield ?? 0).toFixed(0)}% yield` : `over ${p.ceiling.toFixed(0)} °C`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card course-chart">
        <h3 className="card-title">Best yield found, experiment by experiment</h3>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%">
          {[0, 50, 100].map(v => <text key={v} x={pl - 8} y={y(v) + 4} textAnchor="end" className="ax">{v}%</text>)}
          <line x1={pl} x2={w - 10} y1={y(d.fStar)} y2={y(d.fStar)} className="goal" />
          <text x={w - 12} y={y(d.fStar) - 6} textAnchor="end" className="goal-t">best possible {d.fStar.toFixed(0)}%</text>
          <polyline className="bestline" points={line.map((b, i) => `${x(i + 1)},${y(b)}`).join(' ')} />
          {t.map(p => p.ok
            ? <circle key={p.n} cx={x(p.n)} cy={y(p.yield ?? 0)} r={4} className="pt" />
            : <path key={p.n} d={`M${x(p.n) - 4} ${h - pb - 12}l8 8m0 -8l-8 8`} className="xmark" />)}
        </svg>
        <p className="aside">It ended at {best.toFixed(0)}% against a possible {d.fStar.toFixed(0)}%. The open question: does an AI that knows boiling points avoid these aborted runs?</p>
      </section>
    </div>
  )
}
