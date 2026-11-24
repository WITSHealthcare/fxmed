import type { ReactNode } from 'react'
import { clinic } from './shared'

export type GaugeSegment = { value: number; label: string; color?: string }

type Props = {
  segments: GaugeSegment[]
  /** The whole arc. Defaults to the segments' sum; anything left over shows as track. */
  total?: number
  /** What the gauge shows, for screen readers, e.g. "Markers by result". */
  label: string
  /** The big figure and caption under the arc. */
  children?: ReactNode
  legend?: boolean
  format?: (value: number) => string
  className?: string
}

const palette = [clinic.sage, clinic.mustard, clinic.lilac, clinic.forest]
// The arc in its own units: a half circle of radius 80, stroke 16.
const R = 80, STROKE = 16, CX = 100, CY = 96
const ARC = `M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`
// A round cap reaches half the stroke past its end; in pathLength (0 to 100) units:
const CAP = ((STROKE / 2) / (Math.PI * R)) * 100
const GAP = 2.6

/**
 * A half-circle gauge split into rounded segments (sage, mustard, lilac by
 * default), with whatever sits in the middle below the arc.
 */
export default function Gauge({ segments, total, label, children, legend = true, format = String, className = '' }: Props) {
  const shown = segments.filter(segment => segment.value > 0)
  const sum = shown.reduce((acc, segment) => acc + segment.value, 0)
  const whole = Math.max(total ?? sum, sum)
  const hasRest = whole > sum
  const colorOf = (segment: GaugeSegment) => segment.color || palette[segments.indexOf(segment) % palette.length]
  let start = 0
  const arcs = whole ? shown.map((segment, index) => {
    const size = (segment.value / whole) * 100
    const from = start + CAP + (index > 0 ? GAP / 2 : 0)
    const to = start + size - CAP - (index < shown.length - 1 || hasRest ? GAP / 2 : 0)
    const mid = start + size / 2
    start += size
    // Too small for a stroke: a round dot in the middle of its share.
    return { segment, from: to > from ? from : mid, length: to > from ? to - from : 0.01 }
  }) : []

  return <div className={`flex flex-col items-center ${className}`}>
    <div className="relative w-full max-w-[280px]" role="img" aria-label={`${label}: ${shown.map(segment => `${segment.label} ${format(segment.value)}`).join(', ')}${hasRest ? ` of ${format(whole)}` : ''}`}>
      <svg viewBox="0 0 200 106" className="block w-full overflow-visible" aria-hidden="true">
        <path d={ARC} pathLength={100} fill="none" stroke={clinic.sageLight} strokeOpacity={hasRest || !whole ? 1 : 0} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${100 - 2 * CAP} 100`} strokeDashoffset={-CAP} />
        {arcs.map(({ segment, from, length }) => <path
          key={segment.label} d={ARC} pathLength={100} fill="none" stroke={colorOf(segment)}
          strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${length} 100`} strokeDashoffset={-from} className="chart-grow"
        />)}
      </svg>
      {children && <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center" aria-hidden="true">{children}</div>}
    </div>
    {legend && <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-clinic-muted" aria-hidden="true">
      {segments.map(segment => <li key={segment.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colorOf(segment) }} />{segment.label}<span className="font-medium tabular-nums text-clinic-ink">{format(segment.value)}</span></li>)}
    </ul>}
  </div>
}
