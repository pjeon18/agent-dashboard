import type { Agent } from '../lib/agent'
import type { Data } from '../lib/types'
import { fmt, when } from '../lib/ui'
import { Dots, Hist, Misses } from '../lib/viz'
import { RadarRoad } from './RadarRoad'
import { DestinationDetail, EngineDetail, MapDetail, RulesDetail, YouDetail } from './radarDetails'

export function radarAgent(data: Data): Agent {
  const first = data.runs[0]
  const latest = data.runs[data.runs.length - 1]
  const droppedFirst = Object.values(first.dropped_by).reduce((a, b) => a + b, 0)
  const remembered = Object.values(data.dropped).reduce((a, d) => a + d.total, 0) + data.kept.length
  const c = data.compare
  const m = data.modelCheck
  const at = (s: number) => c.shift[String(s)] ?? 0
  const lower = [-3, -2, -1].reduce((a, s) => a + at(s), 0)
  const expDown = c.rows.filter(r => r.delta < 0 && /year|senior|new-grad|new grad|experience/i.test(r.gap)).length

  return {
    id: 'radar',
    name: 'Job radar',
    line: 'Finds new-grad jobs worth applying to.',
    route: { kind: 'fixed', value: 'You wrote every step', caption: 'Fetch, filter, score, hand off. The same order every trip.' },
    kpis: {
      cost: { value: `$${c.cost.toFixed(2)}`, caption: `Claude re-reading ${c.scored} roles. Regular trips cost $0` },
      run: { label: 'Latest trip', value: `${fmt(latest.new_postings)} new`, caption: `${when(latest.start)} · ${fmt(latest.passed_filter)} kept, ${fmt(latest.strong_new)} strong` },
      tests: { value: '3 of 4', caption: 'checks taken' },
    },
    parts: {
      map: { value: `${data.car.boards.length}`, caption: 'company job boards' },
      rules: { value: fmt(droppedFirst), caption: 'postings dropped by free code checks' },
      engine: { value: data.car.model, caption: `scores what's left, $${data.car.perPosting.toFixed(3)} each` },
      instructor: { value: 'You', caption: 'decide what to apply to' },
      memory: {
        value: fmt(remembered), caption: 'postings remembered, so repeats cost nothing',
        headline: `It remembers all ${fmt(remembered)} postings it has seen`,
        facts: [['Stored', `${fmt(remembered)} postings, with why each was kept or dropped`], ['Trips so far', `${data.runs.length}`], ['Reposts', 'scored once, score copied to the twins']],
      },
      destination: { value: 'Your profile', caption: 'every score is measured against it' },
    },
    detail: {
      map: <MapDetail data={data} />,
      rules: <RulesDetail data={data} />,
      engine: <EngineDetail data={data} />,
      destination: <DestinationDetail data={data} />,
      instructor: <YouDetail data={data} />,
    },
    practice: {
      headline: `Rule changes cut the roles sent to Claude from ${fmt(data.firstLap.passed)} to 209`,
      chart: [
        { v: data.firstLap.v, n: data.firstLap.passed, why: 'First run, before any fixes' },
        ...data.lessons.filter(l => l.passed !== undefined).map(l => ({ v: l.v, n: l.passed!, why: l.fix })),
      ],
      columns: ['Version', 'Problem', 'Change', 'Result'],
      rows: data.lessons.map(l => [l.v, l.problem, l.fix, l.result]),
      note: 'The model itself never changed. Every improvement was a rule or an instruction.',
    },
    test: {
      headline: 'Four checks. Three taken, one still to do.',
      checks: [
        {
          q: 'Does it quote real proof?', detail: 'Each score must quote the posting. Code confirms the quote is there.',
          result: `${c.grounded}`, of: `/${c.scored}`, verdict: 'Quotes verified', tone: 'ok',
          viz: <><Dots ok={c.grounded} total={c.scored} /><Misses items={c.rows.filter(r => r.ungrounded).map(r => `${r.title}, ${r.company}`)} /></>,
        },
        {
          q: 'Is Claude better than keyword rules?', detail: `The same ${c.scored} roles, scored both ways. Bars show Claude's score minus the keyword score.`,
          result: `${lower}`, of: `/${c.scored}`, verdict: `scored lower by Claude. ${expDown} of them asked for years of experience the keywords missed.`,
          viz: <Hist cols={[-3, -2, -1, 0, 1].map(s => ({ x: s > 0 ? `+${s}` : `${s}`, n: at(s), dark: s < 0 }))} />,
        },
        {
          q: 'Would a cheaper model make the same calls?', detail: `Haiku costs ${m.cheaper}× less than Opus. Both scored the same ${m.postings} roles.`,
          result: `${m.sameCall}`, of: `/${m.postings}`, verdict: `Kept Opus. Haiku's 2 different calls were both 2027 new-grad roles. Opus costs ${m.monthlyDifference} more a month.`,
          viz: <><Dots ok={m.sameCall} total={m.postings} cols={20} /><Misses items={m.misses.map(r => `${r.company}, ${r.title}: Opus ${r.opus}, Haiku ${r.haiku}`)} /></>,
        },
        {
          q: 'Is it missing jobs?', detail: 'Log any role you find yourself. Each is matched against everything the radar saw.',
          result: `${data.coverage.logged}`, verdict: 'roles logged. Not taken yet.', tone: 'todo',
          viz: <div className="buckets"><span><b>Had it</b>it works</span><span><b>Filtered out</b>a rule is too strict</span><span><b>Not watched</b>add the company</span><span><b>Missed</b>a real gap</span></div>,
        },
      ],
    },
    road: <section className="card"><RadarRoad data={data} /></section>,
  }
}
