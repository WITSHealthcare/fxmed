'use client'

import { useEffect, useRef, useState } from 'react'

// The clinic palette as plain values, for SVG attributes and inline styles.
// Keep in step with the clinic-* tokens in tailwind.config.js and the
// --clinic-* variables in app/globals.css.
export const clinic = {
  bg: '#ecece9',
  card: '#f8f8f6',
  ink: '#161a15',
  muted: '#6d726b',
  sage: '#6f9a4e',
  sageLight: '#dfe8cf',
  sageTint: '#c9d8ae',
  forest: '#13261a',
  lilac: '#d8b4e6',
  mustard: '#dcc54a',
  flag: '#d0574f',
  watch: '#d6a23a',
  clear: '#6f9a4e',
} as const

/** The width of an element, kept current as it resizes. 0 until measured. */
export function useWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * A smooth path through points that never overshoots them (monotone cubic,
 * Fritsch–Carlson tangents), so a smoothed line still peaks at the real peak.
 * Points must be in increasing x order.
 */
export function monotonePath(points: Array<[number, number]>) {
  const n = points.length
  if (!n) return ''
  const [x0, y0] = points[0]
  if (n === 1) return `M${x0},${y0}`
  if (n === 2) return `M${x0},${y0}L${points[1][0]},${points[1][1]}`
  const dx: number[] = [], slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0])
    slope.push(dx[i] ? (points[i + 1][1] - points[i][1]) / dx[i] : 0)
  }
  const tangent = new Array<number>(n)
  tangent[0] = slope[0]
  tangent[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0
      ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i])
  }
  let path = `M${x0.toFixed(1)},${y0.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = points[i], [xb, yb] = points[i + 1], third = dx[i] / 3
    path += `C${(xa + third).toFixed(1)},${(ya + tangent[i] * third).toFixed(1)} ${(xb - third).toFixed(1)},${(yb - tangent[i + 1] * third).toFixed(1)} ${xb.toFixed(1)},${yb.toFixed(1)}`
  }
  return path
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
