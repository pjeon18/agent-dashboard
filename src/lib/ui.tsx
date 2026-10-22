import type { Data } from './types'

export const fmt = (n: number) => n.toLocaleString('en-US')

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function Logo({ data, company, size = 28 }: { data: Data; company: string; size?: number }) {
  const l = data.logos[company]
  if (!l) {
    return <span className="logo mono" style={{ width: size, height: size, fontSize: size * 0.42 }}>{company[0]}</span>
  }
  return (
    <span className={`logo ${l.small ? 'inset' : ''}`} style={{ width: size, height: size }}>
      <img src={`${import.meta.env.BASE_URL}logos/${l.file}`} alt="" />
    </span>
  )
}

export function Score({ n, by }: { n: number | null; by?: string | null }) {
  if (n === null) return <span className="score none">–</span>
  const tone = n >= 5 ? 'strong' : n >= 4 ? 'good' : n >= 3 ? 'maybe' : 'weak'
  return <span className={`score ${tone}`} title={by === 'llm' ? 'Scored by Claude' : 'Scored by keyword rules'}>{n}</span>
}

export const pay = (min: number | null, max: number | null) =>
  min && max ? `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k` : max ? `up to $${Math.round(max / 1000)}k` : null
