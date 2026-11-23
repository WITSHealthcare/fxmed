import { clamp, clinic } from './shared'

export type Segment = { value: number; label: string; color?: string }
export type Marker = { at: number; label: string }

type Props = {
  segments: Segment[]
  /** The whole bar. What the segments don't fill shows as a striped remainder. */
  total: number
  /** What the bar shows, for screen readers, e.g. "Revenue secured against target". */
  label: string
  /** Pins above the bar, at a value along it (a target, today, a threshold). */
  markers?: Marker[]
  height?: number
  /** Show a key under the bar. */
  legend?: boolean
  format?: (value: number) => string
}

const palette = [clinic.sage, clinic.mustard, clinic.lilac, clinic.forest]

/**
 * A rounded bar split into filled segments, with the unfilled rest striped,
 * and optional marker pins above it.
 */
export default function SegmentedBar({ segments, total, label, markers = [], height = 14, legend = false, format = String }: Props) {
  const whole = Math.max(total, segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0), 0)
  const filled = segments.filter(segment => segment.value > 0)
  const used = filled.reduce((sum, segment) => sum + segment.value, 0)
  const rest = whole - used
  const summary = `${label}: ${segments.map(segment => `${segment.label} ${format(segment.value)}`).join(', ')}${rest > 0 ? `, ${format(rest)} remaining` : ''} of ${format(whole)}`

  return <div role="img" aria-label={summary}>
    <div className={`relative ${markers.length ? 'pt-7' : ''}`}>
      {markers.map(marker => {
        const left = whole ? clamp((marker.at / whole) * 100, 0, 100) : 0
        // Pins near either end hang their label inwards so it stays on the card.
        const align = left < 10 ? '-translate-x-px items-start' : left > 90 ? '-translate-x-[calc(100%-3px)] items-end' : '-translate-x-1/2 items-center'
        return <div key={marker.label} aria-hidden="true" className={`absolute top-0 flex flex-col ${align}`} style={{ left: `${left}%` }}>
          <span className="whitespace-nowrap rounded-full bg-clinic-forest px-2 py-0.5 text-[10px] font-medium leading-4 text-white">{marker.label}</span>
          <span className="h-2 w-0.5 rounded-full bg-clinic-forest" />
        </div>
      })}
      <div className="flex w-full gap-1" style={{ height }} aria-hidden="true">
        {filled.map((segment, index) => <span
          key={segment.label}
          className="chart-grow-x block min-w-[6px] rounded-full"
          style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color || palette[index % palette.length] }}
        />)}
        {rest > 0 && <span
          className="block min-w-[6px] rounded-full"
          style={{ flexGrow: rest, flexBasis: 0, backgroundColor: 'rgb(22 26 21 / 0.04)', backgroundImage: 'repeating-linear-gradient(-45deg, rgb(22 26 21 / 0.13) 0 2px, transparent 2px 7px)' }}
        />}
        {!whole && <span className="block flex-1 rounded-full bg-[rgb(22_26_21/0.06)]" />}
      </div>
    </div>
    {legend && <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-clinic-muted" aria-hidden="true">
      {segments.map((segment, index) => <li key={segment.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: segment.color || palette[index % palette.length] }} />{segment.label}<span className="font-medium tabular-nums text-clinic-ink">{format(segment.value)}</span></li>)}
      {rest > 0 && <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgb(22 26 21 / 0.3) 0 1px, transparent 1px 3px)' }} />Remaining<span className="font-medium tabular-nums text-clinic-ink">{format(rest)}</span></li>}
    </ul>}
  </div>
}
