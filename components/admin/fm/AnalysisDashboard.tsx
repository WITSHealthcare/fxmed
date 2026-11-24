'use client'

import { useMemo, useState } from 'react'
import { CheckCircleIcon, FileTextIcon, MagnifyingGlassIcon, TrendDownIcon, TrendUpIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { AREAS, AREA_GROUPS, PLAN_PARTS, analyse, planFor, priorityOf, type AreaGroup, type AreaResult } from '@/lib/fmAssessment'
import {
  FM_STATUS_LABEL, LAB_STATUS_LABEL, PRIORITY_COLOR, STATUS_COLOR, deviation, panelById,
  type AssessedEntry, type FmEntry, type FmNarrative, type Sex,
} from '@/lib/fmBiomarkers'
import { markerExplanation } from '@/lib/fmMarkerInfo'
import { inputClass } from './ResultsEntry'
import GutPanel from './GutPanel'
import { GUT_AREAS, assessStool, gutEvidence, worstTone, type GutAssessment } from '@/lib/stoolAssessment'
import type { StoolTest } from '@/lib/stoolMarkers'
import { Gauge, MiniBars, RangeIndicator, SegmentedBar, StatusChip, clinic, type ChipTone, type RangeTone } from '@/components/charts'

// The clinical read on screen, laid out like the FxMed Twin: headline counts,
// a tile for each panel, a systems view with a status and support score for
// each body system and nutrient, the results outside range against both
// ranges, the care plan's focus areas, and a searchable table where any
// marker opens its detail.

function Stat({ label, value, sub, color, Icon }: { label: string; value: number; sub?: string; color: string; Icon: typeof FileTextIcon }) {
  return <div className="clinic-card rounded-card p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-[13px] font-medium text-clinic-muted">{label}</p><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: color }}><Icon size={18} weight="bold" className="text-clinic-ink" /></span></div>
    <p className="clinic-number mt-3 text-[2.4rem] leading-none text-clinic-ink">{value}</p>{sub && <p className="mt-1.5 text-xs text-clinic-muted">{sub}</p>}
  </div>
}

const pct = (part: number, total: number) => total ? `${Math.round((part / total) * 100)}%` : ''
const markers = (item: AreaResult) => item.contributors.map(({ entry, direction }) => `${entry.name} ${direction === 'low' ? '↓' : '↑'}`).join(', ')

// The report's support-score scale: worth watching from 50% (the plan threshold), needs support from 70%.
// Each fills with a soft gradient in its tone, as in the FxMed Twin.
const LIKELIHOOD_FILL = {
  clear: 'linear-gradient(90deg, #a9c98a, #6f9a4e)',
  watch: 'linear-gradient(90deg, #ead39a, #d6a23a)',
  flag: 'linear-gradient(90deg, #e3a19b, #d0574f)',
}
function Likelihood({ score, name }: { score: number; name: string }) {
  const fill = LIKELIHOOD_FILL[score >= 70 ? 'flag' : score >= 50 ? 'watch' : 'clear']
  return <SegmentedBar label={`${name} support score`} total={100} height={8} segments={[{ value: score, label: 'Support score', color: fill }]} format={value => `${value}%`} />
}

/** Flag outside the lab's standard range, watch outside FM optimal only, clear otherwise. */
const toneOf = (entry: AssessedEntry): RangeTone => entry.lab === 'high' || entry.lab === 'low' ? 'flag' : entry.fm === 'high' || entry.fm === 'low' || entry.fm === 'borderline' ? 'watch' : 'clear'
const TONE_TEXT: Record<RangeTone, string> = { flag: '#b8433b', watch: '#a87a1c', clear: '#4f7a35' }

/** A system's status chip on the report's support-score scale. */
const chipOf = (item: AreaResult): ChipTone => !item.considered.length ? 'nodata' : item.score >= 70 ? 'flag' : item.score >= 50 ? 'watch' : 'clear'
const SEVERITY: Record<RangeTone, number> = { clear: 0.35, watch: 0.68, flag: 1 }
const rangeText = (range: AssessedEntry['fmRangeParsed']) => !range ? '—' : range.low !== null && range.high !== null ? `${range.low}–${range.high}` : range.low !== null ? `≥ ${range.low}` : `≤ ${range.high}`

/** A panel as a check-in style tile: its score, a bar for each marker, and how many sit outside range. */
function PanelTile({ name, score, entries, onOpen }: { name: string; score: number | null; entries: AssessedEntry[]; onOpen: () => void }) {
  const tones = entries.map(toneOf)
  const out = tones.filter(tone => tone !== 'clear').length
  const flagged = tones.filter(tone => tone === 'flag').length
  return <button type="button" onClick={onOpen} className="rounded-[22px] bg-clinic-bg/60 p-4 text-left transition hover:bg-clinic-bg" aria-label={`${name}: score ${score ?? 'not scored'}, ${out} of ${entries.length} outside FM optimal`}>
    <p className="truncate text-[13px] text-clinic-muted">{name}</p>
    <p className="mt-1.5 text-[1.9rem] leading-none tracking-[-0.03em] text-clinic-ink">{score ?? '—'}<span className="ml-0.5 text-sm text-clinic-muted">{score !== null ? '/100' : ''}</span></p>
    <div className="mt-3"><MiniBars bars={entries.map((entry, index) => ({ value: SEVERITY[tones[index]], tone: tones[index], label: entry.name }))} height={28} /></div>
    <p className="mt-2.5 text-xs font-medium" style={{ color: out ? TONE_TEXT[flagged ? 'flag' : 'watch'] : TONE_TEXT.clear }}>{out ? `${flagged ? '▲' : '●'} ${out} of ${entries.length} outside optimal` : `✓ all ${entries.length} in range`}</p>
  </button>
}

/** A body system or nutrient as a Systems view card: status chip, the results behind it, and its support score. */
function SystemCard({ item, gut, onMarker }: { item: AreaResult; gut: GutAssessment; onMarker: (entry: AssessedEntry) => void }) {
  // Stool evidence sits beside the blood score: the chip takes the higher of the two, and says where it came from.
  const stool = gutEvidence(gut, item.area.id)
  const blood = chipOf(item)
  const chip = stool ? worstTone([blood, stool.tone]) as ChipTone : blood
  return <div className="flex flex-col rounded-[22px] bg-clinic-bg/60 p-4">
    <div className="flex items-start justify-between gap-3"><h5 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-clinic-ink">{item.area.name}</h5><StatusChip tone={chip} /></div>
    <div className="mt-2 space-y-1 text-[13px] leading-snug">
      {item.contributors.slice(0, 3).map(({ entry, direction }) => <button key={entry.name} type="button" onClick={() => onMarker(entry)} className="block text-left text-clinic-ink hover:underline">
        {entry.name} {entry.value} <span className="text-clinic-muted">{entry.unit}</span> <span style={{ color: TONE_TEXT[toneOf(entry)] }}>{direction === 'low' ? '↓' : '↑'}</span>
        <span className="block text-xs text-clinic-muted">outside FM range {rangeText(entry.fmRangeParsed ?? entry.labRangeParsed)}</span>
      </button>)}
      {!item.contributors.length && <p className="text-clinic-muted">{item.considered.length ? `${item.considered.length} marker${item.considered.length === 1 ? '' : 's'} in range` : `Not tested${item.missing.length ? `: consider ${item.missing.slice(0, 2).join(', ')}` : ''}`}</p>}
      {item.contributors.length > 3 && <p className="text-xs text-clinic-muted">+{item.contributors.length - 3} more</p>}
      {stool && stool.findings.length > 0 && <p className="pt-1 text-xs"><span className="font-semibold" style={{ color: stool.tone === 'flag' ? TONE_TEXT.flag : TONE_TEXT.watch }}>From stool:</span> <span className="text-clinic-ink">{stool.findings.map(finding => finding.title.toLowerCase()).join(', ')}</span></p>}
      {stool && !stool.findings.length && <p className="pt-1 text-xs text-clinic-muted">Stool test: nothing outside reference</p>}
    </div>
    {item.considered.length > 0 && <div className="mt-auto pt-3">
      <div className="flex justify-between text-[11px] text-clinic-muted"><span>Support score</span><span className="tabular-nums">{item.score}%</span></div>
      <div className="mt-1"><Likelihood score={item.score} name={item.area.name} /></div>
    </div>}
  </div>
}

/** An area the blood results could not score, shown from the stool test alone. */
function StoolOnlyCard({ name, gut, areaId }: { name: string; gut: GutAssessment; areaId: string }) {
  const stool = gutEvidence(gut, areaId)
  if (!stool) return null
  return <div className="flex flex-col rounded-[22px] bg-clinic-bg/60 p-4">
    <div className="flex items-start justify-between gap-3"><h5 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-clinic-ink">{name}</h5><StatusChip tone={stool.tone as ChipTone} /></div>
    <p className="mt-2 text-[13px] leading-snug text-clinic-muted">Not scored from blood in these results.</p>
    <p className="mt-1 text-xs">{stool.findings.length
      ? <><span className="font-semibold" style={{ color: stool.tone === 'flag' ? TONE_TEXT.flag : TONE_TEXT.watch }}>From stool:</span> <span className="text-clinic-ink">{stool.findings.map(finding => finding.title.toLowerCase()).join(', ')}</span></>
      : <span className="text-clinic-muted">Stool test: nothing outside reference</span>}</p>
  </div>
}

const SCORE_GROUPS: Array<[Exclude<AreaGroup, 'plan'>, string]> = [['system', 'Core systems'], ['accessory', 'Whole-body'], ['nutrient', 'Nourishment'], ['deficiency', 'Nutrient gaps']]

export default function AnalysisDashboard({ entries, narrative, sex, age, stool = null }: { entries: FmEntry[]; narrative: FmNarrative; sex: Sex; age?: number | null; stool?: StoolTest | null }) {
  const analysis = useMemo(() => analyse(entries, sex, age), [entries, sex, age])
  const gut = useMemo(() => assessStool(stool), [stool])
  const summary = analysis.summary
  const [group, setGroup] = useState<Exclude<AreaGroup, 'plan'>>('system')
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState('all')
  const [basis, setBasis] = useState<'fm' | 'lab'>('fm')
  const [selected, setSelected] = useState<AssessedEntry | null>(null)

  if (!summary.total) return stool && gut.tested
    ? <div className="space-y-6"><p className="clinic-card rounded-card p-5 text-sm text-clinic-muted">No blood results yet: this read shows the stool test only. Add blood results to see the full analysis.</p><GutPanel stool={stool} assessment={gut} /></div>
    : <div className="rounded-[20px] border border-green-deep/10 bg-white p-10 text-center text-sm text-text-mid">Enter or import results to see the analysis.</div>

  const outOfRange = summary.assessed
    .map(entry => {
      const status = basis === 'fm' ? entry.fm : entry.lab
      const range = basis === 'fm' ? entry.fmRangeParsed : entry.labRangeParsed
      return { entry, status, amount: deviation(entry.numeric, range) }
    })
    .filter(item => item.status === 'high' || item.status === 'low')
    .sort((a, b) => Number(b.entry.urgent) - Number(a.entry.urgent) || b.amount - a.amount)
  const query = search.trim().toLowerCase()
  const rows = summary.assessed.filter(entry => (panel === 'all' || entry.panel === panel) && (!query || entry.name.toLowerCase().includes(query)))

  const card = 'clinic-card rounded-card p-5 sm:p-6'
  const toggle = (active: boolean) => `rounded-full px-3 py-1.5 font-medium transition ${active ? 'bg-clinic-forest text-white' : 'text-clinic-muted hover:text-clinic-ink'}`

  return <div className="space-y-6">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className={`${card} flex flex-col`}>
        <h4 className="text-lg text-clinic-ink">Markers against FM optimal</h4>
        <Gauge className="mt-4" label="Markers against FM optimal" total={summary.total} segments={[
          { value: summary.inRange, label: 'In range', color: clinic.sage },
          { value: summary.high, label: 'High', color: clinic.mustard },
          { value: summary.low, label: 'Low', color: clinic.lilac },
        ]}>
          <p className="clinic-number text-[2.6rem] leading-none text-clinic-ink">{pct(summary.inRange, summary.total) || '0%'}</p>
          <p className="mt-1 text-xs text-clinic-muted">in range of {summary.total}</p>
        </Gauge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <Stat label="Total markers" value={summary.total} color={clinic.sageLight} Icon={FileTextIcon} />
        <Stat label="Normal / optimal (FM)" value={summary.inRange} sub={pct(summary.inRange, summary.total)} color={clinic.sageTint} Icon={CheckCircleIcon} />
        <Stat label="High (FM)" value={summary.high} sub={pct(summary.high, summary.total)} color={clinic.mustard} Icon={TrendUpIcon} />
        <Stat label="Low (FM)" value={summary.low} sub={pct(summary.low, summary.total)} color={clinic.lilac} Icon={TrendDownIcon} />
        <Stat label="Urgent markers" value={summary.urgent.length} color={summary.urgent.length ? '#efc3bf' : clinic.sageLight} Icon={WarningIcon} />
      </div>
    </section>

    <section className={card}>
      <h4 className="text-lg text-clinic-ink">Panels at a glance</h4>
      <p className="mt-1 text-sm text-clinic-muted">Each panel&apos;s health score (share of its markers within FM optimal, borderline counting half), with a bar for each marker: taller and warmer the further it sits from optimal.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {summary.panels.map(item => <PanelTile key={item.panel.id} name={item.panel.name} score={item.score} entries={item.entries} onOpen={() => { setPanel(item.panel.id); document.getElementById('fm-all-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />)}
      </div>
    </section>

    {stool && gut.tested && <GutPanel stool={stool} assessment={gut} />}

    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h4 className="text-lg text-clinic-ink">Systems view</h4><p className="mt-1 max-w-3xl text-sm text-clinic-muted">{AREA_GROUPS[group].intro}</p></div>
        <div className="flex flex-wrap gap-1 rounded-full bg-clinic-bg p-1 text-xs">{SCORE_GROUPS.map(([id, label]) => <button key={id} type="button" onClick={() => setGroup(id)} className={toggle(group === id)}>{label}</button>)}</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {analysis.group(group).map(item => <SystemCard key={item.area.id} item={item} gut={gut} onMarker={setSelected} />)}
        {AREAS.filter(area => area.group === group && GUT_AREAS[area.id] && !analysis.group(group).some(item => item.area.id === area.id)).map(area => <StoolOnlyCard key={area.id} name={area.name} gut={gut} areaId={area.id} />)}
      </div>
      {!analysis.group(group).length && <p className="mt-4 text-sm text-clinic-muted">No results for these areas.</p>}
    </section>

    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg text-clinic-ink" style={{ color: '#4f7a35' }}>Results outside range <span className="text-clinic-muted">({outOfRange.length})</span></h4>
        <div className="flex rounded-full bg-clinic-bg p-1 text-xs">{(['fm', 'lab'] as const).map(item => <button key={item} type="button" onClick={() => setBasis(item)} className={toggle(basis === item)}>{item === 'fm' ? 'vs FM optimal' : 'vs lab range'}</button>)}</div>
      </div>
      {outOfRange.length ? <>
        <table className="mt-3 hidden w-full text-sm md:table">
          <thead><tr className="border-b border-clinic-ink/10 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-clinic-muted"><th className="py-2.5 pr-3 font-medium">Marker</th><th className="py-2.5 pr-3 font-medium">Latest</th><th className="py-2.5 pr-3 font-medium">Standard</th><th className="py-2.5 pr-3 font-medium">Functional</th><th className="w-[34%] py-2.5 font-medium">Where it sits</th></tr></thead>
          <tbody>{outOfRange.map(({ entry, status, amount }) => {
            const tone = toneOf(entry)
            return <tr key={`${entry.panel}:${entry.name}`} onClick={() => setSelected(entry)} className="cursor-pointer border-b border-clinic-ink/[0.06] align-middle transition hover:bg-clinic-bg/60">
              <td className="py-3 pr-3"><span className="flex items-center gap-2 text-clinic-ink">{entry.name}{entry.urgent && <StatusChip tone="flag">Urgent</StatusChip>}</span></td>
              <td className="py-3 pr-3 tabular-nums"><span className="font-semibold" style={{ color: TONE_TEXT[tone] }}>{entry.value}</span> <span className="text-clinic-muted">{entry.unit}</span> <span className="text-xs" style={{ color: TONE_TEXT[tone] }}>{status === 'low' ? '↓' : '↑'}{amount >= 1 ? ` ${amount.toFixed(0)}%` : ''}</span></td>
              <td className="py-3 pr-3 tabular-nums text-clinic-muted">{rangeText(entry.labRangeParsed)}</td>
              <td className="py-3 pr-3 tabular-nums text-clinic-ink">{rangeText(entry.fmRangeParsed)}</td>
              <td className="py-1">{entry.numeric !== null && <RangeIndicator value={entry.numeric} standard={entry.labRangeParsed} optimal={entry.fmRangeParsed} tone={tone} label={entry.name} unit={entry.unit} hideValue />}</td>
            </tr>
          })}</tbody>
        </table>
        <div className="mt-3 space-y-2.5 md:hidden">{outOfRange.map(({ entry, status, amount }) => {
          const tone = toneOf(entry)
          return <button key={`${entry.panel}:${entry.name}`} type="button" onClick={() => setSelected(entry)} className="block w-full rounded-[20px] bg-clinic-bg/60 px-4 pb-2 pt-3.5 text-left">
            <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-clinic-ink">{entry.name}</span><span className="shrink-0 text-xs font-medium" style={{ color: TONE_TEXT[tone] }}>{status === 'low' ? '↓' : '↑'} {amount >= 1 ? `${amount.toFixed(0)}% ${status === 'low' ? 'below' : 'above'}` : status}</span></div>
            {entry.numeric !== null && <div className="mt-1.5"><RangeIndicator value={entry.numeric} standard={entry.labRangeParsed} optimal={entry.fmRangeParsed} tone={tone} label={entry.name} unit={entry.unit} /></div>}
            <p className="text-[11px] text-clinic-muted">Standard {rangeText(entry.labRangeParsed)} · Functional {rangeText(entry.fmRangeParsed)} {entry.unit}</p>
          </button>
        })}</div>
      </> : <p className="py-6 text-center text-sm text-clinic-muted">Every result is within range.</p>}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className={card}>
        <h4 className="text-lg text-clinic-ink">Care plan focus areas ({analysis.plan.length})</h4>
        <p className="mt-1 text-xs text-clinic-muted">Areas with a support score of 50% or more, worked out from the results. Each has a plan in the report, which you can edit on the Patient report step.</p>
        <div className="mt-4 space-y-2.5">{analysis.plan.length ? analysis.plan.map(item => {
          const priority = priorityOf(item)
          const plan = planFor(item.area, narrative, analysis.child)
          return <details key={item.area.id} className="group rounded-[18px] bg-clinic-bg/60 px-4 py-3">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-clinic-ink">{item.area.name}</span>
                <span className="flex items-center gap-2"><StatusChip tone={priority === 'urgent' || priority === 'high' ? 'flag' : priority === 'moderate' ? 'watch' : 'clear'}>{priority[0].toUpperCase() + priority.slice(1)}</StatusChip><span className="font-semibold tabular-nums">{item.score}%</span></span></div>
              <div className="mt-2"><Likelihood score={item.score} name={item.area.name} /></div>
              <p className="mt-1.5 text-[11px] text-clinic-muted">{markers(item)} · <span className="font-semibold text-clinic-ink group-open:hidden">Show plan</span><span className="hidden font-semibold text-clinic-ink group-open:inline">Hide plan</span></p>
            </summary>
            <p className="mt-3 text-sm text-clinic-muted">{item.area.finding}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{PLAN_PARTS.filter(part => plan[part.key].length).map(part => <div key={part.key} className="rounded-[14px] bg-clinic-card p-3">
              <p className="text-xs font-semibold" style={{ color: part.color }}>{part.title}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-clinic-ink">{plan[part.key].map(point => <li key={point}>{point}</li>)}</ul>
            </div>)}</div>
            {item.missing.length > 0 && <p className="mt-2 text-[11px] text-clinic-muted"><span className="font-semibold">Consider testing:</span> {item.missing.join(', ')}</p>}
          </details>
        }) : <p className="py-6 text-center text-sm text-clinic-muted">No focus area reached 50%.</p>}</div>
      </div>
      <div className={card}>
        <h4 className="text-lg text-clinic-ink">What stood out</h4>
        {narrative.findings.length ? <div className="mt-3 space-y-2">{narrative.findings.map((item, index) => {
          const tone: ChipTone = item.priority === 'urgent' || item.priority === 'high' ? 'flag' : item.priority === 'moderate' ? 'watch' : 'clear'
          return <div key={index} className="rounded-[18px] bg-clinic-bg/60 p-3.5 text-sm"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-clinic-ink">{item.title}</p><StatusChip tone={tone}>{item.priority[0].toUpperCase() + item.priority.slice(1)}</StatusChip></div><p className="mt-1 text-xs leading-5 text-clinic-muted">{item.detail}</p></div>
        })}</div> : <p className="mt-3 text-sm text-clinic-muted">Findings appear here once they are written on the Patient report step.</p>}
      </div>
    </section>

    <section id="fm-all-results" className={`${card} scroll-mt-28`}>
      <h4 className="text-lg text-clinic-ink">All results with clinical context</h4>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="relative"><MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search biomarkers…" className={`${inputClass} pl-9`} /></div>
        <select value={panel} onChange={event => setPanel(event.target.value)} className={inputClass}><option value="all">All panels</option>{summary.panels.map(item => <option key={item.panel.id} value={item.panel.id}>{item.panel.name}</option>)}</select>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
        <thead><tr className="border-b border-clinic-ink/10 text-left text-[11px] uppercase tracking-[0.08em] text-clinic-muted">{['Panel', 'Biomarker', 'Result', 'Standard', 'Functional', 'Lab', 'FM'].map(name => <th key={name} className={`px-3 py-2.5 font-medium ${name === 'Result' ? 'text-right' : ''}`}>{name}</th>)}</tr></thead>
        <tbody>{rows.map((entry, index) => <tr key={`${entry.panel}:${entry.name}:${index}`} onClick={() => setSelected(entry)} className="cursor-pointer border-b border-clinic-ink/[0.06] transition hover:bg-clinic-bg/60">
          <td className="px-3 py-2 text-xs text-text-mid">{panelById(entry.panel).short}</td>
          <td className="px-3 py-2.5 text-clinic-ink">{entry.name}{entry.calculated && <span className="ml-1.5 text-[10px] font-normal text-text-mid">calculated</span>}</td>
          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: STATUS_COLOR[entry.fm] }}>{entry.value} <span className="text-xs font-normal text-text-mid">{entry.unit}</span></td>
          <td className="px-3 py-2 text-xs text-text-mid">{entry.labRange || '—'}</td>
          <td className="px-3 py-2 text-xs text-clinic-ink">{entry.fmRange || '—'}</td>
          <td className="px-3 py-2 text-[11px] font-bold" style={{ color: STATUS_COLOR[entry.lab] }}>{LAB_STATUS_LABEL[entry.lab]}</td>
          <td className="px-3 py-2 text-[11px] font-bold" style={{ color: STATUS_COLOR[entry.fm] }}>{FM_STATUS_LABEL[entry.fm]}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/30 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
      <div className="w-full max-w-lg rounded-card bg-clinic-card p-6 shadow-2xl sm:p-7" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: panelById(selected.panel).color }}>{panelById(selected.panel).name}</p><h3 className="mt-1 text-2xl text-clinic-ink">{selected.name}</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="Close" className="rounded-full p-1.5 hover:bg-cream"><XIcon size={20} /></button></div>
        <p className="clinic-number mt-4 text-[2.6rem] leading-none" style={{ color: TONE_TEXT[toneOf(selected)] }}>{selected.value} <span className="text-base text-clinic-muted">{selected.unit}</span></p>
        {selected.numeric !== null && <div className="mt-3"><RangeIndicator value={selected.numeric} standard={selected.labRangeParsed} optimal={selected.fmRangeParsed} tone={toneOf(selected)} label={selected.name} unit={selected.unit} hideValue /></div>}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[16px] bg-clinic-bg/70 p-3"><p className="text-xs text-text-mid">Lab range</p><p className="font-bold">{selected.labRange || '—'}</p><p className="mt-1 text-xs font-bold" style={{ color: STATUS_COLOR[selected.lab] }}>{LAB_STATUS_LABEL[selected.lab]}{deviation(selected.numeric, selected.labRangeParsed) >= 1 ? ` · ${deviation(selected.numeric, selected.labRangeParsed).toFixed(0)}% out` : ''}</p></div>
          <div className="rounded-[16px] bg-clinic-sage-light/70 p-3"><p className="text-xs text-text-mid">FM optimal</p><p className="font-bold">{selected.fmRange || '—'}</p><p className="mt-1 text-xs font-bold" style={{ color: STATUS_COLOR[selected.fm] }}>{FM_STATUS_LABEL[selected.fm]}{deviation(selected.numeric, selected.fmRangeParsed) >= 1 ? ` · ${deviation(selected.numeric, selected.fmRangeParsed).toFixed(0)}% out` : ''}</p></div>
        </div>
        {markerExplanation(selected.markerId, selected.fm === 'low' || selected.lab === 'low' ? 'low' : 'high') && <p className="mt-4 text-sm leading-6 text-text-mid">{markerExplanation(selected.markerId, selected.fm === 'low' || selected.lab === 'low' ? 'low' : 'high')}</p>}
        <div className="mt-4 rounded-[16px] bg-clinic-lilac/25 p-3 text-sm text-clinic-ink"><strong>Clinical implication:</strong> {selected.note || 'Write the interpretation with AI, or add a note to this marker in the results table.'}</div>
      </div>
    </div>}
  </div>
}
