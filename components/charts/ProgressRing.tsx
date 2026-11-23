import type { ReactNode } from 'react'
import { clamp, clinic } from './shared'

type Props = {
  /** 0 to 100. */
  value: number
  /** What the ring measures, for screen readers, e.g. "Care plan steps done". */
  label: string
  size?: number
  thickness?: number
  color?: string
  track?: string
  /** What sits in the middle. Defaults to the percentage. */
  children?: ReactNode
}

/** A ring that fills clockwise from the top, with a rounded end. */
export default function ProgressRing({ value, label, size = 112, thickness = 10, color = clinic.sage, track = clinic.sageLight, children }: Props) {
  const percent = clamp(Number.isFinite(value) ? value : 0, 0, 100)
  const radius = (size - thickness) / 2
  return <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(percent)}%`}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={thickness} />
      {percent > 0 && <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
        pathLength={100} strokeDasharray={`${percent} 100`} className="chart-grow chart-sweep"
      />}
    </svg>
    <span className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none" aria-hidden="true">
      {children ?? <span className="clinic-number tabular-nums text-clinic-ink" style={{ fontSize: Math.round(size * 0.22), fontWeight: 400, letterSpacing: '-0.03em' }}>{Math.round(percent)}<span className="text-clinic-muted" style={{ fontSize: '0.55em' }}>%</span></span>}
    </span>
  </div>
}
