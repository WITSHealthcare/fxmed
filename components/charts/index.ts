// The clinic chart kit: hand-built SVG charts in the sage theme, with no
// chart library. Each one names itself for screen readers and skips its
// draw-in animation when the reader prefers less motion (app/globals.css).
export { default as AreaLine, type AreaPoint } from './AreaLine'
export { default as ProgressRing } from './ProgressRing'
export { default as SegmentedBar, type Segment, type Marker } from './SegmentedBar'
export { default as Gauge, type GaugeSegment } from './Gauge'
export { clinic } from './shared'
