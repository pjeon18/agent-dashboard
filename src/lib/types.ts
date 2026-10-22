export type Role = {
  company: string; title: string; location: string | null; url: string
  score: number | null; scorer: 'llm' | 'keyword' | null; kw: number | null; tier: string | null; family: string
  payMin: number | null; payMax: number | null
  reasons: string[]; gaps: string[]; quote: string | null; grounded: boolean | null
}

export type Run = {
  id: number; start: string; end: string
  boards: number; postings_fetched: number; new_postings: number; closed_since_last_run: number
  passed_filter: number; early_career: number; level_not_stated: number; distinct_bodies_to_score: number
  dropped_by: Record<string, number>; llm_scored: number; tokens: { input: number; output: number }
  model: string | null; strong_new: number
}

export type Lesson = { v: string; problem: string; fix: string; result: string; passed?: number }

export type CompareRow = { kw: number; llm: number; delta: number; title: string; url: string; company: string; gap: string; ungrounded: boolean }

export type Data = {
  agent: { name: string; line: string; lastRun: string | null }
  car: {
    boards: { company: string; ats: string }[]
    families: string[]; wants: string[]; dealbreakers: string[]
    filters: { key: string; plain: string }[]
    model: string; perPosting: number; inputTokens: number; maxPerRun: number
  }
  logos: Record<string, { file: string; small: boolean }>
  firstLap: { v: string; passed: number }
  lessons: Lesson[]
  example: { company: string; title: string; chars: number; sent: number }
  modelCheck: {
    postings: number; sameCall: number; exact: number; withinOne: number
    opusPerPosting: number; haikuPerPosting: number; cheaper: number
    misses: { company: string; title: string; opus: number; haiku: number }[]
    monthlyDifference: string
  }
  compare: {
    rows: CompareRow[]; shift: Record<string, number>
    scored: number; exact: number; withinOne: number; grounded: number
    tokensIn: number; tokensOut: number; model: string; cost: number
  }
  coverage: { logged: number }
  runs: Run[]
  dropped: Record<string, { plain: string; total: number; top: { why: string; n: number }[]; examples: { company: string; title: string; location: string | null; why: string }[] }>
  kept: Role[]
  calls: { company: string; title: string; status: string; at: string }[]
}
