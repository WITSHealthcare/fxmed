'use client'

import { useState } from 'react'
import { displayDate, type HrPublicHoliday } from '@/lib/hr-performance'
import { Badge, Card, Empty, call, smallButton } from './ui'

// Federal public holidays, excluded from working-day counts. Islamic holidays
// are added once the Federal Government declares the dates.
export default function Holidays({ holidays, year, isAdmin, reload, onError, onNotice }: { holidays: HrPublicHoliday[]; year: number; isAdmin: boolean; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }) {
  const [shown, setShown] = useState(year); const [form, setForm] = useState({ holiday_date: '', name: '', confirmed: true, source: '' }); const [saving, setSaving] = useState(false)
  const list = holidays.filter((item) => item.holiday_date.startsWith(String(shown)))
  async function send(method: string, path: string, body: Record<string, unknown> | undefined, done: string) {
    setSaving(true); const result = await call(path, method, body); setSaving(false)
    if (!result.ok) { onError(result.data.error || 'Could not save.'); return false }
    onNotice(done); await reload(); return true
  }
  return <Card title="Public holidays" description="Excluded from leave working-day counts. Staff on the holiday rota get a day off in lieu within 2 months."
    action={<div className="flex items-center gap-2">{[year - 1, year, year + 1].map((item) => <button key={item} onClick={() => setShown(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${shown === item ? 'bg-green-deep text-white' : 'border text-green-deep'}`}>{item}</button>)}{isAdmin && <button disabled={saving} onClick={() => send('POST', '/holidays', { seed: shown }, `Fixed ${shown} holidays added.`)} className={smallButton}>Add fixed dates</button>}</div>}>
    {isAdmin && <form onSubmit={async (e) => { e.preventDefault(); if (await send('POST', '/holidays', form, 'Holiday saved.')) setForm({ holiday_date: '', name: '', confirmed: true, source: '' }) }} className="grid gap-3 border-b bg-[#fbfaf6] p-5 sm:grid-cols-[160px_1fr_1fr_auto_auto]">
      <input required type="date" aria-label="Date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} className="input" />
      <input required maxLength={160} aria-label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Eid-el-Fitr" className="input" />
      <input maxLength={300} aria-label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ministry of Interior announcement" className="input" />
      <label className="flex items-center gap-2 text-sm font-bold text-green-deep"><input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} />Declared</label>
      <button disabled={saving} className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save</button>
    </form>}
    {!list.length ? <Empty>No holidays recorded for {shown}.</Empty> : <div className="divide-y">{list.map((item) => <div key={item.holiday_date} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><div><span className="font-bold text-green-deep">{displayDate(item.holiday_date)}</span> · {item.name} {!item.confirmed && <Badge tone="amber">Expected</Badge>}{item.source && <span className="ml-2 text-xs text-gray-500">{item.source}</span>}</div>
      {isAdmin && <button onClick={() => { if (confirm(`Remove ${item.name}?`)) send('DELETE', `/holidays?date=${item.holiday_date}`, undefined, 'Holiday removed.') }} className="text-xs font-bold text-red-600">Remove</button>}</div>)}</div>}
    {isAdmin && <p className="border-t px-5 py-3 text-xs text-text-mid">Leave requests already submitted keep the working-day count they were made with.</p>}
  </Card>
}
