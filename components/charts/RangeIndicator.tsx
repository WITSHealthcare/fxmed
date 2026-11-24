import { clamp, clinic } from './shared'

type Bounds = { low: number | null; high: number | null }
export type RangeTone = 'clear' | 'watch' | 'flag'

type Props = {
  value: number
  /** The laboratory's standard range. */
  standard?: Bounds | null
  /** The functional optimal range. */
  optimal?: Bounds | null
  /** clear inside optimal, watch outside optimal only, flag outside the standard range. */
  tone: RangeTone
  /** What is measured, for screen readers, e.g. "Vitamin D". */
  label: string
  unit?: string
  format?: (value: number) => string
  /** Hide the pill over the marker (when the value is printed beside the chart). */
  hideValue?: boolean
}

const markerColor: Record<RangeTone, string> = { clear: clinic.sage, watch: clinic.watch, flag: clinic.flag }
const zones = ['rgb(208 87 79 / 0.16)', 'rgb(214 162 58 / 0.22)', '#c9d8ae', 'rgb(214 162 58 / 0.22)', 'rgb(208 87 79 / 0.16)']

const tidy = (point: number) => Number(point.toFixed(Math.abs(point) >= 100 ? 0 : Math.abs(point) >= 10 ? 1 : 2)).toString()

/**
 * Where a result sits on its ranges: a smooth track whose soft zones run from
 * below standard, through below optimal, to the optimal band in sage and out
 * again, with the result as a ring marker and its value in a pill above.
 */
export default function RangeIndicator({ value, standard, optimal, tone, label, unit = '', format = tidy, hideValue = false }: Props) {
  // The four cut points: standard low, optimal low, optimal high, standard high.
  let c1 = standard?.low ?? optimal?.low ?? null
  const c2 = optimal?.low ?? c1
  let c4 = standard?.high ?? optimal?.high ?? null
  const c3 = optimal?.high ?? c4
  if (c1 !== null && c2 !== null) c1 = Math.min(c1, c2)
  if (c3 !== null && c4 !== null) c4 = Math.max(c3, c4)
  const known = [c1, c2, c3, c4, value].filter((point): point is number => point !== null)
  const spread = Math.max(...known) - Math.min(...known) || Math.abs(value) || 1
  const floor = Math.min(value - spread * 0.08, (c1 ?? c3 ?? value) - spread * 0.25)
  const start = (c1 ?? 0) >= 0 ? Math.max(0, floor) : floor
  const end = Math.max(value + spread * 0.08, (c4 ?? c2 ?? value) + spread * 0.25)
  const cuts = [start, c1 ?? start, c2 ?? c1 ?? start, c3 ?? end, c4 ?? end, end]
  for (let index = 1; index < cuts.length; index++) cuts[index] = Math.max(cuts[index], cuts[index - 1])
  const at = (point: number) => clamp(((point - start) / (end - start || 1)) * 100, 0, 100)
  const position = at(value)
  // As shares of 100: flex-grow values that sum below 1 would leave the track part-empty.
  const widths = cuts.slice(1).map((cut, index) => ((cut - cuts[index]) / (end - start || 1)) * 100)
  const optimalText = optimal && (optimal.low !== null || optimal.high !== null) ? `optimal ${optimal.low ?? '<'}${optimal.low !== null && optimal.high !== null ? '–' : ''}${optimal.high ?? ''}` : ''
  const text = `${format(value)}${unit ? ` ${unit}` : ''}`

  return <div role="img" aria-label={`${label}: ${text}${optimalText ? `, ${optimalText}` : ''}`} className={hideValue ? 'pt-1' : 'pt-7'}>
    <div className="relative">
      <div className="flex h-2.5 gap-[2px]" aria-hidden="true">
        {widths.map((width, index) => width > 0 && <span key={index} className="block h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: width, flexBasis: 0, background: zones[index] }} />)}
      </div>
      <div aria-hidden="true" className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left] duration-500 motion-reduce:transition-none" style={{ left: `${position}%` }}>
        {!hideValue && <span className={`absolute bottom-full mb-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums leading-4 ${tone === 'watch' ? 'text-clinic-ink' : 'text-white'} ${position < 8 ? 'left-0 -translate-x-1' : position > 92 ? 'right-0 translate-x-1' : 'left-1/2 -translate-x-1/2'}`} style={{ background: tone === 'clear' ? clinic.forest : markerColor[tone] }}>{text}</span>}
        <span className="block h-4 w-4 rounded-full border-[3.5px] bg-white shadow-[0_1px_3px_rgba(22,26,21,0.2)]" style={{ borderColor: markerColor[tone] }} />
      </div>
    </div>
    {(c2 !== null || c3 !== null) && <div className="relative mt-1.5 h-4 text-[10px] tabular-nums text-clinic-muted" aria-hidden="true">
      {c2 !== null && c2 > start && <span className="absolute -translate-x-1/2" style={{ left: `${at(c2)}%` }}>{tidy(c2)}</span>}
      {c3 !== null && c3 < end && c3 !== c2 && <span className="absolute -translate-x-1/2" style={{ left: `${at(c3)}%` }}>{tidy(c3)}</span>}
    </div>}
  </div>
}
