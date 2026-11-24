'use client'

import { WarningIcon } from '@phosphor-icons/react'
import { RangeIndicator, StatusChip, type ChipTone, type RangeTone } from '@/components/charts'
import type { GutAssessment, GutTone } from '@/lib/stoolAssessment'
import { parseStoolNumber, parseStoolReference, stoolNeedsReview, stoolStatus, STOOL_STATUS_LABEL, type StoolEntry, type StoolTest } from '@/lib/stoolMarkers'

// The stool test on the Clinical read: gut findings first, then where each
// bacterium and gut marker sits against the lab's own reference. It sits
// beside the blood analysis and never changes its scores.

const CHIP_WORD: Record<GutTone, string> = { flag: 'Flag', watch: 'Watch', clear: 'Clear', nodata: 'Not tested' }

/** 2.1e7 for big counts, plain numbers otherwise. */
export function sci(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value !== 0 && (Math.abs(value) >= 1e4 || Math.abs(value) < 0.01)) return value.toExponential(1).replace('e+', 'e')
  return Number(value.toFixed(value >= 100 ? 0 : 2)).toString()
}

function toneOf(entry: StoolEntry): RangeTone {
  const status = stoolStatus(entry)
  if (stoolNeedsReview(entry, status)) return 'flag'
  return status === 'high' || status === 'low' || status === 'detected' ? 'watch' : 'clear'
}

/** A bacterium on a log scale: counts run over several powers of ten. */
function LogRow({ entry }: { entry: StoolEntry }) {
  const reference = parseStoolReference(entry.reference)
  const number = parseStoolNumber(entry.value)
  const belowLimit = /<\s*d\.?l|not\s*detected/i.test(entry.value) || number === null
  const low = reference?.low != null && reference.low > 0 ? Math.log10(reference.low) : null
  const high = reference?.high != null && reference.high > 0 ? Math.log10(reference.high) : null
  const floor = (low ?? high ?? 3) - 1.5
  const value = belowLimit || !number || number <= 0 ? floor : Math.log10(number)
  // A one-sided reference ("> 6.7e7") still gets a visible in-range band, two
  // powers of ten wide; only the printed limit is labelled.
  const bounds = { low: low ?? (high !== null ? high - 2 : null), high: high ?? (low !== null ? low + 2 : null) }
  const real = (log: number) => (low !== null && Math.abs(log - low) < 1e-9) || (high !== null && Math.abs(log - high) < 1e-9)
  return <div className="grid items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_6rem]">
    <p className="text-sm text-clinic-ink">{entry.name}</p>
    <RangeIndicator value={value} standard={bounds} optimal={bounds} tone={toneOf(entry)} label={entry.name} valueText={entry.value} rangeText={`reference ${entry.reference}`} format={log => sci(10 ** log)} tickFormat={log => real(log) ? sci(10 ** log) : ''} />
    <p className="text-right text-xs font-medium" style={{ color: toneOf(entry) === 'clear' ? '#4f7a35' : toneOf(entry) === 'flag' ? '#b8433b' : '#a87a1c' }}>{STOOL_STATUS_LABEL[stoolStatus(entry)]}</p>
  </div>
}

/** A gut health marker on its own linear scale. */
function LinearRow({ entry }: { entry: StoolEntry }) {
  const reference = parseStoolReference(entry.reference)
  const number = parseStoolNumber(entry.value)
  const bounds = { low: reference?.low ?? null, high: reference?.high ?? null }
  const value = /<\s*d\.?l|not\s*detected/i.test(entry.value) || number === null ? 0 : number
  return <div className="grid items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_6rem]">
    <p className="text-sm text-clinic-ink">{entry.name}</p>
    <RangeIndicator value={value} standard={bounds} optimal={bounds} tone={toneOf(entry)} label={entry.name} unit={entry.unit} valueText={entry.value} rangeText={`reference ${entry.reference}`} />
    <p className="text-right text-xs font-medium" style={{ color: toneOf(entry) === 'clear' ? '#4f7a35' : toneOf(entry) === 'flag' ? '#b8433b' : '#a87a1c' }}>{STOOL_STATUS_LABEL[stoolStatus(entry)]}</p>
  </div>
}

export default function GutPanel({ stool, assessment }: { stool: StoolTest; assessment: GutAssessment }) {
  const filled = stool.entries.filter(entry => entry.value.trim() && stoolStatus(entry) !== 'unknown')
  const bacteria = filled.filter(entry => (entry.section === 'commensal' || entry.section === 'phyla') && entry.markerId !== 'firmicutes_bacteroidetes_ratio' && parseStoolReference(entry.reference))
  const markers = filled.filter(entry => ['digestion', 'gi_markers', 'immune', 'inflammation', 'barrier'].includes(entry.section) && parseStoolReference(entry.reference))
  const detected = filled.filter(entry => ['pathogen', 'h_pylori', 'overgrowth', 'inflammatory', 'fungi', 'virus', 'parasite', 'worm'].includes(entry.section) && (stoolStatus(entry) === 'high' || stoolStatus(entry) === 'detected'))
  const tested = assessment.findings.filter(finding => finding.tone !== 'nodata')

  return <section className="clinic-card rounded-card p-5 sm:p-6" aria-labelledby="gut-panel-title">
    <div className="max-w-3xl">
      <h4 id="gut-panel-title" className="text-lg text-clinic-ink">Gut <span className="text-clinic-muted">· {stool.lab || 'Stool test'}{stool.collectedAt ? `, collected ${stool.collectedAt}` : ''}</span></h4>
      <p className="mt-1 text-sm text-clinic-muted">From the stool test, read against the lab&apos;s own references. It sits beside the blood results and does not change their scores; gut-related areas in the Systems view show it as stool evidence.</p>
    </div>

    {assessment.review.length > 0 && <div role="alert" className="mt-4 flex gap-3 rounded-[18px] bg-[#f6dcd9] p-4 text-sm text-[#7d2a24]">
      <WarningIcon size={20} weight="fill" className="mt-0.5 shrink-0" />
      <p><span className="font-semibold">Review with the clinician first: </span>{assessment.review.map(result => result.entry.name).join(', ')}. These need a clinical decision before any plan.</p>
    </div>}

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{assessment.findings.map(finding => <div key={finding.id} className={`flex flex-col rounded-[22px] p-4 ${finding.tone === 'nodata' ? 'bg-clinic-bg/40' : 'bg-clinic-bg/60'}`}>
      <div className="flex items-start justify-between gap-3"><h5 className={`text-[15px] font-semibold leading-snug ${finding.tone === 'nodata' ? 'text-clinic-muted' : 'text-clinic-ink'}`}>{finding.title}</h5><StatusChip tone={finding.tone as ChipTone}>{CHIP_WORD[finding.tone]}</StatusChip></div>
      <p className="mt-2 text-[13px] leading-snug text-clinic-muted">{finding.tone === 'nodata' ? 'Not in this stool test.' : finding.summary || 'Nothing outside the lab\'s reference.'}</p>
    </div>)}</div>
    {!tested.length && <p className="mt-3 text-sm text-clinic-muted">No stool results have been entered yet.</p>}

    {detected.length > 0 && <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-clinic-muted">Above threshold</p>
      <div className="mt-2 flex flex-wrap gap-2">{detected.map(entry => <span key={entry.name} className="rounded-full bg-clinic-bg/70 px-3 py-1.5 text-xs text-clinic-ink">{entry.name} <span className="font-semibold tabular-nums" style={{ color: toneOf(entry) === 'flag' ? '#b8433b' : '#a87a1c' }}>{entry.value}</span> <span className="text-clinic-muted">({entry.reference})</span></span>)}</div>
    </div>}

    {bacteria.length > 0 && <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-clinic-muted">Microbiome balance · log scale</p>
      <div className="mt-1 divide-y divide-clinic-ink/[0.06]">{bacteria.map(entry => <LogRow key={entry.name} entry={entry} />)}</div>
    </div>}

    {markers.length > 0 && <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-clinic-muted">Digestion, immunity, inflammation and barrier</p>
      <div className="mt-1 divide-y divide-clinic-ink/[0.06]">{markers.map(entry => <LinearRow key={entry.name} entry={entry} />)}</div>
    </div>}
  </section>
}
