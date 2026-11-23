'use client'

import type { ReactNode } from 'react'

// Navigation between the sections of one admin screen. Replaces the rows of
// buttons that scrolled sideways: on wide screens every option is visible at
// once (wrapping, never scrolling); on phones it becomes one dropdown.

export type SectionItem<T extends string = string> = {
  id: T
  label: string
  count?: number
  icon?: ReactNode
}

export type SectionGroup<T extends string = string> = {
  label: string
  items: SectionItem<T>[]
}

function Count({ value, active }: { value?: number; active: boolean }) {
  if (!value) return null
  return <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-clinic-mustard text-clinic-ink' : 'bg-clinic-sage-light text-clinic-ink'}`}>{value}</span>
}

function PhoneSelect<T extends string>({ label, value, onChange, groups }: { label: string; value: T; onChange: (id: T) => void; groups: SectionGroup<T>[] }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="input w-full font-medium">
        {groups.map((group) => {
          const options = group.items.map((item) => <option key={item.id} value={item.id}>{item.label}{item.count ? ` (${item.count})` : ''}</option>)
          return groups.length > 1 && group.label ? <optgroup key={group.label} label={group.label}>{options}</optgroup> : options
        })}
      </select>
    </label>
  )
}

// A single row of tabs, for screens with a handful of sections.
export function Tabs<T extends string>({ label, items, value, onChange }: { label: string; items: SectionItem<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <>
      <div className="md:hidden"><PhoneSelect label={label} value={value} onChange={onChange} groups={[{ label: '', items }]} /></div>
      <div role="tablist" aria-label={label} className="clinic-card hidden w-fit max-w-full flex-wrap gap-1 rounded-[22px] p-1 md:flex">
        {items.map((item) => {
          const active = item.id === value
          return (
            <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-clinic-forest text-white' : 'text-clinic-muted hover:bg-clinic-ink/5 hover:text-clinic-ink'}`}>
              {item.icon}{item.label}<Count value={item.count} active={active} />
            </button>
          )
        })}
      </div>
    </>
  )
}

// Grouped sections down the left of the content, for screens with many
// sections (a patient's chart). Lays out the menu and the content side by side.
export function SideNavLayout<T extends string>({ label, groups, value, onChange, children }: { label: string; groups: SectionGroup<T>[]; value: T; onChange: (id: T) => void; children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="mb-4 lg:hidden"><PhoneSelect label={label} value={value} onChange={onChange} groups={groups} /></div>
      <nav aria-label={label} className="clinic-card hidden rounded-card p-2.5 lg:sticky lg:top-28 lg:block">
        {groups.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-clinic-muted/80">{group.label}</p>
            {group.items.map((item) => {
              const active = item.id === value
              return (
                <button key={item.id} type="button" aria-current={active ? 'page' : undefined} onClick={() => onChange(item.id)} className={`flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[13.5px] font-medium transition ${active ? 'bg-clinic-forest text-white' : 'text-clinic-muted hover:bg-clinic-ink/5 hover:text-clinic-ink'}`}>
                  {item.icon}{item.label}<Count value={item.count} active={active} />
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  )
}
