'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LibraryMarker } from '@/lib/labLibrary'

// Search and panel filter for the lab library index. Every marker is in the
// server-rendered page; this only narrows what is shown.

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export default function LabLibraryBrowser({ markers, panels }: { markers: LibraryMarker[]; panels: Array<{ id: string; name: string }> }) {
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState('all')
  const shown = useMemo(() => {
    const key = squash(query)
    return markers.filter(marker => (panel === 'all' || marker.panel === panel)
      && (!key || [marker.name, ...marker.aliases].some(name => squash(name).includes(key))))
  }, [markers, panel, query])
  const groups = panels.map(item => ({ ...item, markers: shown.filter(marker => marker.panel === item.id) })).filter(group => group.markers.length)

  return <div className="font-dm-sans">
    <div className="sticky top-[72px] z-10 -mx-[5%] border-b border-green-deep/10 bg-[#FCFFF0]/95 px-[5%] py-4 backdrop-blur">
      <div className="mx-auto max-w-6xl">
        <label className="sr-only" htmlFor="lab-search">Search markers</label>
        <input id="lab-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a marker, e.g. ferritin, TSH, HbA1c…"
          className="w-full rounded-full border border-green-deep/20 bg-white px-5 py-3 text-[15px] text-green-deep outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/20" />
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by panel">
          {[{ id: 'all', name: 'All markers' }, ...panels].map(item => <button key={item.id} type="button" onClick={() => setPanel(item.id)} aria-pressed={panel === item.id}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${panel === item.id ? 'bg-green-deep text-white' : 'bg-white text-green-deep ring-1 ring-green-deep/15 hover:ring-green-deep/40'}`}>{item.name}</button>)}
        </div>
      </div>
    </div>

    <div className="mx-auto mt-8 max-w-6xl space-y-12">
      {groups.map(group => <section key={group.id} aria-labelledby={`panel-${group.id}`}>
        <h2 id={`panel-${group.id}`} className="text-2xl font-bold text-green-deep">{group.name}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.markers.map(marker => <Link key={marker.id} href={`/lab-library/${marker.slug}`} className="group flex flex-col rounded-[20px] bg-white p-5 no-underline ring-1 ring-green-deep/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-green-mid/40">
            <span className="text-lg font-bold text-green-deep group-hover:text-green-mid">{marker.name}</span>
            <span className="mt-1.5 line-clamp-3 text-sm leading-6 text-text-mid">{marker.summary}</span>
            <span className="mt-auto pt-4 text-xs font-semibold text-green-mid">FXMed optimal: {marker.optimal}</span>
          </Link>)}
        </div>
      </section>)}
      {!groups.length && <p className="py-16 text-center text-text-mid">No marker matches “{query}”. Try another name, or ask your FXMed care team.</p>}
    </div>
  </div>
}
