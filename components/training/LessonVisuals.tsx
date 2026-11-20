'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type {
  BodySystem, BodyVisual, ChartVisual, CompareVisual, CycleVisual, HubVisual, RangeVisual, StatsVisual, StepsVisual, TimelineVisual, Tone, Visual,
} from '@/lib/lessonContent'

// Drawn lesson visuals. Charts follow the data-viz rules used across FXMed:
// one validated categorical order (never cycled), thin marks with 4px rounded
// data-ends, hairline grids, a legend for 2+ series, hover tooltips, and a
// table view for every chart.

// Validated categorical order (light surface): adjacent pairs pass CVD and
// normal-vision separation. Line charts are capped at 3 series.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6']
const SINGLE = '#178a55' // single-series marks: brand green, chroma-checked
const STATUS: Record<Tone, { fill: string; ink: string; icon: string; label: string }> = {
  good: { fill: '#0ca30c', ink: '#0b6b0b', icon: '✓', label: 'Good' },
  warning: { fill: '#fab219', ink: '#8a5a00', icon: '!', label: 'Caution' },
  serious: { fill: '#ec835a', ink: '#9a3b14', icon: '!!', label: 'Concern' },
  critical: { fill: '#d03b3b', ink: '#9b1c1c', icon: '✕', label: 'Act now' },
  neutral: { fill: '#c9c7bf', ink: '#52514e', icon: '•', label: '' },
}
const GRID = '#e4e2da'; const INK = '#1c2b22'; const MUTED = '#5c6b62'

// Rounded so server and browser draw identical paths.
const r2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => Number.isInteger(n) ? n.toLocaleString('en-NG') : n.toLocaleString('en-NG', { maximumFractionDigits: 2 })

function Figure({ title, caption, children, actions }: { title?: string; caption?: string; children: ReactNode; actions?: ReactNode }) {
  return <figure className="my-6 overflow-hidden rounded-2xl border border-green-deep/10 bg-[#fcfcfb] p-4 sm:p-5">
    {(title || actions) && <div className="mb-3 flex items-start justify-between gap-3">{title && <figcaption className="text-sm font-bold text-green-deep">{title}</figcaption>}{actions}</div>}
    {children}
    {caption && <p className="mt-3 text-xs leading-5 text-text-mid">{caption}</p>}
  </figure>
}

// ---------------------------------------------------------------------------
// Charts

/** Draw charts at their real width (320–640 px) so axis text stays readable on phones. */
function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const update = () => setWidth(Math.round(Math.min(640, Math.max(320, el.clientWidth))))
    update(); const observer = new ResizeObserver(update); observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function niceMax(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value)); const n = value / power
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * power
}

function Legend({ names }: { names: string[] }) {
  return <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-mid">{names.map((name, i) => <li key={name + i} className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} />{name}</li>)}</ul>
}

function ChartTable({ chart }: { chart: ChartVisual }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-text-mid"><th className="py-2 pr-4 font-bold">{chart.type === 'donut' ? 'Part' : 'Item'}</th>{chart.series.map((s, i) => <th key={i} className="py-2 pr-4 text-right font-bold">{chart.series.length > 1 ? s.name : chart.unit || 'Value'}</th>)}</tr></thead>
    <tbody>{chart.labels.map((label, row) => <tr key={label + row} className="border-b border-gray-100"><td className="py-1.5 pr-4 text-text-dark">{label}</td>{chart.series.map((s, i) => <td key={i} className="py-1.5 pr-4 text-right tabular-nums">{fmt(s.values[row])}{chart.unit && chart.series.length > 1 ? ` ${chart.unit}` : ''}</td>)}</tr>)}</tbody></table></div>
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  return <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-green-deep px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: `${x}%`, top: `${y}%` }}>{lines.map((line, i) => <div key={i} className={i === 0 ? 'font-bold' : ''}>{line}</div>)}</div>
}

function ColumnChart({ chart }: { chart: ChartVisual }) {
  const [hover, setHover] = useState<{ row: number; s: number } | null>(null)
  const [ref, W] = useChartWidth(); const H = W < 480 ? 220 : 260, L = 40, B = 40, T = 10
  const clip = Math.max(6, Math.floor((W - L) / chart.labels.length / 7))
  const top = niceMax(Math.max(...chart.series.flatMap((s) => s.values)))
  const band = (W - L) / chart.labels.length
  const barW = Math.min(24, (band * 0.7) / chart.series.length)
  const y = (v: number) => T + (H - T - B) * (1 - Math.max(0, v) / top)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  return <div ref={ref} className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={chart.title}>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={MUTED}>{fmt(t)}</text></g>)}
      {chart.labels.map((label, row) => {
        const groupX = L + band * row + (band - barW * chart.series.length - 2 * (chart.series.length - 1)) / 2
        return <g key={label + row}>
          {chart.series.map((s, i) => {
            const x = groupX + i * (barW + 2); const yy = y(s.values[row]); const h = Math.max(0, y(0) - yy); const r = Math.min(4, h)
            const color = chart.series.length > 1 ? SERIES[i] : SINGLE
            return <g key={i} onMouseEnter={() => setHover({ row, s: i })} onMouseLeave={() => setHover(null)}>
              <rect x={x - 4} y={T} width={barW + 8} height={H - T - B} fill="transparent" />
              <path d={`M${x},${y(0)} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barW - r} Q${x + barW},${yy} ${x + barW},${yy + r} V${y(0)} Z`} fill={color} opacity={hover && (hover.row !== row || hover.s !== i) ? 0.55 : 1} />
            </g>
          })}
          <text x={L + band * row + band / 2} y={H - B + 16} textAnchor="middle" fontSize={11} fill={MUTED}>{label.length > clip ? `${label.slice(0, clip - 1)}…` : label}</text>
        </g>
      })}
      <line x1={L} x2={W} y1={y(0)} y2={y(0)} stroke="#b9b7ae" strokeWidth={1} />
    </svg>
    {hover && <Tooltip x={((L + band * hover.row + band / 2) / W) * 100} y={(y(chart.series[hover.s].values[hover.row]) / H) * 100 - 2} lines={[chart.labels[hover.row], `${chart.series.length > 1 ? `${chart.series[hover.s].name}: ` : ''}${fmt(chart.series[hover.s].values[hover.row])}${chart.unit ? ` ${chart.unit}` : ''}`]} />}
  </div>
}

function BarChart({ chart }: { chart: ChartVisual }) {
  const s = chart.series[0]; const top = niceMax(Math.max(...s.values))
  const [hover, setHover] = useState<number | null>(null)
  return <ul className="space-y-2.5">{chart.labels.map((label, i) => <li key={label + i} className="grid grid-cols-[minmax(90px,34%)_1fr] items-center gap-3 text-sm" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
    <span className="text-text-dark">{label}</span>
    <span className="flex items-center gap-2"><span className="h-5 rounded-r-[4px] transition-opacity" style={{ width: `${Math.max(1, (s.values[i] / top) * 100)}%`, maxWidth: 'calc(100% - 4.5rem)', background: SINGLE, opacity: hover !== null && hover !== i ? 0.55 : 1 }} /><span className="shrink-0 text-xs tabular-nums text-text-mid">{fmt(s.values[i])}{chart.unit ? ` ${chart.unit}` : ''}</span></span>
  </li>)}</ul>
}

function LineChart({ chart }: { chart: ChartVisual }) {
  const [hover, setHover] = useState<number | null>(null)
  const [ref, W] = useChartWidth(); const H = W < 480 ? 210 : 250, L = 40, R = 16, B = 36, T = 12
  const clip = Math.max(5, Math.floor((W - L) / chart.labels.length / 7))
  const every = Math.ceil(chart.labels.length / Math.max(2, Math.floor((W - L) / 56)))
  const values = chart.series.flatMap((s) => s.values)
  const lo = Math.min(0, ...values); const hi = niceMax(Math.max(...values))
  const x = (i: number) => L + ((W - L - R) * i) / (chart.labels.length - 1)
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo))
  return <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={chart.title}>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={MUTED}>{fmt(t)}</text></g>)}
      {chart.labels.map((label, i) => (i % every === 0 || i === chart.labels.length - 1) && <text key={label + i} x={x(i)} y={H - B + 18} textAnchor={i === 0 ? 'start' : i === chart.labels.length - 1 ? 'end' : 'middle'} fontSize={11} fill={MUTED}>{label.length > clip * every ? `${label.slice(0, clip * every - 1)}…` : label}</text>)}
      {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#b9b7ae" strokeWidth={1} />}
      {chart.series.map((s, si) => {
        const color = chart.series.length > 1 ? SERIES[si] : SINGLE
        return <g key={si}>
          <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {[s.values.length - 1, ...(hover !== null ? [hover] : [])].map((i) => <circle key={i} cx={x(i)} cy={y(s.values[i])} r={4.5} fill={color} stroke="#fcfcfb" strokeWidth={2} />)}
        </g>
      })}
      {chart.labels.map((_, i) => <rect key={i} x={x(i) - (W - L - R) / (chart.labels.length - 1) / 2} y={T} width={(W - L - R) / (chart.labels.length - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />)}
    </svg>
    {hover !== null && <Tooltip x={(x(hover) / W) * 100} y={(Math.min(...chart.series.map((s) => y(s.values[hover]))) / H) * 100 - 3} lines={[chart.labels[hover], ...chart.series.map((s) => `${chart.series.length > 1 ? `${s.name}: ` : ''}${fmt(s.values[hover])}${chart.unit ? ` ${chart.unit}` : ''}`)]} />}
  </div>
}

function DonutChart({ chart }: { chart: ChartVisual }) {
  const values = chart.series[0].values; const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1
  const [hover, setHover] = useState<number | null>(null)
  const R = 80, r = 50, C = 100
  let angle = -Math.PI / 2
  const arcs = values.map((v) => { const start = angle; const sweep = (Math.max(0, v) / total) * Math.PI * 2; angle += sweep; return { start, end: start + sweep } })
  const point = (a: number, rad: number) => `${r2(C + rad * Math.cos(a))},${r2(C + rad * Math.sin(a))}`
  return <div className="flex flex-col items-center gap-5 sm:flex-row">
    <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label={chart.title}>
      {arcs.map(({ start, end }, i) => { const gap = values.length > 1 ? 0.012 : 0; const s = start + gap, e = Math.max(s, end - gap); const large = e - s > Math.PI ? 1 : 0
        return <path key={i} d={`M${point(s, R)} A${R},${R} 0 ${large} 1 ${point(e, R)} L${point(e, r)} A${r},${r} 0 ${large} 0 ${point(s, r)} Z`} fill={SERIES[i]} opacity={hover !== null && hover !== i ? 0.5 : 1} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} /> })}
      <text x={C} y={C - 2} textAnchor="middle" fontSize={hover !== null ? 18 : 13} fontWeight={700} fill={INK}>{hover !== null ? `${Math.round((values[hover] / total) * 100)}%` : ''}</text>
      <text x={C} y={C + 16} textAnchor="middle" fontSize={10} fill={MUTED}>{hover !== null ? chart.labels[hover].slice(0, 18) : ''}</text>
    </svg>
    <ul className="w-full space-y-1.5 text-sm">{chart.labels.map((label, i) => <li key={label + i} className="flex items-center gap-2" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SERIES[i] }} /><span className="flex-1 text-text-dark">{label}</span><span className="tabular-nums text-text-mid">{chart.unit === '%' ? `${fmt(values[i])}%` : `${fmt(values[i])}${chart.unit ? ` ${chart.unit}` : ''} · ${Math.round((values[i] / total) * 100)}%`}</span></li>)}</ul>
  </div>
}

function Chart({ chart }: { chart: ChartVisual }) {
  const [table, setTable] = useState(false)
  return <Figure title={chart.title} caption={chart.caption} actions={<button type="button" onClick={() => setTable((t) => !t)} className="shrink-0 rounded-full border bg-white px-3 py-1 text-[11px] font-bold text-green-deep">{table ? 'Show chart' : 'Show as table'}</button>}>
    {table ? <ChartTable chart={chart} /> : <>
      {chart.series.length > 1 && chart.type !== 'donut' && <Legend names={chart.series.map((s) => s.name)} />}
      {chart.type === 'bar' && chart.series.length === 1 ? <BarChart chart={chart} /> : chart.type === 'line' ? <LineChart chart={chart} /> : chart.type === 'donut' ? <DonutChart chart={chart} /> : <ColumnChart chart={chart} />}
    </>}
  </Figure>
}

// ---------------------------------------------------------------------------
// Infographics and explainers

function Steps({ v }: { v: StepsVisual }) {
  return <Figure title={v.title}><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">{v.steps.map((step, i) => <li key={i} className="relative rounded-xl border border-green-deep/10 bg-white p-4">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-deep text-sm font-bold text-gold">{i + 1}</span>
    <p className="mt-3 font-bold text-green-deep">{step.title}</p>{step.text && <p className="mt-1 text-sm leading-6 text-text-mid">{step.text}</p>}
    {i < v.steps.length - 1 && <span aria-hidden className="absolute -right-2.5 top-7 hidden text-green-mid lg:block">›</span>}
  </li>)}</ol></Figure>
}

function Compare({ v }: { v: CompareVisual }) {
  return <Figure title={v.title}><div className={`grid gap-3 ${v.columns.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>{v.columns.map((col, i) => {
    const s = STATUS[col.tone]
    return <div key={i} className="rounded-xl border bg-white p-4" style={{ borderTop: `4px solid ${col.tone === 'neutral' ? SERIES[i] : s.fill}` }}>
      <p className="flex items-center gap-2 font-bold text-green-deep">{col.tone !== 'neutral' && <span aria-hidden className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: s.ink }}>{s.icon}</span>}{col.heading}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-mid">{col.points.map((p, j) => <li key={j} className="flex gap-2"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-mid" />{p}</li>)}</ul>
    </div>
  })}</div></Figure>
}

function Stats({ v }: { v: StatsVisual }) {
  return <Figure title={v.title}><div className={`grid gap-3 ${['', '', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-2 lg:grid-cols-4'][v.items.length]}`}>{v.items.map((s, i) => <div key={i} className="rounded-xl bg-green-deep p-4 text-white">
    <p className="text-3xl font-bold leading-tight text-gold">{s.value}</p><p className="mt-1 text-sm font-bold">{s.label}</p>{s.note && <p className="mt-1 text-xs leading-5 text-white/70">{s.note}</p>}
  </div>)}</div></Figure>
}

function Cycle({ v }: { v: CycleVisual }) {
  const n = v.items.length; const R = 120, C = 170
  const pos = (i: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return { x: r2(C + R * Math.cos(a)), y: r2(C + R * Math.sin(a)), a } }
  const arrow = `cycle-arrow-${useId().replace(/:/g, '')}`
  return <Figure title={v.title}>
    <svg viewBox="0 0 340 340" className="mx-auto hidden h-auto w-full max-w-sm sm:block" role="img" aria-label={`${v.title}: ${v.items.join(', then ')}, and back to the start`}>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2d6a4f" /></marker></defs>
      <circle cx={C} cy={C} r={R} fill="none" stroke={GRID} strokeWidth={10} />
      {v.items.map((_, i) => { const a1 = -Math.PI / 2 + ((i + 0.22) / n) * Math.PI * 2, a2 = -Math.PI / 2 + ((i + 0.78) / n) * Math.PI * 2
        return <path key={i} d={`M${r2(C + R * Math.cos(a1))},${r2(C + R * Math.sin(a1))} A${R},${R} 0 0 1 ${r2(C + R * Math.cos(a2))},${r2(C + R * Math.sin(a2))}`} fill="none" stroke="#2d6a4f" strokeWidth={2} markerEnd={`url(#${arrow})`} /> })}
      {v.center && <foreignObject x={C - 60} y={C - 30} width={120} height={60}><div className="flex h-full items-center justify-center text-center text-sm font-bold leading-tight text-green-deep">{v.center}</div></foreignObject>}
      {v.items.map((item, i) => { const p = pos(i); return <foreignObject key={i} x={p.x - 55} y={p.y - 24} width={110} height={48}><div className="flex h-full items-center justify-center rounded-xl border border-green-deep/15 bg-white px-1.5 text-center text-[11px] font-bold leading-tight text-green-deep shadow-sm">{item}</div></foreignObject> })}
    </svg>
    <ol className="space-y-2 sm:hidden">{v.items.map((item, i) => <li key={i} className="flex items-center gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-deep text-xs font-bold text-gold">{i + 1}</span><span className="font-bold text-green-deep">{item}</span>{i === n - 1 && <span className="text-xs text-text-mid">↺ back to 1</span>}</li>)}</ol>
  </Figure>
}

function Timeline({ v }: { v: TimelineVisual }) {
  return <Figure title={v.title}><ol className="relative ml-3 border-l-2 border-green-mid/30">{v.items.map((item, i) => <li key={i} className="relative pb-5 pl-6 last:pb-0">
    <span aria-hidden className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-[#fcfcfb] bg-green-mid" />
    {item.when && <p className="text-xs font-bold uppercase tracking-wide text-green-mid">{item.when}</p>}
    <p className="font-bold text-green-deep">{item.title}</p>{item.text && <p className="mt-0.5 text-sm leading-6 text-text-mid">{item.text}</p>}
  </li>)}</ol></Figure>
}

function Hub({ v }: { v: HubVisual }) {
  return <Figure title={v.title}><div className="relative">
    <div className="mx-auto mb-4 flex w-fit items-center justify-center rounded-full bg-green-deep px-6 py-4 text-center text-base font-bold text-gold shadow-md">{v.center}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{v.items.map((item, i) => <div key={i} className="relative rounded-xl border border-green-deep/10 bg-white p-3.5">
      <span aria-hidden className="absolute -top-2 left-4 h-2 w-0.5 bg-green-mid/40" />
      <p className="text-sm font-bold text-green-deep">{item.label}</p>{item.text && <p className="mt-1 text-xs leading-5 text-text-mid">{item.text}</p>}
    </div>)}</div>
  </div></Figure>
}

function Range({ v }: { v: RangeVisual }) {
  const pct = (n: number) => ((n - v.min) / (v.max - v.min)) * 100
  return <Figure title={v.title} caption={v.caption}>
    <div className="relative pt-9">
      {v.markers.map((m, i) => <div key={i} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${pct(m.value)}%` }}><p className="whitespace-nowrap rounded bg-green-deep px-1.5 py-0.5 text-[11px] font-bold text-white">{m.label || fmt(m.value)}</p><span aria-hidden className="mx-auto block h-3 w-0.5 bg-green-deep" /></div>)}
      <div className="relative h-6 overflow-hidden rounded-full bg-gray-100">{v.bands.map((b, i) => <div key={i} className="absolute inset-y-0 border-x border-[#fcfcfb]" style={{ left: `${pct(b.from)}%`, width: `${pct(b.to) - pct(b.from)}%`, background: STATUS[b.tone].fill, opacity: b.tone === 'neutral' ? 1 : 0.85 }} />)}</div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-text-mid"><span>{fmt(v.min)}</span><span>{fmt(v.max)}{v.unit ? ` ${v.unit}` : ''}</span></div>
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">{v.bands.map((b, i) => <li key={i} className="flex items-center gap-1.5 text-text-dark"><span aria-hidden className="flex h-4 min-w-4 items-center justify-center rounded px-0.5 text-[9px] font-bold text-white" style={{ background: STATUS[b.tone].ink }}>{STATUS[b.tone].icon}</span>{b.label || STATUS[b.tone].label} <span className="tabular-nums text-text-mid">{fmt(b.from)}–{fmt(b.to)}{v.unit ? ` ${v.unit}` : ''}</span></li>)}</ul>
  </Figure>
}

// Where each body system sits on the figure (viewBox 200 × 420).
const SPOTS: Record<BodySystem, [number, number]> = {
  brain: [100, 34], thyroid: [100, 92], lungs: [82, 140], heart: [110, 148], liver: [84, 188], stomach: [116, 190], gallbladder: [92, 200],
  pancreas: [108, 208], adrenals: [118, 222], kidneys: [84, 228], gut: [100, 255], reproductive: [100, 296], skin: [150, 250], muscles: [78, 340],
  bones: [122, 372], immune: [64, 118], blood: [40, 210], nerves: [100, 170],
}

function Body({ v }: { v: BodyVisual }) {
  const [active, setActive] = useState<number | null>(null)
  return <Figure title={v.title}><div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
    <svg viewBox="0 0 200 420" className="mx-auto h-72 w-auto sm:h-80" role="img" aria-label={`Body diagram: ${v.items.map((i) => i.label).join(', ')}`}>
      <g fill="#eef1ea" stroke="#c5cfc2" strokeWidth={2}>
        <circle cx={100} cy={40} r={28} />
        <path d="M88,66 h24 v14 h-24z" />
        <path d="M60,84 Q100,74 140,84 L150,190 Q148,250 138,300 L62,300 Q52,250 50,190 Z" />
        <path d="M60,88 Q40,96 36,150 L28,236 Q30,246 40,244 L50,160 Z" /><path d="M140,88 Q160,96 164,150 L172,236 Q170,246 160,244 L150,160 Z" />
        <path d="M64,298 L96,298 L94,404 Q86,412 74,408 Z" /><path d="M104,298 L136,298 L126,408 Q114,412 106,404 Z" />
      </g>
      {v.items.map((item, i) => { const [x, y] = SPOTS[item.system]; const on = active === i
        return <g key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
          <circle cx={x} cy={y} r={on ? 16 : 14} fill={on ? '#C9E265' : '#1a3d2e'} stroke="#fcfcfb" strokeWidth={2} />
          <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={on ? '#1a3d2e' : '#C9E265'}>{i + 1}</text>
        </g> })}
    </svg>
    <ol className="space-y-2">{v.items.map((item, i) => <li key={i} className={`flex gap-3 rounded-xl p-2 text-sm transition ${active === i ? 'bg-gold/25' : ''}`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-deep text-xs font-bold text-gold">{i + 1}</span>
      <span><span className="font-bold text-green-deep">{item.label}</span>{item.text && <span className="block leading-6 text-text-mid">{item.text}</span>}</span>
    </li>)}</ol>
  </div></Figure>
}

export function LessonVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'chart': return <Chart chart={visual} />
    case 'steps': return <Steps v={visual} />
    case 'compare': return <Compare v={visual} />
    case 'stats': return <Stats v={visual} />
    case 'cycle': return <Cycle v={visual} />
    case 'timeline': return <Timeline v={visual} />
    case 'hub': return <Hub v={visual} />
    case 'range': return <Range v={visual} />
    case 'body': return <Body v={visual} />
  }
}
