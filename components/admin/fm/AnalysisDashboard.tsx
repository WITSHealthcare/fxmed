'use client'

import { useMemo, useState } from 'react'
import { CheckCircleIcon, FileTextIcon, MagnifyingGlassIcon, TrendDownIcon, TrendUpIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import {
  FM_STATUS_LABEL, LAB_STATUS_LABEL, STATUS_COLOR, deviation, panelById, summarize,
  type AssessedEntry, type FmEntry, type FmNarrative,
} from '@/lib/fmBiomarkers'
import { inputClass } from './ResultsEntry'

// The analysis as a clinician reads it on screen: headline counts, the
// out-of-range results ranked by how far out they are, panel scores, and a
// searchable table where any marker opens its detail.

function Stat({ label, value, sub, color, Icon }: { label: string; value: number; sub?: string; color: string; Icon: typeof FileTextIcon }) {
  return <div className="rounded-[18px] border border-green-deep/10 bg-white p-5" style={{ borderTop: `4px solid ${color}` }}>
    <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-text-mid">{label}</p><p className="mt-1 text-3xl font-bold" style={{ color }}>{value}</p>{sub && <p className="text-[11px] text-text-mid">{sub}</p>}</div><Icon size={28} weight="duotone" style={{ color }} /></div>
  </div>
}

const pct = (part: number, total: number) => total ? `${Math.round((part / total) * 100)}%` : ''

export default function AnalysisDashboard({ entries, narrative }: { entries: FmEntry[]; narrative: FmNarrative }) {
  const summary = useMemo(() => summarize(entries), [entries])
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState('all')
  const [basis, setBasis] = useState<'fm' | 'lab'>('fm')
  const [selected, setSelected] = useState<AssessedEntry | null>(null)

  if (!summary.total) return <div className="rounded-[20px] border border-green-deep/10 bg-white p-10 text-center text-sm text-text-mid">Enter or import results to see the analysis.</div>

  const outOfRange = summary.assessed
    .map(entry => {
      const status = basis === 'fm' ? entry.fm : entry.lab
      const range = basis === 'fm' ? entry.fmRangeParsed : entry.labRangeParsed
      return { entry, status, amount: deviation(entry.numeric, range) }
    })
    .filter(item => item.status === 'high' || item.status === 'low')
    .sort((a, b) => Number(b.entry.urgent) - Number(a.entry.urgent) || b.amount - a.amount)
  const largest = Math.max(1, ...outOfRange.map(item => item.amount))
  const query = search.trim().toLowerCase()
  const rows = summary.assessed.filter(entry => (panel === 'all' || entry.panel === panel) && (!query || entry.name.toLowerCase().includes(query)))

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Stat label="Total markers" value={summary.total} color="#14261E" Icon={FileTextIcon} />
      <Stat label="Normal / optimal (FM)" value={summary.inRange} sub={pct(summary.inRange, summary.total)} color="#1A6B53" Icon={CheckCircleIcon} />
      <Stat label="High (FM)" value={summary.high} sub={pct(summary.high, summary.total)} color="#C53030" Icon={TrendUpIcon} />
      <Stat label="Low (FM)" value={summary.low} sub={pct(summary.low, summary.total)} color="#1D64C8" Icon={TrendDownIcon} />
      <Stat label="Urgent markers" value={summary.urgent.length} color="#B5102B" Icon={WarningIcon} />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 font-bold text-green-deep"><WarningIcon size={20} className="text-red-600" />Out-of-range results ({outOfRange.length})</h4>
          <div className="flex rounded-full bg-cream/60 p-1 text-xs font-bold">{(['fm', 'lab'] as const).map(item => <button key={item} type="button" onClick={() => setBasis(item)} className={`rounded-full px-3 py-1.5 ${basis === item ? 'bg-green-deep text-white' : 'text-text-mid'}`}>{item === 'fm' ? 'vs FM optimal' : 'vs lab range'}</button>)}</div>
        </div>
        <div className="mt-4 space-y-2.5">{outOfRange.length ? outOfRange.map(({ entry, status, amount }) => {
          const color = STATUS_COLOR[status]
          return <button key={`${entry.panel}:${entry.name}`} type="button" onClick={() => setSelected(entry)} className="block w-full rounded-xl border border-green-deep/10 p-3 text-left transition hover:shadow-md">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-bold text-green-deep">{status === 'low' ? <TrendDownIcon size={16} style={{ color }} /> : <TrendUpIcon size={16} style={{ color }} />}{entry.name}{entry.urgent && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] text-white">URGENT</span>}</span>
              <span className="font-bold" style={{ color }}>{entry.value} <span className="text-xs font-normal text-text-mid">{entry.unit}</span></span>
            </div>
            <div className="mt-2 h-5 overflow-hidden rounded bg-gray-100"><div className="flex h-full items-center justify-end pr-2 text-[10px] font-bold text-white" style={{ width: `${Math.max(6, (amount / largest) * 100)}%`, background: color }}>{amount >= 1 ? `${amount.toFixed(0)}% ${status === 'low' ? 'below' : 'above'}` : ''}</div></div>
            <p className="mt-1.5 text-[11px] text-text-mid">{basis === 'fm' ? 'FM optimal' : 'Lab range'}: {(basis === 'fm' ? entry.fmRange : entry.labRange) || '—'} {entry.unit} · {panelById(entry.panel).name}{entry.note ? ` · ${entry.note}` : ''}</p>
          </button>
        }) : <p className="py-6 text-center text-sm text-text-mid">Every result is within range.</p>}</div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
          <h4 className="font-bold text-green-deep">Panel health scores</h4>
          <p className="mt-1 text-xs text-text-mid">Share of each panel&apos;s markers within FM optimal; borderline counts half.</p>
          <div className="mt-4 space-y-3">{summary.panels.map(item => <div key={item.panel.id}>
            <div className="flex justify-between text-sm"><span className="font-semibold text-green-deep">{item.panel.name}</span><span className="font-bold" style={{ color: item.panel.color }}>{item.score ?? '—'}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-green-deep/10"><div className="h-full rounded-full" style={{ width: `${item.score ?? 0}%`, background: item.panel.color }} /></div>
            {narrative.panels[item.panel.id]?.summary && <p className="mt-1 text-[11px] text-text-mid">{narrative.panels[item.panel.id]!.summary}</p>}
          </div>)}</div>
        </div>
        {narrative.findings.length > 0 && <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
          <h4 className="font-bold text-green-deep">Key findings</h4>
          <div className="mt-3 space-y-2">{narrative.findings.map((item, index) => <div key={index} className={`rounded-lg border-l-4 p-3 text-sm ${item.priority === 'urgent' ? 'border-red-700 bg-red-50' : item.priority === 'high' ? 'border-red-500 bg-red-50/60' : 'border-amber-500 bg-amber-50'}`}><p className="font-bold">{item.title}</p><p className="mt-1 text-xs text-text-mid">{item.detail}</p></div>)}</div>
        </div>}
      </div>
    </section>

    <section className="rounded-[20px] border border-green-deep/10 bg-white p-5">
      <h4 className="font-bold text-green-deep">All results with clinical context</h4>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="relative"><MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search biomarkers…" className={`${inputClass} pl-9`} /></div>
        <select value={panel} onChange={event => setPanel(event.target.value)} className={inputClass}><option value="all">All panels</option>{summary.panels.map(item => <option key={item.panel.id} value={item.panel.id}>{item.panel.name}</option>)}</select>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
        <thead><tr className="bg-green-deep text-left text-xs uppercase tracking-wide text-white"><th className="px-3 py-2.5">Panel</th><th className="px-3 py-2.5">Biomarker</th><th className="px-3 py-2.5 text-right">Result</th><th className="px-3 py-2.5">Lab range</th><th className="px-3 py-2.5">FM optimal</th><th className="px-3 py-2.5">Lab</th><th className="px-3 py-2.5">FM</th></tr></thead>
        <tbody>{rows.map((entry, index) => <tr key={`${entry.panel}:${entry.name}:${index}`} onClick={() => setSelected(entry)} className={`cursor-pointer border-b border-green-deep/5 hover:bg-cream/40 ${index % 2 ? 'bg-[#F7FAF8]' : ''}`}>
          <td className="px-3 py-2 text-xs text-text-mid">{panelById(entry.panel).short}</td>
          <td className="px-3 py-2 font-semibold text-green-deep">{entry.name}</td>
          <td className="px-3 py-2 text-right font-bold" style={{ color: STATUS_COLOR[entry.fm] }}>{entry.value} <span className="text-xs font-normal text-text-mid">{entry.unit}</span></td>
          <td className="px-3 py-2 text-xs text-text-mid">{entry.labRange || '—'}</td>
          <td className="px-3 py-2 text-xs font-semibold text-green-mid">{entry.fmRange || '—'}</td>
          <td className="px-3 py-2 text-[11px] font-bold" style={{ color: STATUS_COLOR[entry.lab] }}>{LAB_STATUS_LABEL[entry.lab]}</td>
          <td className="px-3 py-2 text-[11px] font-bold" style={{ color: STATUS_COLOR[entry.fm] }}>{FM_STATUS_LABEL[entry.fm]}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
      <div className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: panelById(selected.panel).color }}>{panelById(selected.panel).name}</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{selected.name}</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="Close" className="rounded-full p-1.5 hover:bg-cream"><XIcon size={20} /></button></div>
        <p className="mt-4 text-4xl font-bold" style={{ color: STATUS_COLOR[selected.fm] }}>{selected.value} <span className="text-base font-normal text-text-mid">{selected.unit}</span></p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-cream/50 p-3"><p className="text-xs text-text-mid">Lab range</p><p className="font-bold">{selected.labRange || '—'}</p><p className="mt-1 text-xs font-bold" style={{ color: STATUS_COLOR[selected.lab] }}>{LAB_STATUS_LABEL[selected.lab]}{deviation(selected.numeric, selected.labRangeParsed) >= 1 ? ` · ${deviation(selected.numeric, selected.labRangeParsed).toFixed(0)}% out` : ''}</p></div>
          <div className="rounded-xl bg-green-deep/5 p-3"><p className="text-xs text-text-mid">FM optimal</p><p className="font-bold">{selected.fmRange || '—'}</p><p className="mt-1 text-xs font-bold" style={{ color: STATUS_COLOR[selected.fm] }}>{FM_STATUS_LABEL[selected.fm]}{deviation(selected.numeric, selected.fmRangeParsed) >= 1 ? ` · ${deviation(selected.numeric, selected.fmRangeParsed).toFixed(0)}% out` : ''}</p></div>
        </div>
        <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><strong>Clinical implication:</strong> {selected.note || 'Generate the interpretation, or add a note to this marker in the results table.'}</div>
      </div>
    </div>}
  </div>
}
