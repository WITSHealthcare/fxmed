'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowsClockwiseIcon, CheckCircleIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react'
import { LessonIcon, pickIcons } from './lessonIcons'
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
// Infographics and explainers: every item carries an icon (named in the
// lesson or picked from its words) on a soft tinted badge.

// Soft badge tints, used in a fixed order so neighbours differ. Decorative
// only: the label always carries the meaning.
const TINTS = [
  { bg: '#e3f1e8', fg: '#1f6b47' }, { bg: '#fcf0cf', fg: '#8a6100' }, { bg: '#e4ecfa', fg: '#2a5fb0' },
  { bg: '#fbe6df', fg: '#a8452a' }, { bg: '#ece7fb', fg: '#5a46c4' }, { bg: '#dff3ef', fg: '#137262' },
]
const tint = (i: number) => TINTS[i % TINTS.length]

function Badge({ text, detail, icon, index, size = 'md', number }: { text: string; detail?: string; icon?: string; index: number; size?: 'sm' | 'md' | 'lg'; number?: number }) {
  const t = tint(index); const px = size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-12 w-12' : 'h-16 w-16'
  return <span className={`relative flex ${px} shrink-0 items-center justify-center rounded-full shadow-sm ring-4 ring-white`} style={{ background: t.bg, color: t.fg }}>
    <LessonIcon text={text} detail={detail} name={icon} size={size === 'lg' ? 44 : size === 'sm' ? 28 : 36} />
    {number !== undefined && <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-deep text-[11px] font-bold text-gold ring-2 ring-white">{number}</span>}
  </span>
}

function Steps({ v }: { v: StepsVisual }) {
  const icons = pickIcons(v.steps.map((s) => ({ text: s.title, detail: s.text, name: s.icon })))
  const across = v.steps.length <= 5
  const cols = ['', '', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4', 'md:grid-cols-5'][v.steps.length] || ''
  return <Figure title={v.title}>
    {/* Across the page on wider screens: icons joined by an arrowed track. */}
    {across && <ol className={`relative hidden gap-4 md:grid ${cols}`}>
      <span aria-hidden className="absolute left-[10%] right-[10%] top-8 h-0.5 bg-[repeating-linear-gradient(90deg,#2d6a4f_0_6px,transparent_6px_12px)] opacity-40" />
      {v.steps.map((step, i) => <li key={i} className="relative flex flex-col items-center text-center">
        <Badge text={step.title} icon={icons[i]} index={i} number={i + 1} />
        {i < v.steps.length - 1 && <span aria-hidden className="absolute -right-3 top-[22px] z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-green-mid shadow">›</span>}
        <p className="mt-3 font-bold leading-snug text-green-deep">{step.title}</p>
        {step.text && <p className="mt-1 text-[13px] leading-5 text-text-mid">{step.text}</p>}
      </li>)}
    </ol>}
    {/* Down the page on phones (and for long processes). */}
    <ol className={`relative space-y-4 ${across ? 'md:hidden' : ''}`}>
      <span aria-hidden className="absolute bottom-4 left-8 top-4 w-0.5 bg-green-mid/25" />
      {v.steps.map((step, i) => <li key={i} className="relative flex gap-4">
        <Badge text={step.title} icon={icons[i]} index={i} number={i + 1} />
        <div className="pt-1.5"><p className="font-bold text-green-deep">{step.title}</p>{step.text && <p className="mt-0.5 text-sm leading-6 text-text-mid">{step.text}</p>}</div>
      </li>)}
    </ol>
  </Figure>
}

const POINT: Record<Tone, { Icon: typeof CheckCircleIcon; color: string } | null> = {
  good: { Icon: CheckCircleIcon, color: '#16803c' }, warning: { Icon: WarningIcon, color: '#a36a00' },
  serious: { Icon: XCircleIcon, color: '#b4492c' }, critical: { Icon: XCircleIcon, color: '#b42d2d' }, neutral: null,
}

function Compare({ v }: { v: CompareVisual }) {
  const two = v.columns.length === 2
  const icons = pickIcons(v.columns.map((c) => ({ text: c.heading, detail: c.points.join(' '), name: c.icon })))
  return <Figure title={v.title}><div className={`relative grid gap-4 ${two ? 'md:grid-cols-2 md:gap-10' : 'md:grid-cols-3'}`}>
    {two && <span aria-hidden className="absolute left-1/2 top-12 z-10 hidden h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-green-deep text-sm font-bold text-gold shadow-md ring-4 ring-white md:flex">vs</span>}
    {v.columns.map((col, i) => {
      const t = tint(i); const point = POINT[col.tone]
      return <div key={i} className="overflow-hidden rounded-2xl border border-green-deep/10 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4" style={{ background: t.bg }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm" style={{ color: t.fg }}><LessonIcon text={col.heading} name={icons[i]} size={30} /></span>
          <p className="text-base font-bold leading-snug text-green-deep">{col.heading}</p>
        </div>
        <ul className="space-y-2.5 p-4 text-sm leading-6 text-text-dark">{col.points.map((p, j) => <li key={j} className="flex gap-2.5">
          {point ? <point.Icon size={20} weight="fill" className="mt-0.5 shrink-0" style={{ color: point.color }} aria-label={col.tone === 'good' ? 'Yes' : col.tone === 'warning' ? 'Caution' : 'No'} />
            : <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: t.fg }} />}
          <span>{p}</span>
        </li>)}</ul>
      </div>
    })}
  </div></Figure>
}

function Stats({ v }: { v: StatsVisual }) {
  const icons = pickIcons(v.items.map((s) => ({ text: s.label, detail: s.note, name: s.icon })))
  return <Figure title={v.title}><div className={`grid gap-3 ${['', '', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-2 lg:grid-cols-4'][v.items.length]}`}>{v.items.map((s, i) => <div key={i} className="flex flex-col items-center rounded-2xl border border-green-deep/10 bg-white px-4 py-5 text-center shadow-sm">
    <Badge text={s.label} icon={icons[i]} index={i} />
    <p className="mt-3 text-3xl font-bold leading-none text-green-deep">{s.value}</p>
    <p className="mt-2 text-sm font-bold text-green-mid">{s.label}</p>
    {s.note && <p className="mt-1 text-xs leading-5 text-text-mid">{s.note}</p>}
  </div>)}</div></Figure>
}

function Cycle({ v }: { v: CycleVisual }) {
  const n = v.items.length; const R = 132, C = 190
  const icons = pickIcons(v.items.map((item, i) => ({ text: item, name: v.icons[i] })))
  const pos = (i: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return { x: r2(C + R * Math.cos(a)), y: r2(C + R * Math.sin(a)) } }
  const arrow = `cycle-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return <Figure title={v.title}>
    <svg viewBox="0 0 380 380" className="mx-auto hidden h-auto w-full max-w-md sm:block" role="img" aria-label={`${v.title}: ${v.items.join(', then ')}, and back to the start`}>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2d6a4f" /></marker></defs>
      <circle cx={C} cy={C} r={R} fill="none" stroke="#e7ede3" strokeWidth={26} />
      {v.items.map((_, i) => { const a1 = -Math.PI / 2 + ((i + 0.3) / n) * Math.PI * 2, a2 = -Math.PI / 2 + ((i + 0.7) / n) * Math.PI * 2
        return <path key={i} d={`M${r2(C + R * Math.cos(a1))},${r2(C + R * Math.sin(a1))} A${R},${R} 0 0 1 ${r2(C + R * Math.cos(a2))},${r2(C + R * Math.sin(a2))}`} fill="none" stroke="#2d6a4f" strokeWidth={2.5} markerEnd={`url(#${arrow})`} /> })}
      <foreignObject x={C - 70} y={C - 48} width={140} height={96}><div className="flex h-full flex-col items-center justify-center text-center text-green-deep">
        <ArrowsClockwiseIcon size={26} weight="duotone" className="text-green-mid" /><span className="mt-1 text-[13px] font-bold leading-tight">{v.center || 'Repeats'}</span>
      </div></foreignObject>
      {v.items.map((item, i) => { const p = pos(i); return <foreignObject key={i} x={p.x - 62} y={p.y - 30} width={124} height={86}><div className="flex h-full flex-col items-center">
        <Badge text={item} icon={icons[i]} index={i} size="sm" />
        <span className="mt-1 rounded-md bg-white/90 px-1 text-center text-[11px] font-bold leading-tight text-green-deep">{item}</span>
      </div></foreignObject> })}
    </svg>
    <ol className="space-y-3 sm:hidden">{v.items.map((item, i) => <li key={i} className="flex items-center gap-3"><Badge text={item} icon={icons[i]} index={i} size="sm" /><span className="font-bold text-green-deep">{item}</span>{i === n - 1 && <span className="ml-auto flex items-center gap-1 text-xs text-text-mid"><ArrowsClockwiseIcon size={14} />back to start</span>}</li>)}</ol>
  </Figure>
}

function Timeline({ v }: { v: TimelineVisual }) {
  const icons = pickIcons(v.items.map((item) => ({ text: item.title, detail: item.text, name: item.icon })))
  return <Figure title={v.title}><ol className="relative space-y-5">
    <span aria-hidden className="absolute bottom-5 left-[31px] top-5 w-0.5 bg-gradient-to-b from-green-mid/40 to-gold/60" />
    {v.items.map((item, i) => <li key={i} className="relative flex gap-4">
      <Badge text={item.title} icon={icons[i]} index={i} />
      <div className="pt-1">
        {item.when && <span className="inline-block rounded-full bg-green-deep px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold">{item.when}</span>}
        <p className="mt-1 font-bold text-green-deep">{item.title}</p>{item.text && <p className="mt-0.5 text-sm leading-6 text-text-mid">{item.text}</p>}
      </div>
    </li>)}
  </ol></Figure>
}

function Hub({ v }: { v: HubVisual }) {
  const n = v.items.length
  const icons = pickIcons(v.items.map((item) => ({ text: item.label, detail: item.text, name: item.icon })))
  const spot = (i: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return { x: r2(50 + 37 * Math.cos(a)), y: r2(50 + 38 * Math.sin(a)) } }
  const tall = n > 5
  // Long explanations don't fit on a spoke: the diagram then shows labels only, with the explanations in cards below.
  const detailed = v.items.some((item) => item.text.length > 90)
  const centre = <div className="flex flex-col items-center justify-center rounded-full bg-green-deep text-center text-gold shadow-lg ring-8 ring-[#e7ede3]" style={{ width: 150, height: 150 }}>
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-green-deep"><LessonIcon text={v.center} detail={v.title} name={v.centerIcon} size={34} fallback="target" /></span>
    <span className="mt-1 px-3 text-[13px] font-bold leading-tight">{v.center}</span>
  </div>
  return <Figure title={v.title}>
    {/* A true hub on wider screens: the idea in the middle, spokes out to each factor. */}
    <div className={`relative mx-auto hidden w-full max-w-3xl sm:block ${detailed ? (tall ? 'h-[500px]' : 'h-[420px]') : tall ? 'h-[640px]' : 'h-[520px]'}`}>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {v.items.map((_, i) => { const p = spot(i); return <line key={i} x1={50} y1={50} x2={p.x} y2={p.y} stroke="#2d6a4f" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /> })}
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{centre}</div>
      {v.items.map((item, i) => { const p = spot(i); return <div key={i} className="absolute flex w-[31%] max-w-[210px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
        <Badge text={item.label} icon={icons[i]} index={i} />
        <p className="mt-1.5 rounded bg-[#fcfcfb]/90 px-1 text-sm font-bold leading-snug text-green-deep">{item.label}</p>
        {item.text && !detailed && <p className="mt-0.5 rounded bg-[#fcfcfb]/90 px-1 text-xs leading-[18px] text-text-mid">{item.text}</p>}
      </div> })}
    </div>
    {detailed && <ol className="mt-2 hidden gap-3 sm:grid sm:grid-cols-2">{v.items.map((item, i) => <li key={i} className="flex gap-3 rounded-2xl border border-green-deep/10 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: tint(i).bg, color: tint(i).fg }}><LessonIcon text={item.label} name={icons[i]} size={24} /></span>
      <div><p className="font-bold text-green-deep">{item.label}</p>{item.text && <p className="mt-0.5 text-sm leading-6 text-text-mid">{item.text}</p>}</div>
    </li>)}</ol>}
    {/* Phones: the idea on top, the factors branching down a spine. */}
    <div className="sm:hidden">
      <div className="flex justify-center">{centre}</div>
      <ul className="relative mt-4 space-y-3 pl-2">
        <span aria-hidden className="absolute bottom-6 left-[39px] top-0 w-0.5 border-l-2 border-dashed border-green-mid/30" />
        {v.items.map((item, i) => <li key={i} className="relative flex gap-3"><Badge text={item.label} icon={icons[i]} index={i} /><div className="pt-1"><p className="font-bold text-green-deep">{item.label}</p>{item.text && <p className="text-sm leading-6 text-text-mid">{item.text}</p>}</div></li>)}
      </ul>
    </div>
  </Figure>
}

// ---------------------------------------------------------------------------
// Body map: a rendered body scan with organ illustrations for the systems
// the lesson is about, numbered to the list beside it. Figure and placement
// geometry come from the Pain OS body scan (1024 × 1536 image space). Organ
// art is Servier Medical Art (CC BY 4.0), credited under the figure.

const BODY_W = 1024, BODY_H = 1536
const ART: Partial<Record<BodySystem, { src: string; aspect: number; ix: number; iy: number; w: number; gap?: number }>> = {
  brain: { src: '/training/body/brain.png', aspect: 580 / 592, ix: 512, iy: 160, w: 92 },
  lungs: { src: '/training/body/lungs.png', aspect: 408 / 363, ix: 512, iy: 428, w: 160 },
  heart: { src: '/training/body/heart.png', aspect: 741 / 853, ix: 534, iy: 456, w: 56 },
  liver: { src: '/training/body/liver.png', aspect: 748 / 587, ix: 486, iy: 522, w: 118 },
  stomach: { src: '/training/body/stomach.png', aspect: 822 / 790, ix: 546, iy: 546, w: 70 },
  kidneys: { src: '/training/body/kidney.png', aspect: 289 / 389, ix: 512, iy: 604, w: 30, gap: 50 },
}
// Systems without organ art get a glowing marker at their place on the figure.
const SPOTS: Record<BodySystem, [number, number]> = {
  brain: [512, 160], thyroid: [512, 292], lungs: [512, 428], heart: [534, 456], liver: [486, 522], stomach: [546, 546], gallbladder: [470, 566],
  pancreas: [526, 590], adrenals: [512, 582], kidneys: [512, 604], gut: [512, 662], reproductive: [512, 742], skin: [338, 520], muscles: [421, 846],
  bones: [427, 1016], immune: [404, 372], blood: [686, 500], nerves: [512, 350],
}
const pct = (n: number, of: number) => `${(n / of) * 100}%`

function Body({ v }: { v: BodyVisual }) {
  const [active, setActive] = useState<number | null>(null)
  const icons = pickIcons(v.items.map((item) => ({ text: `${item.system} ${item.label}`, detail: item.text })))
  // Zoom to fit the spots this lesson uses (with room for organ art), so the organs are big but nothing is cut off.
  const ys = v.items.map((item) => (SPOTS[item.system][1] / BODY_H) * 100)
  const top = Math.max(0, Math.min(...ys) - 9), bottom = Math.min(100, Math.max(...ys) + 9)
  const scale = Math.min(1.75, Math.max(1.05, 96 / (bottom - top)))
  const zoom = { scale, ox: 50, oy: Math.min(100, Math.max(0, (2 - top * scale) / (1 - scale))) }
  const toBox = (x: number, y: number) => ({ x: zoom.ox + ((x / BODY_W) * 100 - zoom.ox) * zoom.scale, y: zoom.oy + ((y / BODY_H) * 100 - zoom.oy) * zoom.scale })
  // Labels sit in a column either side of the figure, spread so they never overlap, with a leader line to each spot.
  const labels = v.items.map((item, i) => { const [x, y] = SPOTS[item.system]; return { i, spot: toBox(x, y), side: x < 512 ? 'left' : x > 512 ? 'right' : '' } })
  labels.filter((l) => !l.side).forEach((l, k) => { const left = labels.filter((m) => m.side === 'left').length, right = labels.filter((m) => m.side === 'right').length; l.side = left < right || (left === right && k % 2 === 0) ? 'left' : 'right' })
  const placed = new Map<number, number>()
  for (const side of ['left', 'right']) {
    const column = labels.filter((l) => l.side === side).sort((a, b) => a.spot.y - b.spot.y)
    let last = -Infinity
    column.forEach((l) => { const y = Math.min(95, Math.max(6, l.spot.y, last + 9)); placed.set(l.i, y); last = y })
    // If the column ran off the bottom, pull it back up evenly.
    const over = (column.length ? placed.get(column[column.length - 1].i)! : 0) - 95
    if (over > 0) column.forEach((l) => placed.set(l.i, Math.max(6, placed.get(l.i)! - over)))
  }
  return <Figure title={v.title} caption="Organ art: Servier Medical Art (CC BY 4.0)">
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(260px,360px)_1fr]">
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[360px] overflow-hidden rounded-2xl border border-green-deep/10 bg-[radial-gradient(ellipse_at_50%_40%,#ffffff_0%,#f1f4ec_70%,#e4ebdf_100%)]" role="img" aria-label={`Body diagram: ${v.items.map((i) => i.label).join(', ')}`}>
        <div className="absolute inset-0" style={{ transform: `scale(${zoom.scale})`, transformOrigin: `${zoom.ox}% ${zoom.oy}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static figure from /public */}
          <img src="/training/body/body-front.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />
          {v.items.map((item, i) => {
            const art = ART[item.system]; const on = active === null || active === i
            if (!art) {
              const [x, y] = SPOTS[item.system]
              return <span key={i} aria-hidden className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#8db02a] transition-opacity" style={{ left: pct(x, BODY_W), top: pct(y, BODY_H), boxShadow: '0 0 0 2px rgba(141,176,42,0.35), 0 0 6px 1px rgba(141,176,42,0.45)', opacity: on ? 1 : 0.3 }} />
            }
            const h = art.w / art.aspect
            const centres = art.gap ? [art.ix - art.gap, art.ix + art.gap] : [art.ix]
            return centres.map((cx, k) => (
              // eslint-disable-next-line @next/next/no-img-element -- small static organ art
              <img key={`${i}-${k}`} src={art.src} alt="" loading="lazy" className={`absolute transition ${k === 1 ? '-scale-x-100' : ''}`}
                style={{ left: pct(cx - art.w / 2, BODY_W), top: pct(art.iy - h / 2, BODY_H), width: pct(art.w, BODY_W), opacity: on ? 1 : 0.35, filter: active === i ? 'drop-shadow(0 0 6px rgba(155,191,46,1))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
            ))
          })}
        </div>
        <svg aria-hidden viewBox="0 0 100 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {labels.map((l) => { const y = placed.get(l.i)!; const lx = l.side === 'left' ? 10 : 90
            return <g key={l.i} opacity={active === null || active === l.i ? 1 : 0.3}>
              <polyline points={`${l.spot.x},${l.spot.y * 1.5} ${l.side === 'left' ? 16 : 84},${y * 1.5} ${lx},${y * 1.5}`} fill="none" stroke="#1a3d2e" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              <circle cx={l.spot.x} cy={l.spot.y * 1.5} r={0.9} fill="#1a3d2e" />
            </g> })}
        </svg>
        {labels.map((l) => <button key={l.i} type="button" aria-label={`${l.i + 1}: ${v.items[l.i].label}`} onMouseEnter={() => setActive(l.i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(l.i)} onBlur={() => setActive(null)}
          className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-md ring-2 ring-white transition ${active === l.i ? 'bg-gold text-green-deep' : 'bg-green-deep text-gold'}`}
          style={{ left: l.side === 'left' ? '8%' : '92%', top: `${placed.get(l.i)}%` }}>{l.i + 1}</button>)}
      </div>
      <ol className="space-y-2">{v.items.map((item, i) => <li key={i} className={`flex items-start gap-3 rounded-2xl p-2.5 transition ${active === i ? 'bg-gold/25' : ''}`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-deep text-xs font-bold text-gold">{i + 1}</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"><LessonIcon text={item.label} name={icons[i]} size={24} /></span>
        <span className="pt-0.5"><span className="font-bold text-green-deep">{item.label}</span>{item.text && <span className="block text-sm leading-6 text-text-mid">{item.text}</span>}</span>
      </li>)}</ol>
    </div>
  </Figure>
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
