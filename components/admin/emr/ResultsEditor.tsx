'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { createResultRow, RESULT_TEST_CATALOG, RESULT_UNIT_GROUPS, resultTestKey } from '@/lib/investigationResultCatalog'
import type { InvestigationResult } from '@/lib/investigationResultPdf'

// One line per test, grouped by section as on the PDF, so a long order can be
// filled in by tabbing down the Result column.

const inputClass = 'w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none'
const knownUnits = new Set(RESULT_UNIT_GROUPS.flatMap(group => group.units))
const columns = 'sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_2rem]'

function UnitSelect({ test, value, onChange }: { test: string; value: string; onChange: (unit: string) => void }) {
  const [customForTest, setCustomForTest] = useState<string | null>(null)
  const custom = customForTest === test || (!!value && !knownUnits.has(value))
  return <div className="space-y-1">
    <select aria-label={`Unit for ${test}`} value={custom ? '__custom__' : value} onChange={event => {
      const unit = event.target.value
      setCustomForTest(unit === '__custom__' ? test : null)
      onChange(unit === '__custom__' ? '' : unit)
    }} className={inputClass}>
      <option value="">No unit</option>
      {RESULT_UNIT_GROUPS.map(group => <optgroup key={group.label} label={group.label}>{group.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}</optgroup>)}
      <option value="__custom__">Other unit…</option>
    </select>
    {custom && <input aria-label={`Custom unit for ${test}`} value={value} onChange={event => onChange(event.target.value)} placeholder="Unit as on the lab report" className={inputClass} />}
  </div>
}

function CataloguePicker({ rows, onChange }: { rows: InvestigationResult[]; onChange: Dispatch<SetStateAction<InvestigationResult[]>> }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const selected = new Set(rows.map(row => resultTestKey(row.test)))
  const groups = RESULT_TEST_CATALOG.map(group => ({
    ...group,
    tests: group.category.toLowerCase().includes(query) ? group.tests : group.tests.filter(test => test.toLowerCase().includes(query)),
  })).filter(group => group.tests.length)
  const toggle = (test: string, section: string, checked: boolean) => onChange(current => {
    const key = resultTestKey(test)
    if (!checked) return current.filter(row => resultTestKey(row.test) !== key)
    return current.some(row => resultTestKey(row.test) === key) ? current : [...current, createResultRow(test, section)]
  })
  const addGroup = (tests: string[], section: string) => onChange(current => {
    const existing = new Set(current.map(row => resultTestKey(row.test)))
    return [...current, ...tests.filter(test => !existing.has(resultTestKey(test))).map(test => createResultRow(test, section))]
  })

  return <div className="p-4 pt-0">
    <input type="search" aria-label="Find tests" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tests or sections…" className={inputClass} />
    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
      {groups.map(group => <details key={`${group.category}:${query ? 'search' : 'browse'}`} open={query ? true : undefined} className="rounded-lg border border-green-deep/10">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-green-deep">{group.category}<span className="ml-2 text-xs font-normal text-text-mid">{group.tests.filter(test => selected.has(resultTestKey(test))).length} / {group.tests.length} added</span></summary>
        <div className="px-3 pb-3">
          <button type="button" onClick={() => addGroup(group.tests, group.category)} disabled={group.tests.every(test => selected.has(resultTestKey(test)))} className="mb-2 text-xs font-semibold text-green-deep underline underline-offset-2 disabled:opacity-40">{query ? 'Add matching tests' : 'Add the whole section'}</button>
          <div className="grid gap-2 sm:grid-cols-2">{group.tests.map(test => <label key={test} className="flex cursor-pointer items-start gap-2 rounded-lg bg-cream/30 p-2 text-sm text-green-deep">
            <input type="checkbox" checked={selected.has(resultTestKey(test))} onChange={event => toggle(test, group.category, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-green-deep" />{test}
          </label>)}</div>
        </div>
      </details>)}
      {!groups.length && <p className="py-3 text-sm text-text-mid">No matching tests. Add it as a custom test instead.</p>}
    </div>
  </div>
}

export default function ResultsEditor({ rows, onChange, catalogueOpen = false }: {
  rows: InvestigationResult[]
  onChange: Dispatch<SetStateAction<InvestigationResult[]>>
  /** Starts with the test catalogue open, for results that have no order. */
  catalogueOpen?: boolean
}) {
  // Rows whose name, section and remark are open for editing, by index.
  const [open, setOpen] = useState<Set<number>>(new Set())
  const update = (index: number, changes: Partial<InvestigationResult>) => onChange(current => current.map((row, i) => i === index ? { ...row, ...changes } : row))
  const remove = (index: number) => {
    onChange(current => current.filter((_, i) => i !== index))
    setOpen(current => new Set(Array.from(current).filter(i => i !== index).map(i => i > index ? i - 1 : i)))
  }
  const toggleDetails = (index: number) => setOpen(current => {
    const next = new Set(current)
    if (next.has(index)) next.delete(index); else next.add(index)
    return next
  })
  const addCustom = () => {
    setOpen(current => new Set(current).add(rows.length))
    onChange(current => [...current, createResultRow()])
  }

  // Sections in first-appearance order, keeping each row's index for updates.
  const sections: { name: string; items: { row: InvestigationResult; index: number }[] }[] = []
  rows.forEach((row, index) => {
    const name = row.section.trim() || 'Other investigations'
    const group = sections.find(section => section.name.toLowerCase() === name.toLowerCase())
    if (group) group.items.push({ row, index })
    else sections.push({ name, items: [{ row, index }] })
  })
  const withResults = rows.filter(row => row.result.trim()).length

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h4 className="text-sm font-bold text-green-deep">Results</h4><p className="mt-1 text-xs text-text-mid">{rows.length ? `${withResults} of ${rows.length} test${rows.length === 1 ? '' : 's'} have a result. Tests left blank are not included in the report.` : 'Add the tests reported, then enter each result.'}</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={addCustom} className="secondary"><PlusIcon size={16} />Custom test</button>
        {rows.length > 0 && <button type="button" onClick={() => { onChange([]); setOpen(new Set()) }} className="secondary">Clear all</button>}
      </div>
    </div>

    {rows.length > 0 && <div className={`mt-4 hidden gap-2 px-3 text-[10px] font-bold uppercase tracking-wide text-text-mid/70 sm:grid ${columns}`}><span>Test</span><span>Result</span><span>Unit</span><span>Reference range</span><span>Flag</span><span /></div>}
    <div className="mt-2 space-y-4">{sections.map(section => <section key={section.name}>
      <p className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-green-mid">{section.name}</p>
      <div className="mt-1.5 divide-y divide-green-deep/10 rounded-xl border border-green-deep/10 bg-white">{section.items.map(({ row, index }) => {
        const name = row.test.trim() || `Custom test ${index + 1}`
        const editing = open.has(index)
        return <div key={index} className={`grid gap-2 p-3 sm:items-start ${columns}`}>
          <div className="min-w-0 pt-1.5">
            <p className={`text-sm font-semibold ${row.test.trim() ? 'text-green-deep' : 'italic text-text-mid'}`}>{name}</p>
            <button type="button" onClick={() => toggleDetails(index)} aria-expanded={editing} className="mt-0.5 text-[11px] font-semibold text-green-mid hover:text-green-deep">{editing ? 'Hide details' : row.remark ? 'Remark added · edit' : 'Rename or add remark'}</button>
          </div>
          <input aria-label={`Result for ${name}`} value={row.result} onChange={event => update(index, { result: event.target.value })} placeholder="Result" className={inputClass} />
          <UnitSelect test={name} value={row.unit} onChange={unit => update(index, { unit })} />
          <input aria-label={`Reference range for ${name}`} value={row.referenceRange} onChange={event => update(index, { referenceRange: event.target.value })} placeholder="Reference range" className={inputClass} />
          <select aria-label={`Flag for ${name}`} value={row.flag} onChange={event => update(index, { flag: event.target.value as InvestigationResult['flag'] })} className={inputClass}><option value="">No flag</option><option>Normal</option><option>High</option><option>Low</option><option>Abnormal</option></select>
          <button type="button" aria-label={`Remove ${name}`} title="Remove" onClick={() => remove(index)} className="flex h-9 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><XIcon size={16} /></button>
          {editing && <div className="grid gap-2 rounded-lg bg-cream/40 p-3 sm:col-span-6 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-mid">Test name<input aria-label={`Test name for ${name}`} value={row.test} onChange={event => update(index, { test: event.target.value })} placeholder="As on the lab report" className={`${inputClass} mt-1`} /></label>
            <label className="text-xs font-semibold text-text-mid">Section<input aria-label={`Section for ${name}`} value={row.section} onChange={event => update(index, { section: event.target.value })} placeholder="e.g. Full Blood Count" className={`${inputClass} mt-1`} /></label>
            <label className="text-xs font-semibold text-text-mid">Remark<input aria-label={`Remark for ${name}`} value={row.remark} onChange={event => update(index, { remark: event.target.value })} placeholder="Printed under the result" className={`${inputClass} mt-1`} /></label>
          </div>}
        </div>
      })}</div>
    </section>)}</div>

    <details open={catalogueOpen || undefined} className="mt-4 rounded-xl border border-green-deep/10 bg-white">
      <summary className="cursor-pointer p-4 text-sm font-semibold text-green-deep">Add tests from the catalogue</summary>
      <CataloguePicker rows={rows} onChange={onChange} />
    </details>
  </div>
}
