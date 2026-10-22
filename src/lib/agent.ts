import type { ReactNode } from 'react'

/** The parts every agent has, whether or not we can see them. */
export type PartId = 'map' | 'rules' | 'engine' | 'instructor' | 'memory' | 'destination'

export type Slot = {
  value: string
  caption: string
  /** Not known, not built, or not visible from outside. Drawn dashed. */
  unknown?: boolean
  /** Generic detail, used when the agent has no custom view for this part. */
  headline?: string
  facts?: [string, string][]
}

export type Check = {
  q: string
  detail: string
  result: string
  of?: string
  verdict: string
  tone?: 'ok' | 'todo' | 'unknown'
  viz?: ReactNode
}

export type Agent = {
  id: string
  name: string
  line: string
  /** Who picks the route: the builder wrote every step, or the agent decides each next step. */
  route: { kind: 'fixed' | 'agent'; value: string; caption: string }
  /** The overview row shown above every stage. */
  kpis: {
    cost: { value: string; caption: string; unknown?: boolean }
    run: { label?: string; value: string; caption: string; unknown?: boolean }
    tests: { value: string; caption: string; unknown?: boolean }
  }
  parts: Record<PartId, Slot>
  detail?: Partial<Record<PartId, ReactNode>>
  defaultPart?: PartId
  practice: {
    headline: string
    chart?: { v: string; n: number; why: string }[]
    columns: string[]
    rows: string[][]
    note?: string
  }
  test: { headline: string; checks: Check[] }
  road: ReactNode
}
