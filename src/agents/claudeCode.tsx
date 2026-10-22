import { useState } from 'react'
import type { Agent } from '../lib/agent'
import { fmt } from '../lib/ui'

export type CCData = {
  request: string; model: string; permissionMode: string
  start: string; end: string; outputTokens: number
  steps: { n: number; kind: Kind; label: string; tool: string; at: string }[]
  tools: string[]; memoryFiles: number
  lessons: { title: string; hook: string }[]
}
type Kind = 'plan' | 'look' | 'act' | 'publish' | 'wait' | 'problem' | 'fix' | 'verify' | 'note'

const dur = (a: string, b: string) => {
  const s = Math.round((+new Date(b) - +new Date(a)) / 1000)
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

export function claudeCodeAgent(d: CCData): Agent {
  const counts = d.tools.map(t => [t, `${d.steps.filter(s => s.tool === t).length} steps`] as [string, string])
  const model = d.model === 'claude-opus-5-5' ? 'Claude Opus 5.5' : d.model
  const verifies = d.steps.filter(s => s.kind === 'verify').length
  return {
    id: 'claude-code',
    name: 'Claude Code',
    line: 'A coding agent. Shown here: one real request, deploying this dashboard.',
    route: { kind: 'agent', value: 'Claude picks each next step', caption: `${d.steps.length} steps chosen during one request. None were written in advance.` },
    kpis: {
      cost: { value: fmt(d.outputTokens), caption: 'tokens written. The dollar cost is not logged' },
      run: { value: `${d.steps.length} steps`, caption: `${dur(d.start, d.end)}, one failure fixed on the way` },
      tests: { value: 'None of yours', caption: 'no test set of your own tasks', unknown: true },
    },
    parts: {
      map: { value: `${d.tools.length} tools`, caption: d.tools.join(', ').toLowerCase(), headline: `It used ${d.tools.length} tools in this run`, facts: counts },
      rules: {
        value: 'Auto mode', caption: 'acts without asking, inside safety rules',
        headline: 'It acts on its own, inside rules it cannot override',
        facts: [['Permission mode', d.permissionMode], ['Publishing anything', 'only with your explicit OK; your request gave it'], ['Before publishing', 'checked the data for keys and emails']],
      },
      engine: { value: model, caption: `decided all ${d.steps.length} steps`, headline: `${model} decided all ${d.steps.length} steps`, facts: [['Model', model], ['Tokens written', fmt(d.outputTokens)], ['Time', dur(d.start, d.end)]] },
      instructor: { value: 'You', caption: 'one request; you can stop or redirect it', headline: 'You gave one instruction and could stop it at any step', facts: [['Your request', `“${d.request}”`], ['Times you stepped in', '0']] },
      memory: { value: `${d.memoryFiles} notes`, caption: 'CLAUDE.md and memory files, read every session', headline: `It starts every session by reading ${d.memoryFiles} saved notes`, facts: [['Project guide', 'CLAUDE.md: what exists, where it lives, rules'], ['Memory files', `${d.memoryFiles}, one fact each`], ['Your corrections among them', `${d.lessons.length}`]] },
      destination: { value: 'Your request', caption: `“${d.request.split('.')[0]}.”`, headline: 'The destination is whatever you ask for', facts: [['This run', `“${d.request}”`]] },
    },
    defaultPart: 'engine',
    practice: {
      headline: `${d.lessons.length} corrections you've given it, saved as notes it reads every session`,
      columns: ['Your correction', 'What it does now'],
      rows: d.lessons.map(l => [l.title, l.hook.split(';')[0].replace(/^Paul's /, 'Your ')]),
      note: 'The model never changes. Your corrections are saved as notes and loaded at the start of every session.',
    },
    test: {
      headline: "You haven't tested it yourself",
      checks: [
        {
          q: 'Does it do your kinds of tasks well?', detail: 'There is no fixed set of your own tasks to run it against, so there is no score.',
          result: '—', verdict: 'Not tested', tone: 'unknown', viz: <div className="hatch-box">No test set yet</div>,
        },
        {
          q: 'Did it check its own work in this run?', detail: 'Before reporting, it opened the live site and looked for problems.',
          result: `${verifies}`, verdict: 'checks: deploy status, page loads, logos render, no console errors', tone: 'ok',
        },
      ],
    },
    road: <Route d={d} />,
  }
}

const KIND_LABEL: Record<Kind, string> = {
  plan: 'Plans', look: 'Looks', act: 'Does', publish: 'Publishes', wait: 'Waits', problem: 'Problem', fix: 'Fixes', verify: 'Checks', note: 'Records',
}

function Route({ d }: { d: CCData }) {
  const [sel, setSel] = useState(10)
  const t0 = +new Date(d.start)
  const offset = (at: string) => {
    const s = Math.round((+new Date(at) - t0) / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  const W = 1080, X0 = 24, step = (W - 2 * X0) / (d.steps.length - 1)
  const detour = (n: number) => n >= 10 && n <= 13
  const pt = (n: number) => ({ x: X0 + (n - 1) * step, y: detour(n) ? 112 : 52 })
  const path = d.steps.map((s, i) => {
    const p = pt(s.n)
    if (i === 0) return `M${p.x} ${p.y}`
    const q = pt(s.n - 1)
    return q.y === p.y ? `L${p.x} ${p.y}` : `C${(q.x + p.x) / 2} ${q.y}, ${(q.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`
  }).join(' ')
  const s = d.steps.find(x => x.n === sel)!

  return (
    <div className="cc-road">
      <section className="card">
        <h2 className="headline">{d.steps.length} steps in {dur(d.start, d.end)}, including a failed deploy it fixed on its own</h2>
        <svg className="routemap" viewBox={`0 0 ${W} 150`}>
          <path d={`M${pt(9).x} 52 L${pt(14).x} 52`} className="rm-skip" />
          <path d={path} className="rm-road" />
          {d.steps.map(x => {
            const p = pt(x.n)
            return (
              <g key={x.n} className={`rm-stop ${x.kind} ${sel === x.n ? 'on' : ''}`} onClick={() => setSel(x.n)}>
                <circle cx={p.x} cy={p.y} r={sel === x.n ? 11 : 8} />
                <text x={p.x} y={p.y + 4} textAnchor="middle">{x.n}</text>
              </g>
            )
          })}
          <text x={pt(11.5).x} y={146} textAnchor="middle" className="rm-label bad">detour: deploy failed, read the log, fixed the lockfile</text>
          <text x={pt(3).x} y={20} textAnchor="middle" className="rm-label">prepare</text>
          <text x={pt(6.5).x} y={20} textAnchor="middle" className="rm-label">publish</text>
          <text x={pt(16.5).x} y={20} textAnchor="middle" className="rm-label">check the live site</text>
          <text x={pt(20).x} y={20} textAnchor="middle" className="rm-label">record</text>
        </svg>
        <div className="rm-legend">
          <span><i className="lg publish" />Published something</span>
          <span><i className="lg problem" />Problem</span>
          <span><i className="lg verify" />Checked its work</span>
          <span><i className="lg" />Everything else</span>
        </div>
      </section>

      <section className="cc-cols">
        <div className="card">
          <div className="step-big">
            <span className={`kind ${s.kind}`}>{KIND_LABEL[s.kind]}</span>
            <h3>{s.label}</h3>
            <dl className="facts-dl">
              <dt>Step</dt><dd>{s.n} of {d.steps.length}</dd>
              <dt>Tool</dt><dd>{s.tool}</dd>
              <dt>At</dt><dd>{offset(s.at)} into the run</dd>
            </dl>
          </div>
        </div>
        <div className="card">
          <ol className="steps-list">
            {d.steps.map(x => (
              <li key={x.n}>
                <button className={`${sel === x.n ? 'on' : ''} ${x.kind}`} onClick={() => setSel(x.n)}>
                  <span className="sl-n">{x.n}</span>
                  <span className="sl-label">{x.label}</span>
                  <span className="sl-tool">{x.tool}</span>
                  <span className="sl-t">{offset(x.at)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
