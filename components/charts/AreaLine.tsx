'use client'

import { useId, useState, type ReactNode } from 'react'
import { clamp, clinic, monotonePath, useWidth } from './shared'

export type AreaPoint = { label: string; value: number }

type Props = {
  data: AreaPoint[]
  /** What the chart shows, for screen readers, e.g. "Visitors per day". */
  ariaLabel: string
  height?: number
  color?: string
  format?: (value: number) => string
  /** The x-axis label under a point; return '' to skip it. Defaults to the point's label, thinned to fit. */
  tick?: (point: AreaPoint, index: number) => string
  /** The readout for the point under the pointer or keyboard. Defaults to "label · value". */
  readout?: (index: number) => ReactNode
}

/**
 * A smooth line over a soft gradient wash, with no gridlines. The latest value
 * sits in a dark pill on the last point. Hover, or focus it and use the arrow
 * keys, to read any point.
 */
export default function AreaLine({ data, ariaLabel, height = 220, color = clinic.sage, format = String, tick, readout }: Props) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const gradient = useId().replace(/:/g, '')
  const pad = { top: 40, right: 14, bottom: 28, left: 14 }
  const plotWidth = Math.max(0, width - pad.left - pad.right)
  const plotHeight = height - pad.top - pad.bottom
  const last = data.length - 1
  const top = Math.max(...data.map(point => point.value), 0) * 1.08 || 1
  const x = (index: number) => pad.left + (data.length === 1 ? plotWidth / 2 : (index / last) * plotWidth)
  const y = (value: number) => pad.top + plotHeight - (value / top) * plotHeight
  const points = data.map((point, index) => [x(index), y(point.value)] as [number, number])
  const line = monotonePath(points)
  const base = pad.top + plotHeight
  const area = data.length ? `${line}L${x(last).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z` : ''
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 64))))
  const tickFor = (point: AreaPoint, index: number) => tick ? tick(point, index) : (index === last || (index % every === 0 && last - index >= every)) ? point.label : ''

  const pick = (clientX: number, box: DOMRect) => {
    const position = clientX - box.left - pad.left
    setActive(clamp(data.length === 1 ? 0 : Math.round((position / Math.max(1, plotWidth)) * last), 0, last))
  }

  // The latest value's pill, kept inside the chart at either edge.
  const latest = data.length ? format(data[last].value) : ''
  const pillWidth = latest.length * 7.4 + 22
  const pillX = data.length ? clamp(x(last) - pillWidth / 2, 0, Math.max(0, width - pillWidth)) : 0
  const pillY = data.length ? Math.max(2, y(data[last].value) - 38) : 0

  return <div ref={ref} className="relative select-none">
    {width > 0 && data.length > 0 && (
      <svg width={width} height={height} role="img" aria-label={`${ariaLabel}. Latest ${latest}. Highest ${format(Math.max(...data.map(point => point.value)))}.`}>
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.34} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradient})`} className="chart-fade" />
        <path d={line} pathLength={1} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="chart-draw" />
        {data.map((point, index) => {
          const text = tickFor(point, index)
          return text ? <text key={index} x={x(index)} y={height - 8} textAnchor={index === 0 && data.length > 1 ? 'start' : index === last && data.length > 1 ? 'end' : 'middle'} fontSize={11} fill={clinic.muted}>{text}</text> : null
        })}
        {active !== null && <>
          <line x1={x(active)} x2={x(active)} y1={pad.top - 8} y2={base} stroke={clinic.ink} strokeOpacity={0.18} strokeDasharray="3 4" />
          <circle cx={x(active)} cy={y(data[active].value)} r={5} fill={clinic.card} stroke={color} strokeWidth={2.5} />
        </>}
        {active === null && <g className="chart-fade">
          <circle cx={x(last)} cy={y(data[last].value)} r={5.5} fill={clinic.card} stroke={color} strokeWidth={2.5} />
          <rect x={pillX} y={pillY} width={pillWidth} height={26} rx={13} fill={clinic.forest} />
          <text x={pillX + pillWidth / 2} y={pillY + 13} dy="0.35em" textAnchor="middle" fontSize={12} fontWeight={500} fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>{latest}</text>
        </g>}
        <rect
          x={0} y={0} width={width} height={height} fill="transparent" rx={16}
          tabIndex={0} aria-label={`${ariaLabel}. Use the left and right arrow keys to read each point.`}
          onPointerMove={event => pick(event.clientX, event.currentTarget.ownerSVGElement!.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(current => current ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(current => Math.max(0, (current ?? last) - 1)) }
            if (event.key === 'ArrowRight') { event.preventDefault(); setActive(current => Math.min(last, (current ?? last) + 1)) }
          }}
          className="cursor-crosshair outline-none focus-visible:stroke-[#6f9a4e] focus-visible:[stroke-width:2]"
        />
      </svg>
    )}
    {active !== null && data[active] && (
      <div role="status" className="pointer-events-none absolute z-10 rounded-2xl bg-clinic-forest px-3.5 py-2 text-xs text-white shadow-lg" style={{ left: clamp(x(active) - 90, 0, Math.max(0, width - 180)), top: Math.max(0, y(data[active].value) - 70), minWidth: 120, maxWidth: 180 }}>
        {readout ? readout(active) : <><p className="text-white/60">{data[active].label}</p><p className="mt-0.5 text-sm font-medium tabular-nums">{format(data[active].value)}</p></>}
      </div>
    )}
  </div>
}
