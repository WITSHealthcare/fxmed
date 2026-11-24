'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, GlobeHemisphereWestIcon } from '@phosphor-icons/react'
import { AreaLine, clinic } from '@/components/charts'

// Website analytics for fxmed.ng, recorded by components/SiteTracker without
// cookies (migration 046). Every number here comes from /api/admin/analytics.

type Row = { name: string; visits?: number; page_views?: number; visitors?: number; bounces?: number; region?: string | null; country?: string | null }
type Totals = { page_views: number; visits: number; visitor_days: number; bounces: number; avg_visit_seconds: number; search_visits: number }
type Analytics = {
  needsMigration?: boolean
  range: { key: string; days: number; from: string; to: string }
  totals: Totals
  previous: Totals | null
  daily: Array<{ day: string; visitors: number; visits: number; page_views: number }>
  hours: Array<{ hour: number; visits: number }>
  pages: Row[]; landing_pages: Row[]; sources: Row[]; referrers: Row[]; campaigns: Row[]
  countries: Row[]; cities: Row[]; devices: Row[]; browsers: Row[]; operating_systems: Row[]
  liveVisitors: number
  trackingSince: string | null
  bookings: number
  messages: number
}

const ranges = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

// One hue for every mark: the clinic theme's sage.
const MARK = clinic.sage

const number = new Intl.NumberFormat('en-NG')
const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
const shortDay = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDay = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const since = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })

const countryName = (code?: string | null) => {
  if (!code || code === 'Unknown') return 'Unknown'
  try { return regionNames?.of(code) || code } catch { return code }
}
const flag = (code?: string | null) => code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(127397 + code.charCodeAt(0), 127397 + code.charCodeAt(1)) : ''
const duration = (seconds: number) => {
  if (!seconds) return '0s'
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s` : `${Math.round(seconds)}s`
}
const percent = (part: number, whole: number) => whole ? `${Math.round((part / whole) * 100)}%` : '0%'
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
const addDays = (day: string, count: number) => new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10)

export default function SeoAnalytics() {
  const [range, setRange] = useState('7d')
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (key: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/analytics?range=${key}`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Website analytics could not be loaded.')
      setData(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Website analytics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(range) }, [load, range])

  return (
    <div className="space-y-6">
      <section className="clinic-card rounded-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.75rem] leading-tight text-clinic-ink">Website analytics</h2>
            <p className="mt-1 text-sm text-text-mid">Visitors to fxmed.ng, counted without cookies. Staff and patient areas are not included. Times are Lagos time.</p>
          </div>
          {data && !data.needsMigration && (
            <span className="inline-flex items-center gap-2 rounded-full bg-clinic-sage-light px-3 py-1.5 text-sm font-medium text-clinic-ink" title="Visits with activity in the last 5 minutes">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: MARK }} /><span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MARK }} /></span>
              {data.liveVisitors} on the site now
            </span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Period">
          {ranges.map(item => (
            <button
              key={item.key}
              type="button"
              aria-pressed={range === item.key}
              onClick={() => setRange(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${range === item.key ? 'bg-clinic-forest text-white' : 'bg-clinic-bg text-clinic-muted hover:bg-clinic-sage-light hover:text-clinic-ink'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!data && loading && <div className="flex min-h-48 items-center justify-center"><span className="h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>}

      {data?.needsMigration && (
        <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-bold">Website analytics needs its database table</p>
          <p className="mt-1 text-sm leading-6">Run migration 046 (supabase/migrations/046_add_site_analytics.sql) in the Supabase SQL editor. Visits are counted from then on.</p>
        </section>
      )}

      {data && !data.needsMigration && <div className={`space-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}><Dashboard data={data} /></div>}
    </div>
  )
}

function Dashboard({ data }: { data: Analytics }) {
  const { totals, range } = data
  // A date the browser cannot read is treated as unknown rather than breaking the page.
  const trackingSince = data.trackingSince && !Number.isNaN(Date.parse(data.trackingSince)) ? data.trackingSince : null
  // Compare only with a period that was counted from its start; one that began
  // before counting started would make every number look like a jump.
  const firstCountedDay = trackingSince ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date(trackingSince)) : null
  const previous = firstCountedDay && firstCountedDay <= addDays(range.from, -range.days) ? data.previous : null
  const today = range.key === 'today'
  const comparison = today ? 'vs yesterday at this time' : `vs the previous ${range.days} days`

  // Average over the days tracking has run, so a new install does not look quiet.
  const trackedDays = useMemo(() => {
    if (today) return 1
    const start = firstCountedDay && firstCountedDay > range.from ? firstCountedDay : range.from
    return Math.max(1, Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1)
  }, [firstCountedDay, range.from, range.to, today])

  const daily = useMemo(() => {
    const byDay = new Map(data.daily.map(item => [item.day, item]))
    const days: Analytics['daily'] = []
    for (let day = range.from; day <= range.to; day = addDays(day, 1)) days.push(byDay.get(day) || { day, visitors: 0, visits: 0, page_views: 0 })
    return days
  }, [data.daily, range.from, range.to])

  const empty = totals.page_views === 0

  return <>
    {trackingSince
      ? <p className="-mt-2 text-xs text-text-mid">Counting since {since.format(new Date(trackingSince))}.</p>
      : <p className="-mt-2 rounded-xl border border-green-deep/10 bg-white px-4 py-3 text-sm text-text-mid">No visits recorded yet. Numbers appear here as soon as people visit the live site.</p>}

    <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile
        label={today ? 'Visitors today' : 'Visitors per day'}
        value={number.format(today ? totals.visitor_days : Math.round(totals.visitor_days / trackedDays))}
        note={today ? undefined : `average over ${trackedDays} day${trackedDays === 1 ? '' : 's'}`}
        delta={delta(totals.visitor_days, previous?.visitor_days)}
        comparison={comparison}
      />
      <StatTile label="Visits" value={number.format(totals.visits)} delta={delta(totals.visits, previous?.visits)} comparison={comparison} />
      <StatTile label="Page views" value={number.format(totals.page_views)} note={totals.visits ? `${(totals.page_views / totals.visits).toFixed(1)} pages per visit` : undefined} delta={delta(totals.page_views, previous?.page_views)} comparison={comparison} />
      <StatTile label="Average visit" value={duration(totals.avg_visit_seconds)} note="time the site was on screen" />
      <StatTile label="Bounce rate" value={percent(totals.bounces, totals.visits)} note="visits that saw only one page" />
      <StatTile label="From search engines" value={percent(totals.search_visits, totals.visits)} note={`${number.format(totals.search_visits)} visit${totals.search_visits === 1 ? '' : 's'} from Google, Bing and others`} />
      <StatTile label="Bookings received" value={number.format(data.bookings)} note="appointments and festive packages, from every channel" />
      <StatTile label="Messages received" value={number.format(data.messages)} note="contact form, Zara and assessments" />
    </section>

    {!empty && (
      <>
        <Card title={today ? 'Visits by hour today' : 'Visitors per day'} subtitle={today ? 'When today’s visits started, by hour.' : 'Unique visitors each day. Hover or use the arrow keys for each day’s numbers.'}>
          {today ? <HourChart hours={data.hours} label="visits" /> : <TrendChart days={daily} />}
        </Card>
        {!today && (
          <Card title="Busiest times of day" subtitle="When visits started over the period, by hour.">
            <HourChart hours={data.hours} label="visits" />
          </Card>
        )}
      </>
    )}

    <div className="grid gap-6 lg:grid-cols-2">
      <Breakdown title="Where visitors come from" subtitle="By the first page of each visit." total={totals.visits} tabs={[
        { key: 'sources', label: 'Sources', rows: data.sources.map(row => ({ name: row.name, value: row.visits || 0 })) },
        { key: 'referrers', label: 'Referring sites', rows: data.referrers.map(row => ({ name: row.name, value: row.visits || 0 })), empty: 'No referring sites yet. Most visits came directly or from apps that hide where they came from.' },
        { key: 'campaigns', label: 'Campaigns', rows: data.campaigns.map(row => ({ name: row.name, value: row.visits || 0 })), empty: 'No tagged links used yet. Add ?utm_source=whatsapp&utm_campaign=your-campaign to links you share to see them here.' },
      ]} />
      <Breakdown title="Where visitors are" subtitle="From the visitor’s internet connection, so it can be approximate." total={totals.visits} tabs={[
        { key: 'countries', label: 'Countries', rows: data.countries.map(row => ({ name: `${flag(row.name)} ${countryName(row.name)}`.trim(), value: row.visits || 0 })) },
        { key: 'cities', label: 'Cities', rows: data.cities.map(row => ({ name: [row.name, countryName(row.country)].filter(part => part && part !== 'Unknown').join(', '), value: row.visits || 0 })), empty: 'No city information yet.' },
      ]} />
      <Breakdown title="Pages" subtitle="Top pages count every view; landing pages count where visits began." tabs={[
        { key: 'pages', label: 'Top pages', unit: 'views', rows: data.pages.map(row => ({ name: row.name, value: row.page_views || 0 })), total: totals.page_views },
        { key: 'landing', label: 'Landing pages', rows: data.landing_pages.map(row => ({ name: row.name, value: row.visits || 0, note: `${percent(row.bounces || 0, row.visits || 0)} bounce` })), total: totals.visits },
      ]} />
      <Breakdown title="Devices" subtitle="What visitors used to view the site." total={totals.visits} tabs={[
        { key: 'devices', label: 'Device', rows: data.devices.map(row => ({ name: row.name, value: row.visits || 0 })) },
        { key: 'browsers', label: 'Browser', rows: data.browsers.map(row => ({ name: row.name, value: row.visits || 0 })) },
        { key: 'os', label: 'Operating system', rows: data.operating_systems.map(row => ({ name: row.name, value: row.visits || 0 })) },
      ]} />
    </div>

    <p className="text-xs leading-5 text-text-mid">
      A visitor is counted once a day: the count cannot tell a returning visitor from a new one on another day. Search keywords are not visible to websites; see them in Google Search Console.
    </p>
  </>
}

function delta(current: number, previous?: number | null) {
  if (previous === undefined || previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="clinic-card rounded-card p-6">
    <h3 className="text-xl text-clinic-ink">{title}</h3>
    {subtitle && <p className="mt-0.5 text-sm text-text-mid">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
}

function StatTile({ label, value, note, delta: change, comparison }: { label: string; value: string; note?: string; delta?: number | null; comparison?: string }) {
  return <div className="clinic-card rounded-card p-5">
    <p className="text-[13px] font-medium text-clinic-muted">{label}</p>
    <p className="clinic-number mt-2 text-[2rem] leading-tight text-clinic-ink">{value}</p>
    {change !== null && change !== undefined && (
      <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${change > 0 ? 'text-emerald-700' : change < 0 ? 'text-red-700' : 'text-text-mid'}`}>
        {change > 0 ? <ArrowUpIcon size={12} weight="bold" aria-hidden /> : change < 0 ? <ArrowDownIcon size={12} weight="bold" aria-hidden /> : null}
        {change > 0 ? '+' : ''}{change}% <span className="font-normal text-text-mid">{comparison}</span>
      </p>
    )}
    {note && <p className="mt-1 text-xs text-text-mid">{note}</p>}
  </div>
}

type BreakdownRow = { name: string; value: number; note?: string }
type BreakdownTab = { key: string; label: string; rows: BreakdownRow[]; unit?: string; total?: number; empty?: string }

/** Ranked horizontal bars in one hue, largest first, with each value and its share. */
function Breakdown({ title, subtitle, tabs, total }: { title: string; subtitle?: string; tabs: BreakdownTab[]; total?: number }) {
  const [active, setActive] = useState(tabs[0].key)
  const tab = tabs.find(item => item.key === active) || tabs[0]
  const whole = tab.total ?? total ?? tab.rows.reduce((sum, row) => sum + row.value, 0)
  const max = Math.max(1, ...tab.rows.map(row => row.value))
  const unit = tab.unit || 'visits'
  return <section className="clinic-card rounded-card p-6">
    <h3 className="text-xl text-clinic-ink">{title}</h3>
    {subtitle && <p className="mt-0.5 text-sm text-text-mid">{subtitle}</p>}
    {tabs.length > 1 && (
      <div className="mt-4 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-clinic-bg p-1" role="tablist" aria-label={title}>
        {tabs.map(item => (
          <button key={item.key} type="button" role="tab" aria-selected={item.key === tab.key} onClick={() => setActive(item.key)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${item.key === tab.key ? 'bg-clinic-forest text-white' : 'text-clinic-muted hover:text-clinic-ink'}`}>
            {item.label}
          </button>
        ))}
      </div>
    )}
    <div role="tabpanel" className="mt-4">
      {tab.rows.length ? (
        <table className="w-full table-fixed text-sm">
          <colgroup><col /><col className="w-16" /><col className="w-20" /></colgroup>
          <thead className="sr-only"><tr><th>{tab.label}</th><th>{unit}</th><th>Share</th></tr></thead>
          <tbody>
            {tab.rows.map(row => (
              <tr key={row.name} className="align-top" title={`${row.name}: ${number.format(row.value)} ${unit} (${percent(row.value, whole)})${row.note ? `, ${row.note}` : ''}`}>
                <td className="py-1.5 pr-3">
                  <span className="block truncate text-gray-800">{row.name}</span>
                  <span className="chart-grow-x mt-1.5 block h-2 rounded-full" style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, backgroundColor: MARK }} aria-hidden />
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-green-deep">{number.format(row.value)}</td>
                <td className="py-1.5 pl-2 text-right text-xs tabular-nums text-text-mid">{percent(row.value, whole)}{row.note && <span className="block">{row.note}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="flex items-start gap-2 py-6 text-sm text-text-mid"><GlobeHemisphereWestIcon size={20} className="shrink-0 text-green-mid" aria-hidden />{tab.empty || 'No visits in this period.'}</p>
      )}
    </div>
  </section>
}

/** Daily visitors as a smooth line, with each day's numbers on hover or arrow keys. */
function TrendChart({ days }: { days: Analytics['daily'] }) {
  const [showTable, setShowTable] = useState(false)
  const points = useMemo(() => days.map(day => ({ label: shortDay.format(new Date(`${day.day}T00:00:00Z`)), value: day.visitors })), [days])

  return <div>
    <AreaLine
      data={points}
      ariaLabel={`Visitors per day, ${days.length} days`}
      height={240}
      format={value => number.format(value)}
      readout={index => <>
        <p className="text-white/60">{longDay.format(new Date(`${days[index].day}T00:00:00Z`))}</p>
        <p className="mt-0.5 text-sm"><span className="font-medium tabular-nums">{number.format(days[index].visitors)}</span> <span className="text-white/60">visitors</span></p>
        <p className="text-white/60"><span className="tabular-nums text-white">{number.format(days[index].visits)}</span> visits · <span className="tabular-nums text-white">{number.format(days[index].page_views)}</span> views</p>
      </>}
    />
    <button type="button" onClick={() => setShowTable(current => !current)} className="mt-3 text-sm font-medium text-clinic-ink underline underline-offset-4">{showTable ? 'Hide table' : 'Show as a table'}</button>
    {showTable && (
      <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-text-mid"><tr><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Visitors</th><th className="px-3 py-2 text-right">Visits</th><th className="px-3 py-2 text-right">Page views</th></tr></thead>
          <tbody>{[...days].reverse().map(day => <tr key={day.day} className="border-t border-gray-100"><td className="px-3 py-1.5">{longDay.format(new Date(`${day.day}T00:00:00Z`))}</td><td className="px-3 py-1.5 text-right tabular-nums">{number.format(day.visitors)}</td><td className="px-3 py-1.5 text-right tabular-nums">{number.format(day.visits)}</td><td className="px-3 py-1.5 text-right tabular-nums">{number.format(day.page_views)}</td></tr>)}</tbody>
        </table>
      </div>
    )}
  </div>
}

/** Visits by hour of the day, as a smooth line through the 24 hours. */
function HourChart({ hours, label }: { hours: Analytics['hours']; label: string }) {
  const counts = Array.from({ length: 24 }, (_, hour) => hours.find(item => item.hour === hour)?.visits || 0)
  const peak = counts.indexOf(Math.max(...counts))
  return <AreaLine
    data={counts.map((value, hour) => ({ label: hourLabel(hour), value }))}
    ariaLabel={`${label} by hour of day. Busiest at ${hourLabel(peak)}`}
    height={200}
    format={value => number.format(value)}
    tick={(point, hour) => hour % 3 === 0 ? point.label : ''}
    readout={hour => <>
      <p className="text-white/60">{hourLabel(hour)} – {hourLabel((hour + 1) % 24)}</p>
      <p className="mt-0.5 text-sm"><span className="font-medium tabular-nums">{number.format(counts[hour])}</span> <span className="text-white/60">{label}</span></p>
    </>}
  />
}
