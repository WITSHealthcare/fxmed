'use client'

import { useState } from 'react'
import { labelOf, roleFamilies, type RoleFamily } from '@/lib/hr'
import { defaultScorecardCompetencies, interviewLoops, scorecardRatingLabels, type HrScorecardTemplate, type ScorecardCompetency } from '@/lib/hr-recruiting'
import { Alert, Badge, Empty, Field, Modal, Section, api, call, outline, primary, showDate } from './ui'

// Scorecard templates per role family. A new version replaces the active one;
// older versions stay so past scorecards keep their anchors.
export default function Templates({ templates, reload }: { templates: HrScorecardTemplate[]; reload: () => void }) {
  const [editing, setEditing] = useState<{ family: RoleFamily; base: HrScorecardTemplate | null } | null>(null); const [open, setOpen] = useState<string | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function act(method: string, body: Record<string, unknown>) { setBusy(true); setError(''); const { ok, data } = await call(`${api}/templates`, method, body); setBusy(false); if (!ok) setError(data.error || 'Could not update templates.'); else reload() }
  const missing = roleFamilies.filter((family) => !templates.some((item) => item.role_family === family.value))
  return <><Alert>{error}</Alert>
    <Section title="Scorecard templates" description="Competencies rated 1–4 with anchors. Hire needs an average of at least the minimum, no more than the allowed 2s, and no 1 on a knockout competency." action={missing.length > 0 && <button disabled={busy} onClick={() => act('POST', { action: 'seed' })} className={primary}>Load FXMed defaults ({missing.map((item) => item.value).join(', ')})</button>}>
      {!templates.length ? <Empty>No templates yet. Load the defaults from the recruiting process.</Empty> : <div className="divide-y">{roleFamilies.map((family) => { const versions = templates.filter((item) => item.role_family === family.value); const active = versions.find((item) => item.active); return <div key={family.value} className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-lg font-bold text-green-deep">{family.value} · {family.label}</h4><p className="text-xs text-gray-500">{active ? `Version ${active.version} active · ${active.competencies.length} competencies · min average ${Number(active.min_average).toFixed(1)} · max ${active.max_twos} rating(s) of 2 · ${showDate(active.created_at)}` : 'No active template'}</p></div>
          <div className="flex flex-wrap gap-2">{active && <button onClick={() => setOpen(open === active.id ? null : active.id)} className={outline}>{open === active.id ? 'Hide' : 'View'}</button>}<button onClick={() => setEditing({ family: family.value, base: active || versions[0] || null })} className={outline}>New version</button>{versions.filter((item) => !item.active).map((item) => <button key={item.id} disabled={busy} onClick={() => act('PATCH', { id: item.id })} className={outline}>Activate v{item.version}</button>)}</div></div>
        {active && open === active.id && <ul className="mt-4 space-y-2 text-sm">{active.competencies.map((item) => <li key={item.code} className="rounded-xl bg-[#fbfaf6] p-3"><b className="text-green-deep">{item.name}</b> {item.is_core && <Badge tone="gray">Core</Badge>} {item.is_knockout && <Badge tone="red">Knockout</Badge>} <span className="text-xs text-gray-500">Steps: {item.loop_step_codes.join(', ') || 'all'}</span><ol className="mt-1 grid gap-1 text-xs text-text-mid sm:grid-cols-4">{item.anchors.map((anchor, index) => <li key={index}><b>{index + 1} {scorecardRatingLabels[index + 1]}:</b> {anchor}</li>)}</ol></li>)}</ul>}
      </div> })}</div>}
    </Section>
    {editing && <Editor family={editing.family} base={editing.base} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
  </>
}

function Editor({ family, base, onClose, onSaved }: { family: RoleFamily; base: HrScorecardTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [competencies, setCompetencies] = useState<ScorecardCompetency[]>(() => base?.competencies || defaultScorecardCompetencies(family))
  const [minAverage, setMinAverage] = useState(String(base?.min_average ?? 3)); const [maxTwos, setMaxTwos] = useState(String(base?.max_twos ?? 1)); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const steps = interviewLoops[family]; const update = (index: number, patch: Partial<ScorecardCompetency>) => setCompetencies((list) => list.map((item, i) => i === index ? { ...item, ...patch } : item))
  return <Modal title={`${labelOf(roleFamilies, family)} — new version`} eyebrow="Scorecard template" onClose={onClose} wide>
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { ok, data } = await call(`${api}/templates`, 'POST', { role_family: family, competencies, min_average: minAverage, max_twos: maxTwos }); setBusy(false); ok ? onSaved() : setError(data.error || 'Could not save.') }} className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Minimum average"><input type="number" min="1" max="4" step="0.1" value={minAverage} onChange={(e) => setMinAverage(e.target.value)} className="input" /></Field><Field label="Most ratings of 2 allowed"><input type="number" min="0" max="20" value={maxTwos} onChange={(e) => setMaxTwos(e.target.value)} className="input" /></Field></div>
      {competencies.map((item, index) => <div key={index} className="rounded-xl border p-4">
        <div className="flex gap-2"><input required maxLength={120} value={item.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="Competency" className="input" /><button type="button" onClick={() => setCompetencies((list) => list.filter((_, i) => i !== index))} className="px-2 text-red-600" aria-label="Remove competency">×</button></div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={item.is_core} onChange={(e) => update(index, { is_core: e.target.checked })} />Core</label><label className="flex items-center gap-1"><input type="checkbox" checked={item.is_knockout} onChange={(e) => update(index, { is_knockout: e.target.checked })} />Knockout (a 1 means no hire)</label>
          <span className="text-gray-500">Scored at:</span>{steps.map((step) => <label key={step.code} className="flex items-center gap-1"><input type="checkbox" checked={item.loop_step_codes.includes(step.code)} onChange={(e) => update(index, { loop_step_codes: e.target.checked ? [...item.loop_step_codes, step.code] : item.loop_step_codes.filter((code) => code !== step.code) })} />{step.code}</label>)}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((anchor) => <textarea key={anchor} required rows={2} maxLength={300} value={item.anchors[anchor] || ''} onChange={(e) => update(index, { anchors: [0, 1, 2, 3].map((i) => i === anchor ? e.target.value : item.anchors[i] || '') })} placeholder={`${anchor + 1} · ${scorecardRatingLabels[anchor + 1]}`} className="input text-xs" />)}</div>
      </div>)}
      <button type="button" onClick={() => setCompetencies((list) => [...list, { code: '', name: '', is_core: false, is_knockout: false, anchors: ['', '', '', ''], loop_step_codes: [] }])} className="text-xs font-bold text-green-mid">+ Add competency</button>
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save and activate'}</button></div>
    </form>
  </Modal>
}
