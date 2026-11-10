'use client'

import { useId, useMemo, useState } from 'react'
import { searchAllergens, searchDiagnoses, searchMedications } from '@/lib/emrCatalog'
import type { AllergenEntry, DiagnosisEntry, MedicationEntry } from '@/lib/emrCatalog'

// A text input that suggests entries from the EMR reference lists. Typing
// anything is still allowed; picking a suggestion lets the form fill the
// fields that go with it (ICD-10 code, default dose, and so on).

export type CatalogKind = 'diagnoses' | 'allergens' | 'medications'
type Entry = DiagnosisEntry | AllergenEntry | MedicationEntry

const searchers: Record<CatalogKind, (query: string) => Entry[]> = { diagnoses: searchDiagnoses, allergens: searchAllergens, medications: searchMedications }

function entryLabel(kind: CatalogKind, entry: Entry) {
  if (kind === 'diagnoses') { const d = entry as DiagnosisEntry; return { title: d.name, meta: `${d.icd10} · ${d.category}` } }
  if (kind === 'medications') { const m = entry as MedicationEntry; return { title: m.name, meta: [m.strengths.join(', '), m.category, m.brands?.length ? m.brands.join(', ') : ''].filter(Boolean).join(' · ') } }
  const a = entry as AllergenEntry; return { title: a.name, meta: a.category }
}

export default function CatalogInput({ kind, value, onChange, onPick, required, placeholder }: { kind: CatalogKind; value: string; onChange: (value: string) => void; onPick: (entry: any) => void; required?: boolean; placeholder?: string }) {
  const [open, setOpen] = useState(false), [active, setActive] = useState(0)
  const listId = useId()
  const matches = useMemo(() => open ? searchers[kind](value) : [], [kind, value, open])
  function pick(entry: Entry) { onPick(entry); setOpen(false) }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % matches.length) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + matches.length) % matches.length) }
    else if (event.key === 'Enter') { event.preventDefault(); pick(matches[active]) }
    else if (event.key === 'Escape') setOpen(false)
  }
  return <span className="relative block">
    <input className="input" value={value} required={required} placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={matches.length > 0} aria-controls={listId}
      onChange={e => { onChange(e.target.value); setOpen(true); setActive(0) }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
    {matches.length > 0 && <ul id={listId} role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-[14px] border border-green-deep/15 bg-white py-1 font-normal shadow-xl">
      {matches.map((entry, index) => { const { title, meta } = entryLabel(kind, entry); return <li key={`${title}-${meta}`} role="option" aria-selected={index === active} onMouseDown={e => { e.preventDefault(); pick(entry) }} onMouseEnter={() => setActive(index)} className={`cursor-pointer px-4 py-2 ${index === active ? 'bg-[#F4F9E4]' : ''}`}>
        <span className="block text-sm font-bold text-green-deep">{title}</span>
        <span className="block truncate text-xs text-text-mid">{meta}</span>
      </li> })}
    </ul>}
  </span>
}
