'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { createResultRow, RESULT_TEST_CATALOG, RESULT_UNIT_GROUPS, resultTestKey } from '@/lib/investigationResultCatalog'
import type { InvestigationResult } from '@/lib/investigationResultPdf'

const inputClass = 'w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none'
const labelClass = 'mb-1 block text-xs font-semibold text-text-mid'
const knownUnits = new Set(RESULT_UNIT_GROUPS.flatMap(group => group.units))

function ResultUnitSelect({ test, value, onChange }: { test: string; value: string; onChange: (unit: string) => void }) {
  const [customForTest, setCustomForTest] = useState<string | null>(null)
  const custom = customForTest === test || (!!value && !knownUnits.has(value))
  return <div>
    <label className={labelClass}>Unit
      <select aria-label={`Unit for ${test}`} value={custom ? '__custom__' : value} onChange={event => {
        const unit = event.target.value
        setCustomForTest(unit === '__custom__' ? test : null)
        onChange(unit === '__custom__' ? '' : unit)
      }} className={`${inputClass} mt-1`}>
        <option value="">No unit</option>
        {RESULT_UNIT_GROUPS.map(group => <optgroup key={group.label} label={group.label}>{group.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}</optgroup>)}
        <option value="__custom__">Other unit…</option>
      </select>
    </label>
    {custom && <input aria-label={`Custom unit for ${test}`} value={value} onChange={event => onChange(event.target.value)} placeholder="Unit as shown on the lab report" className={`${inputClass} mt-1`} />}
  </div>
}

export default function InvestigationResultsEditor({ rows, onChange }: {
  rows: InvestigationResult[]
  onChange: Dispatch<SetStateAction<InvestigationResult[]>>
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const selected = new Set(rows.map(row => resultTestKey(row.test)))
  const groups = RESULT_TEST_CATALOG.map(group => ({
    ...group,
    tests: group.category.toLowerCase().includes(query) ? group.tests : group.tests.filter(test => test.toLowerCase().includes(query)),
  })).filter(group => group.tests.length)

  const toggleTest = (test: string, section: string, checked: boolean) => onChange(current => {
    const key = resultTestKey(test)
    if (!checked) return current.filter(row => resultTestKey(row.test) !== key)
    if (current.some(row => resultTestKey(row.test) === key)) return current
    return [...current, createResultRow(test, section)]
  })
  const selectGroup = (tests: string[], section: string) => onChange(current => {
    const existing = new Set(current.map(row => resultTestKey(row.test)))
    return [...current, ...tests.filter(test => !existing.has(resultTestKey(test))).map(test => createResultRow(test, section))]
  })
  const updateRow = (index: number, changes: Partial<InvestigationResult>) => onChange(current => current.map((row, i) => i === index ? { ...row, ...changes } : row))

  return <div>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h4 className="text-sm font-semibold text-green-deep">Investigation Results</h4><p className="mt-1 text-xs text-text-mid">Tick the tests, enter their results, and choose the units shown on the laboratory report.</p></div>
      <button type="button" onClick={() => onChange([])} disabled={!rows.length} className="rounded-lg border border-green-deep/20 px-3 py-2 text-xs font-semibold text-green-deep disabled:opacity-40">Clear</button>
    </div>

    <div className="rounded-xl border border-green-deep/10 bg-white p-4">
      <label className={labelClass}>Find tests<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tests or sections…" className={`${inputClass} mt-1`} /></label>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {groups.map(group => <details key={`${group.category}:${query ? 'search' : 'browse'}`} open={query ? true : undefined} className="rounded-lg border border-green-deep/10">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-green-deep">{group.category}<span className="ml-2 text-xs font-normal text-text-mid">{group.tests.filter(test => selected.has(resultTestKey(test))).length} / {group.tests.length} selected</span></summary>
          <div className="px-3 pb-3">
            <button type="button" onClick={() => selectGroup(group.tests, group.category)} disabled={group.tests.every(test => selected.has(resultTestKey(test)))} className="mb-2 text-xs font-semibold text-green-deep underline underline-offset-2 disabled:opacity-40">{query ? 'Select matching tests' : 'Select all in this section'}</button>
            <div className="grid gap-2 sm:grid-cols-2">{group.tests.map(test => <label key={test} className="flex cursor-pointer items-start gap-2 rounded-lg bg-cream/30 p-2 text-sm text-green-deep">
              <input type="checkbox" checked={selected.has(resultTestKey(test))} onChange={event => toggleTest(test, group.category, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-green-deep" />{test}
            </label>)}</div>
          </div>
        </details>)}
        {!groups.length && <p className="py-3 text-sm text-text-mid">No matching tests. You can add a custom test below.</p>}
      </div>
    </div>

    <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
      <h5 className="text-sm font-semibold text-green-deep">Selected tests ({rows.length})</h5>
      <button type="button" onClick={() => onChange(current => [...current, createResultRow()])} className="rounded-lg border border-dashed border-green-deep/30 px-3 py-2 text-xs font-semibold text-green-deep hover:bg-green-deep/5">+ Add custom test</button>
    </div>
    {!rows.length && <p className="rounded-lg border border-dashed border-green-deep/15 p-4 text-sm text-text-mid">Choose tests above to start entering results.</p>}
    <div className="space-y-3">{rows.map((row, index) => {
      const testLabel = row.test || `Custom test ${index + 1}`
      const catalogueTest = RESULT_TEST_CATALOG.some(group => group.tests.some(test => resultTestKey(test) === resultTestKey(row.test)))
      return <div key={index} className="rounded-xl border border-green-deep/10 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-green-deep">{testLabel}</p>{row.section && <p className="mt-1 text-xs text-text-mid">{row.section}</p>}</div>
          <button type="button" aria-label={`Remove ${testLabel}`} onClick={() => onChange(current => current.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600">Remove</button>
        </div>
        {!catalogueTest && <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Test name<input aria-label={`Test name for ${testLabel}`} value={row.test} onChange={event => updateRow(index, { test: event.target.value })} placeholder="Test name" className={`${inputClass} mt-1`} /></label>
          <label className={labelClass}>Section heading<input aria-label={`Section for ${testLabel}`} value={row.section} onChange={event => updateRow(index, { section: event.target.value })} placeholder="e.g. Full Blood Count" className={`${inputClass} mt-1`} /></label>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Result<input aria-label={`Result for ${testLabel}`} value={row.result} onChange={event => updateRow(index, { result: event.target.value })} inputMode="decimal" placeholder="e.g. 5.2" className={`${inputClass} mt-1`} /></label>
          <ResultUnitSelect test={testLabel} value={row.unit} onChange={unit => updateRow(index, { unit })} />
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-text-mid">Optional details{row.referenceRange || row.flag || row.remark ? ' (added)' : ''}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {catalogueTest && <label className={labelClass}>Test name<input aria-label={`Test name for ${testLabel}`} value={row.test} onChange={event => updateRow(index, { test: event.target.value })} className={`${inputClass} mt-1`} /></label>}
            <label className={labelClass}>Reference range<input aria-label={`Reference range for ${testLabel}`} value={row.referenceRange} onChange={event => updateRow(index, { referenceRange: event.target.value })} placeholder="As shown on the lab report" className={`${inputClass} mt-1`} /></label>
            <label className={labelClass}>Flag<select aria-label={`Flag for ${testLabel}`} value={row.flag} onChange={event => updateRow(index, { flag: event.target.value as InvestigationResult['flag'] })} className={`${inputClass} mt-1`}><option value="">No flag</option><option>Normal</option><option>High</option><option>Low</option><option>Abnormal</option></select></label>
            {catalogueTest && <label className={labelClass}>Section heading<input aria-label={`Section for ${testLabel}`} value={row.section} onChange={event => updateRow(index, { section: event.target.value })} className={`${inputClass} mt-1`} /></label>}
            <label className={`${labelClass} sm:col-span-2`}>Remark<input aria-label={`Remark for ${testLabel}`} value={row.remark} onChange={event => updateRow(index, { remark: event.target.value })} className={`${inputClass} mt-1`} /></label>
          </div>
        </details>
      </div>
    })}</div>
  </div>
}
