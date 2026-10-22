import type { Agent, PartId } from './agent'

/** The ten things you'd want to know about any agent, and how to ask when one is missing. */
const PART_ASKS: Record<PartId, string> = {
  engine: 'Which model runs it?',
  map: 'What can it read or act on?',
  rules: 'What stops it from doing harm?',
  destination: 'What is it trying to achieve?',
  memory: 'What does it remember?',
  instructor: 'When does a person step in?',
}

export type Audit = { known: number; total: number; cells: { label: string; known: boolean }[]; asks: string[] }

export function audit(a: Agent): Audit {
  const cells = [
    { label: 'Route', known: a.route.kind !== 'unknown', ask: 'Does it follow fixed steps, or decide its own?' },
    ...(Object.keys(PART_ASKS) as PartId[]).map(k => ({ label: k[0].toUpperCase() + k.slice(1), known: !a.parts[k].unknown, ask: PART_ASKS[k] })),
    { label: 'Practice', known: a.practice.rows.length > 0, ask: 'How has it improved over time?' },
    { label: 'Tests', known: !a.kpis.tests.unknown, ask: 'How is it tested, and by whom?' },
    { label: 'A real run', known: !a.kpis.run.unknown, ask: 'What does one real run look like?' },
  ]
  return {
    known: cells.filter(c => c.known).length,
    total: cells.length,
    cells: cells.map(({ label, known }) => ({ label, known })),
    asks: cells.filter(c => !c.known).map(c => c.ask),
  }
}
