'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminFrame } from '@/components/admin/shell/AdminShell'
import SeoAnalytics from '@/components/admin/SeoAnalytics'
import AnalysisDashboard from '@/components/admin/fm/AnalysisDashboard'
import PatientPortal from '@/app/patient-portal/page'
import { AreaLine, Gauge, ProgressRing, SegmentedBar, clinic } from '@/components/charts'
import { Card, Stat } from '@/components/admin/ui'
import { FM_BIOMARKERS, createEntry, emptyNarrative, parseRange, type FmEntry } from '@/lib/fmBiomarkers'

// Everything here is made up. The page answers the screens' API calls itself
// (see answer() below), so nothing is read from or written to the database.

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const wave = (index: number, base: number, swing: number) => Math.max(0, Math.round(base + swing * Math.sin(index / 2.3) + (swing / 2) * Math.cos(index / 1.1) + index * 0.6))

function analytics(range: string) {
  const days = range === 'today' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7
  const daily = Array.from({ length: days }, (_, index) => {
    const visitors = wave(index, 64, 18)
    return { day: day(index - days + 1), visitors, visits: Math.round(visitors * 1.3), page_views: Math.round(visitors * 3.1) }
  })
  const sum = (key: 'visitors' | 'visits' | 'page_views') => daily.reduce((total, item) => total + item[key], 0)
  const rows = (names: string[]) => names.map((name, index) => ({ name, visits: Math.round(sum('visits') / (index + 2.2)) }))
  return {
    range: { key: range, days, from: daily[0].day, to: daily[daily.length - 1].day },
    totals: { page_views: sum('page_views'), visits: sum('visits'), visitor_days: sum('visitors'), bounces: Math.round(sum('visits') * 0.38), avg_visit_seconds: 104, search_visits: Math.round(sum('visits') * 0.41) },
    previous: { page_views: Math.round(sum('page_views') * 0.9), visits: Math.round(sum('visits') * 0.88), visitor_days: Math.round(sum('visitors') * 0.92), bounces: 0, avg_visit_seconds: 98, search_visits: 0 },
    daily,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, visits: Math.round(40 * Math.exp(-((hour - 13) ** 2) / 18) + 4) })),
    pages: rows(['/', '/services', '/functional-medicine', '/book', '/blog/gut-health']).map(row => ({ ...row, page_views: row.visits * 2 })),
    landing_pages: rows(['/', '/functional-medicine', '/blog/gut-health']).map(row => ({ ...row, bounces: Math.round(row.visits * 0.4) })),
    sources: rows(['Google', 'Direct', 'Instagram', 'WhatsApp']), referrers: rows(['instagram.com', 'l.facebook.com']), campaigns: [],
    countries: rows(['NG', 'US', 'GB']), cities: rows(['Lagos', 'Abuja', 'Houston']).map(row => ({ ...row, country: 'NG' })),
    devices: rows(['Mobile', 'Desktop', 'Tablet']), browsers: rows(['Chrome', 'Safari', 'Edge']), operating_systems: rows(['Android', 'iOS', 'Windows']),
    liveVisitors: 3,
    trackingSince: new Date(Date.now() - 200 * 86400000).toISOString(),
    bookings: 18,
    messages: 42,
  }
}

const portal = {
  account: { status: 'active', activated_at: day(-40), email_notifications: true },
  patient: { first_name: 'Ada', last_name: 'Okafor', mrn: 'FX-000123', date_of_birth: '1986-04-12', phone: '+234 800 000 0000', email: 'patient@example.com', address: '12 Sample Street', city: 'Lekki', state: 'Lagos' },
  carePlans: [{
    id: 'plan-1', title: 'Gut health reset', status: 'active', description: 'Twelve weeks to settle digestion and lift energy.', goals: 'Less bloating after meals. Steadier energy through the afternoon.',
    items: [
      { id: 'i1', title: 'Start the elimination meal plan', status: 'completed', completed_at: day(-20), instructions: 'Follow the plan your nutritionist shared.' },
      { id: 'i2', title: 'Take magnesium glycinate at night', status: 'completed', completed_at: day(-14) },
      { id: 'i3', title: 'Walk 30 minutes after lunch', status: 'completed', completed_at: day(-6) },
      { id: 'i4', title: 'Repeat the stool test', status: 'pending', due_date: day(9), instructions: 'Collect the kit from the clinic.' },
      { id: 'i5', title: 'Book your 6-week review', status: 'pending', due_date: day(16) },
    ],
  }],
  documents: [{ id: 'd1', title: 'Lab request form', category: 'laboratory', source: 'clinic', shared_at: day(-3), created_at: day(-3) }],
  messages: [{ id: 'm1', sender: 'clinic', status: 'unread', body: 'Your results are in. We will go through them at your review.', created_at: day(-1) }],
  notifications: [{ id: 'n1', title: 'New message from your care team', section: 'messages', created_at: day(-1), read_at: null }],
  labOrders: [],
  invoices: [],
}

function answer(url: string, init?: RequestInit) {
  const { pathname, searchParams } = new URL(url, window.location.origin)
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  if (pathname === '/api/admin/analytics') return json(analytics(searchParams.get('range') || '7d'))
  if (pathname === '/api/admin/notifications') return json({ notifications: [], degraded: [] })
  if (pathname === '/api/patient-portal' && (!init?.method || init.method === 'GET')) return json(portal)
  if (pathname.startsWith('/api/')) return json({})
  return null
}

function sampleEntries(): FmEntry[] {
  return FM_BIOMARKERS.slice(0, 36).flatMap((marker, index) => {
    const entry = createEntry(marker, 'female', {}, 40)
    const range = parseRange(entry.fmRange || entry.labRange)
    if (!range) return []
    const low = range.low ?? (range.high ?? 1) * 0.5, high = range.high ?? low * 2
    const value = index % 5 === 0 ? high * 1.22 : index % 7 === 3 ? low * 0.82 : (low + high) / 2
    return [{ ...entry, value: String(Math.round(value * 10) / 10) }]
  })
}

function Kit() {
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => ({ label: `${index + 10} Nov`, value: wave(index, 22, 6) })), [])
  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="Patients seen this week" value="128" />
      <Stat label="Follow-ups due" value="14" />
      <Stat label="Results to review" value="6" tone="warn" />
      <Stat label="Overdue tasks" value="2" tone="danger" />
    </div>
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card title="Appointments per day" description="AreaLine: monotone line, gradient wash, no gridlines, latest value in a pill."><div className="p-5 sm:p-6"><AreaLine data={days} ariaLabel="Appointments per day" /></div></Card>
      <Card title="Today's results" description="Gauge: sage, mustard and lilac segments."><div className="p-5 sm:p-6"><Gauge label="Results" segments={[{ value: 42, label: 'Clear' }, { value: 11, label: 'Watch' }, { value: 6, label: 'Flag' }]}><p className="clinic-number text-[2.6rem] leading-none">59</p><p className="mt-1 text-xs text-clinic-muted">results today</p></Gauge></div></Card>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Care plan progress" description="ProgressRing."><div className="flex flex-wrap items-center gap-6 p-5 sm:p-6"><ProgressRing value={72} label="Steps done" /><ProgressRing value={45} label="Labs back" color={clinic.mustard} track="#f1ead0" /><ProgressRing value={18} label="Invoices paid" color={clinic.lilac} track="#efe4f4" size={84} thickness={8} /></div></Card>
      <Card title="Revenue against target" description="SegmentedBar: segments, striped remainder, marker pins."><div className="p-5 sm:p-6"><SegmentedBar label="Revenue" total={100} legend markers={[{ at: 60, label: 'Today' }, { at: 90, label: 'Target' }]} segments={[{ value: 34, label: 'Consultations' }, { value: 16, label: 'Labs' }, { value: 8, label: 'Supplements' }]} format={value => `₦${value}m`} /></div></Card>
    </div>
  </div>
}

export default function Preview() {
  const params = useSearchParams()
  const view = params.get('view') === 'portal' ? 'portal' : 'admin'
  const page = params.get('page') || 'kit'
  const [ready, setReady] = useState(false)
  const entries = useMemo(() => sampleEntries(), [])

  useEffect(() => {
    const original = window.fetch
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return Promise.resolve(answer(url, init) ?? original(input, init))
    }
    setReady(true)
    return () => { window.fetch = original }
  }, [])

  if (!ready) return null
  if (view === 'portal') return <PatientPortal />
  const path = page === 'seo' ? '/admin/growth/seo' : page === 'fm' ? '/admin/clinical/lab-analysis' : '/admin/growth/crm'
  return <AdminFrame role="admin" onLogout={() => {}} path={path}>
    <p className="mb-4 flex flex-wrap gap-2 text-xs text-clinic-muted">Preview with sample data:
      {[['kit', 'Chart kit'], ['seo', 'SEO analytics'], ['fm', 'FM lab analysis']].map(([id, label]) => <Link key={id} href={`?page=${id}`} className="underline underline-offset-2">{label}</Link>)}
      <Link href="?view=portal" className="underline underline-offset-2">Patient portal</Link>
    </p>
    {page === 'seo' ? <SeoAnalytics /> : page === 'fm' ? <AnalysisDashboard entries={entries} narrative={emptyNarrative()} sex="female" age={40} /> : <Kit />}
  </AdminFrame>
}
