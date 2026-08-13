'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChatCircleDotsIcon,
  CurrencyNgnIcon,
  EnvelopeSimpleIcon,
  FolderOpenIcon,
  HandshakeIcon,
  HeadsetIcon,
  HouseIcon,
  HourglassMediumIcon,
  SealCheckIcon,
  SignOutIcon,
  TimerIcon,
  TrophyIcon,
  UserCircleIcon,
  UserPlusIcon,
  WalletIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react'
import { signOut } from '@/lib/supabase-auth'
import { formatPortalLabel } from '@/lib/ambassador-portal'
import ChatAssistant from '@/components/AIChat'

type PortalData = {
  profile: any
  referrals: any[]
  payouts: any[]
  announcements: any[]
  resources: any[]
}

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const nav = [
  { id: 'overview', label: 'Overview', Icon: HouseIcon },
  { id: 'referrals', label: 'Referrals', Icon: HandshakeIcon },
  { id: 'earnings', label: 'Earnings', Icon: WalletIcon },
  { id: 'resources', label: 'Resources', Icon: FolderOpenIcon },
  { id: 'profile', label: 'Profile', Icon: UserCircleIcon },
] as const

const referralBadge: Record<string, string> = {
  submitted: 'bg-amber-50 text-amber-700', contacted: 'bg-blue-50 text-blue-700', consultation_booked: 'bg-violet-50 text-violet-700',
  converted: 'bg-emerald-50 text-emerald-700', declined: 'bg-red-50 text-red-700',
}

export default function AmbassadorPortal() {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [active, setActive] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReferral, setShowReferral] = useState(false)
  const [showZara, setShowZara] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/ambassador-portal')
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 403) router.replace('/ambassador-portal/login')
      else setError(result.error || 'Unable to load your portal.')
    } else setData(result)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (window.sessionStorage.getItem('fxmed-ambassador-welcome') === 'true') {
      window.sessionStorage.removeItem('fxmed-ambassador-welcome')
      setShowWelcome(true)
    }
  }, [])

  const stats = useMemo(() => {
    const referrals = data?.referrals || []
    const payouts = data?.payouts || []
    return {
      referrals: referrals.length,
      converted: referrals.filter((item) => item.status === 'converted').length,
      pending: referrals.filter((item) => ['submitted', 'contacted', 'consultation_booked'].includes(item.status)).length,
      earned: referrals.reduce((sum, item) => sum + (['approved', 'paid'].includes(item.commission_status) ? Number(item.commission_amount) : 0), 0),
      paid: payouts.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount), 0),
    }
  }, [data])

  async function logout() {
    await signOut()
    router.replace('/ambassador-portal/login')
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-cream"><div className="h-12 w-12 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-cream p-8 font-dm-sans text-red-700">{error || 'Portal unavailable.'}</div>
  const application = data.profile.application || {}

  return (
    <div className="min-h-screen bg-cream font-dm-sans text-green-deep lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="relative z-30 flex h-auto flex-col overflow-hidden bg-green-deep px-5 py-5 text-white shadow-[12px_0_50px_rgba(26,61,46,0.08)] lg:sticky lg:top-0 lg:h-screen lg:px-7 lg:py-8">
        <PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/15" />
        <div className="flex items-center justify-between lg:block">
          <Image src="/logo.png" alt="FXMed" width={280} height={140} priority className="relative h-24 w-auto brightness-0 invert lg:h-28" />
          <button type="button" onClick={logout} className="relative rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/10 lg:hidden">Sign out</button>
        </div>
        <div className="relative mt-5 rounded-[22px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm lg:mt-9">
          <span className="inline-flex rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-green-deep">Elite Ambassador</span>
          <p className="mt-4 truncate text-lg font-bold">{application.first_name} {application.last_name}</p>
          <p className="mt-1 text-xs tracking-[0.08em] text-white/55">{data.profile.ambassador_code}</p>
        </div>
        <nav className="relative mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-2 lg:overflow-visible">
          {nav.map((item) => <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`group flex shrink-0 items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-sm font-semibold transition-all lg:w-full ${active === item.id ? 'bg-gold text-green-deep shadow-[0_8px_24px_rgba(201,226,101,0.18)]' : 'text-white/65 hover:bg-white/[0.08] hover:text-white'}`}><item.Icon size={22} weight={active === item.id ? 'fill' : 'duotone'} className={`shrink-0 ${active === item.id ? 'text-green-deep' : 'text-white/55 group-hover:text-gold'}`} />{item.label}</button>)}
        </nav>
        <div className="relative mt-3 flex gap-2 lg:hidden">
          <button type="button" onClick={() => setShowSupport(true)} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/65"><HeadsetIcon size={19} weight="duotone" className="text-gold" />Contact Support</button>
          <button type="button" onClick={() => setShowZara(true)} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/65"><ChatCircleDotsIcon size={19} weight="duotone" className="text-gold" />Chat with Zara</button>
        </div>
        <div className="relative mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <button type="button" onClick={() => setShowSupport(true)} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-xs font-semibold text-white/55 transition hover:bg-white/[0.08] hover:text-white"><HeadsetIcon size={22} weight="duotone" className="shrink-0 text-gold" />Contact Support</button>
          <button type="button" onClick={() => setShowZara(true)} className="mt-1 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-xs font-semibold text-white/55 transition hover:bg-white/[0.08] hover:text-white"><ChatCircleDotsIcon size={22} weight="duotone" className="shrink-0 text-gold" />Chat with Zara</button>
          <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><SignOutIcon size={22} weight="duotone" className="shrink-0" />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-7 sm:px-7 lg:px-10 lg:pb-10 xl:px-14">
        <div className="mx-auto max-w-[1480px]">
        <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-5 border-b border-green-deep/10 bg-cream/95 px-4 py-6 shadow-[0_10px_30px_rgba(26,61,46,0.04)] backdrop-blur-xl sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 lg:py-8 xl:-mx-14 xl:px-14">
          <div><SectionLabel>Ambassador Portal</SectionLabel><h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-none tracking-[-0.035em]">{nav.find((item) => item.id === active)?.label}</h1></div>
          <button type="button" onClick={() => setShowReferral(true)} disabled={data.profile.status !== 'active'} className="inline-flex items-center gap-2 rounded-full bg-green-deep px-6 py-3.5 text-sm font-bold text-white shadow-custom transition hover:-translate-y-0.5 hover:bg-green-mid hover:shadow-custom-hover disabled:translate-y-0 disabled:opacity-50"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-base leading-none text-green-deep">+</span>Add new referral</button>
        </header>
        {data.profile.status !== 'active' && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Your portal account is {data.profile.status}. Contact the FXMed team if you need help.</div>}
        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {active === 'overview' && <Overview data={data} stats={stats} goTo={setActive} />}
        {active === 'referrals' && <Referrals referrals={data.referrals} />}
        {active === 'earnings' && <Earnings referrals={data.referrals} payouts={data.payouts} stats={stats} />}
        {active === 'resources' && <Resources resources={data.resources} announcements={data.announcements} />}
        {active === 'profile' && <Profile profile={data.profile} application={application} onSaved={load} />}
        </div>
      </main>
      {showReferral && <ReferralModal onClose={() => setShowReferral(false)} onCreated={() => { setShowReferral(false); load(); setActive('referrals') }} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showWelcome && <WelcomeModal firstName={application.first_name} onClose={() => setShowWelcome(false)} onOpenProfile={() => { setShowWelcome(false); setActive('profile') }} />}
      <ChatAssistant context="ambassador" open={showZara} onOpenChange={setShowZara} showLauncher={false} />
    </div>
  )
}

function WelcomeModal({ firstName, onClose, onOpenProfile }: { firstName?: string; onClose: () => void; onOpenProfile: () => void }) {
  const steps = [
    { number: '01', title: 'Complete your profile', text: 'Add your bank details so future commission payouts can be processed smoothly.' },
    { number: '02', title: 'Make your first referral', text: 'Introduce a prospective FXMed client and track their progress from your portal.' },
    { number: '03', title: 'Explore your resources', text: 'Find program information, announcements, and materials shared by the FXMed team.' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ambassador-welcome-title" className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-green-deep p-7 text-white sm:p-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/20" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-green-deep">Account activated</span>
            <h2 id="ambassador-welcome-title" className="mt-5 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Welcome to FXMed{firstName ? `, ${firstName}` : ''}.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Your Ambassador Portal is ready. Here are the best first steps to get set up.</p>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="space-y-3">
            {steps.map((step) => <div key={step.number} className="flex gap-4 rounded-[16px] bg-[#FCFFF0] p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-green-deep text-xs font-bold text-gold">{step.number}</span><div><p className="font-bold text-green-deep">{step.title}</p><p className="mt-1 text-sm leading-6 text-text-mid">{step.text}</p></div></div>)}
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-green-deep/15 px-6 py-3 text-sm font-bold text-green-deep">Explore portal</button>
            <button type="button" onClick={onOpenProfile} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white transition hover:bg-green-mid">Complete my profile</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Overview({ data, stats, goTo }: { data: PortalData; stats: any; goTo: (tab: string) => void }) {
  const cards = [
    { label: 'Total referrals', value: stats.referrals, Icon: UserPlusIcon, tone: 'bg-[#EAF2FE] text-[#659BF2]' },
    { label: 'Successful signups', value: stats.converted, Icon: TrophyIcon, tone: 'bg-[#E5E4FF] text-[#874EAA]' },
    { label: 'In progress', value: stats.pending, Icon: HourglassMediumIcon, tone: 'bg-[#FFEAE3] text-[#FF6932]' },
    { label: 'Approved earnings', value: money.format(stats.earned), Icon: CurrencyNgnIcon, tone: 'bg-[#FFD2E2] text-[#C21B58]' },
  ]
  return <div className="mt-8 space-y-7">
    <section className="relative overflow-hidden rounded-[32px] bg-green-deep p-7 text-white shadow-[0_20px_60px_rgba(26,61,46,0.18)] sm:p-10 lg:p-12"><div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" /><PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/25" /><div className="relative max-w-3xl"><span className="inline-flex rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-gold">Welcome back</span><h2 className="mt-5 text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.04em]">{data.profile.application?.first_name}, let’s grow healthier communities <span className="text-gold">together.</span></h2><p className="mt-5 max-w-2xl text-base leading-7 text-cream/70">Submit a referral and follow every update from initial contact through successful enrollment.</p></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article key={card.label} className="group rounded-[22px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] transition hover:-translate-y-1 hover:shadow-custom"><span className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${card.tone}`}><card.Icon size={25} weight="fill" /></span><p className="mt-6 text-[1.65rem] font-bold tracking-[-0.03em]">{card.value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-mid/75">{card.label}</p></article>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div className="rounded-[24px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-7"><div className="flex items-center justify-between"><div><SectionLabel>Referral activity</SectionLabel><h3 className="mt-3 text-2xl font-bold">Recent referrals</h3></div><button onClick={() => goTo('referrals')} className="rounded-full border border-green-deep/15 px-4 py-2 text-sm font-bold text-green-mid transition hover:bg-green-deep hover:text-white">View all</button></div><ReferralRows referrals={data.referrals.slice(0, 5)} compact /></div><div className="rounded-[24px] border border-green-deep/10 bg-[#FCFFF0] p-6 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-7"><SectionLabel>Latest news</SectionLabel><h3 className="mt-3 text-2xl font-bold">Announcements</h3>{data.announcements.length ? <div className="mt-6 space-y-5">{data.announcements.slice(0, 3).map((item) => <div key={item.id} className="border-b border-green-deep/10 pb-5 last:border-0"><p className="font-bold">{item.title}</p><p className="mt-2 line-clamp-3 text-sm leading-6 text-text-mid">{item.body}</p></div>)}</div> : <Empty text="Program updates will appear here." />}</div></section>
  </div>
}

function Referrals({ referrals }: { referrals: any[] }) {
  const [search, setSearch] = useState('')
  const filtered = referrals.filter((item) => `${item.first_name} ${item.last_name} ${item.email}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="mt-8 rounded-[24px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-8"><div className="flex flex-wrap items-center justify-between gap-5"><div><SectionLabel>Client introductions</SectionLabel><h2 className="mt-3 text-2xl font-bold">Your referrals</h2><p className="mt-1 text-sm text-text-mid">Status updates are managed by the FXMed team.</p></div><div className="relative"><PortalIcon name="search" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-green-mid" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search referrals…" className="w-full rounded-full border border-green-deep/15 bg-[#FCFFF0] py-3 pl-11 pr-5 text-sm outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10 sm:w-72" /></div></div><ReferralRows referrals={filtered} /></section>
}

function ReferralRows({ referrals, compact = false }: { referrals: any[]; compact?: boolean }) {
  if (!referrals.length) return <Empty text="No referrals yet. Add your first referral to get started." />
  return <div className="mt-6 overflow-x-auto rounded-[16px] border border-green-deep/10"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="bg-[#FCFFF0] text-[11px] uppercase tracking-[0.08em] text-green-deep/55"><th className="px-5 py-4">Client</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Status</th>{!compact && <><th className="px-5 py-4">Membership</th><th className="px-5 py-4">Commission</th><th className="px-5 py-4">FXMed feedback</th></>}</tr></thead><tbody>{referrals.map((item) => <tr key={item.id} className="border-t border-green-deep/[0.07] transition hover:bg-green-50/40"><td className="px-5 py-4"><p className="font-bold text-green-deep">{item.first_name} {item.last_name}</p><p className="mt-1 text-xs text-gray-500">{item.email}</p></td><td className="px-5 py-4 text-text-mid">{date.format(new Date(item.created_at))}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${referralBadge[item.status] || 'bg-gray-100'}`}>{formatPortalLabel(item.status)}</span></td>{!compact && <><td className="px-5 py-4 text-text-mid">{item.membership_tier ? formatPortalLabel(item.membership_tier) : '—'}</td><td className="px-5 py-4"><p className="font-bold">{money.format(Number(item.commission_amount))}</p><p className="mt-1 text-xs text-gray-500">{formatPortalLabel(item.commission_status)}</p></td><td className="max-w-64 px-5 py-4 text-xs leading-5 text-text-mid">{item.admin_feedback || '—'}</td></>}</tr>)}</tbody></table></div>
}

function Earnings({ referrals, payouts, stats }: { referrals: any[]; payouts: any[]; stats: any }) {
  const pending = referrals.filter((item) => item.commission_status === 'pending').reduce((sum, item) => sum + Number(item.commission_amount), 0)
  return <div className="mt-8 space-y-6"><section className="grid gap-4 sm:grid-cols-3"><MoneyCard label="Approved earnings" value={stats.earned} Icon={SealCheckIcon} tone="bg-[#EEE8F5] text-[#76508C]" /><MoneyCard label="Paid to date" value={stats.paid} Icon={WalletIcon} tone="bg-[#E5F0FC] text-[#3374A8]" /><MoneyCard label="Pending review" value={pending} Icon={TimerIcon} tone="bg-[#FCE9E4] text-[#C7654C]" /></section><section className="rounded-[24px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-8"><SectionLabel>Commission records</SectionLabel><h2 className="mt-3 text-2xl font-bold">Payout history</h2>{payouts.length ? <div className="mt-6 overflow-x-auto rounded-[16px] border border-green-deep/10"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="bg-[#FCFFF0] text-[11px] uppercase tracking-[0.08em] text-green-deep/55"><th className="px-5 py-4">Date</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Reference / proof</th></tr></thead><tbody>{payouts.map((item) => <tr key={item.id} className="border-t border-green-deep/[0.07] transition hover:bg-green-50/40"><td className="px-5 py-4">{date.format(new Date(item.paid_at || item.created_at))}</td><td className="px-5 py-4 font-bold">{money.format(Number(item.amount))}</td><td className="px-5 py-4"><PortalPayoutBadge status={item.status} /></td><td className="px-5 py-4">{item.proof_url ? <a href={item.proof_url} target="_blank" rel="noreferrer" className="font-bold text-green-mid hover:underline">View proof</a> : item.payment_reference || '—'}</td></tr>)}</tbody></table></div> : <Empty text="Your payout history will appear after a commission is approved." />}</section></div>
}

function MoneyCard({ label, value, Icon, tone }: { label: string; value: number; Icon: typeof WalletIcon; tone: string }) { return <article className="rounded-[22px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)]"><span className={`flex h-11 w-11 items-center justify-center rounded-[13px] ${tone}`}><Icon size={23} weight="fill" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-text-mid/75">{label}</p><p className="mt-2 text-2xl font-bold tracking-[-0.03em]">{money.format(value)}</p></article> }

function Resources({ resources, announcements }: { resources: any[]; announcements: any[] }) { return <div className="mt-8 grid gap-6 xl:grid-cols-2"><section className="rounded-[24px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-8"><SectionLabel>Ambassador toolkit</SectionLabel><h2 className="mt-3 text-2xl font-bold">Program resources</h2><div className="mt-6 space-y-3">{resources.length ? resources.map((item) => <a key={item.id} href={item.resource_url} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-5 transition hover:-translate-y-0.5 hover:border-green-mid hover:shadow-custom"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-mid/10 text-green-mid"><PortalIcon name="document" className="h-5 w-5" /></span><span className="min-w-0"><span className="block font-bold text-green-deep">{item.title}</span><span className="mt-1 block text-sm leading-6 text-text-mid">{item.description || 'Open resource'}</span></span><PortalIcon name="external" className="ml-auto h-4 w-4 shrink-0 text-green-mid" /></a>) : <Empty text="Resources will be added by the FXMed team." />}</div></section><section className="rounded-[24px] border border-green-deep/10 bg-[#FCFFF0] p-6 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:p-8"><SectionLabel>Program updates</SectionLabel><h2 className="mt-3 text-2xl font-bold">Announcements</h2><div className="mt-6 space-y-5">{announcements.length ? announcements.map((item) => <article key={item.id} className="rounded-[16px] border border-green-deep/10 bg-white p-5"><p className="font-bold">{item.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-mid">{item.body}</p><p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-green-mid/70">{date.format(new Date(item.created_at))}</p></article>) : <Empty text="No announcements at this time." />}</div></section></div> }

function Profile({ profile, application, onSaved }: { profile: any; application: any; onSaved: () => void }) {
  const [form, setForm] = useState({ phone: profile.phone || '', organization: profile.organization || '', job_title: profile.job_title || '', bank_name: profile.bank_name || '', bank_account_name: profile.bank_account_name || '', bank_account_number: profile.bank_account_number || '' })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setMessage(''); const response = await fetch('/api/ambassador-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json().catch(() => ({})); setMessage(response.ok ? 'Profile updated successfully.' : result.error || 'Update failed.'); setSaving(false); if (response.ok) onSaved() }
  return <section className="mt-8 max-w-5xl overflow-hidden rounded-[26px] border border-green-deep/10 bg-white shadow-[0_8px_30px_rgba(26,61,46,0.06)]"><div className="relative overflow-hidden bg-green-deep p-6 text-white sm:p-8"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/20 blur-2xl" /><PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/20" /><div className="relative flex flex-wrap items-start justify-between gap-4"><div><SectionLabel inverse>Account details</SectionLabel><h2 className="mt-3 text-2xl font-bold">Personal and payment details</h2><p className="mt-2 text-sm text-white/65">Keep these details current for communication and payouts.</p></div><span className="rounded-full bg-gold px-4 py-2 text-xs font-bold text-green-deep">{profile.ambassador_code}</span></div></div><div className="p-6 sm:p-8">{message && <div className="mb-6 rounded-[14px] border border-green-mid/15 bg-green-50 p-4 text-sm font-semibold text-green-700">{message}</div>}<form onSubmit={save} className="grid gap-5 sm:grid-cols-2"><ReadOnly label="Name" value={`${application.first_name} ${application.last_name}`} /><ReadOnly label="Email" value={application.email} />{Object.entries({ phone: 'Phone', organization: 'Organization', job_title: 'Job title / role', bank_name: 'Bank name', bank_account_name: 'Account name', bank_account_number: 'Account number' }).map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 w-full rounded-[14px] border border-green-deep/15 bg-[#FCFFF0] px-4 py-3.5 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" /></label>)}<button disabled={saving} className="rounded-full bg-green-deep px-7 py-3.5 font-bold text-white shadow-custom transition hover:-translate-y-0.5 hover:bg-green-mid disabled:translate-y-0 disabled:opacity-50 sm:col-span-2 sm:justify-self-start">{saving ? 'Saving…' : 'Save changes'}</button></form></div></section>
}
function ReadOnly({ label, value }: { label: string; value: string }) { return <div><p className="text-sm font-bold">{label}</p><p className="mt-2 rounded-[14px] border border-green-deep/[0.06] bg-cream/55 px-4 py-3.5 text-sm text-text-mid">{value}</p></div> }

function ReferralModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '', consent_confirmed: false })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(''); const response = await fetch('/api/ambassador-portal/referrals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json().catch(() => ({})); if (response.ok) onCreated(); else setError(result.error || 'Unable to add referral.'); setSaving(false) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/80 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.28)]"><div className="relative overflow-hidden bg-green-deep p-6 text-white sm:p-8"><div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gold/20 blur-2xl" /><PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/20" /><div className="relative flex items-start justify-between gap-4"><div><SectionLabel inverse>New referral</SectionLabel><h2 className="mt-3 text-2xl font-bold">Introduce a prospective client</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/65">Only share details for a client who has agreed to be contacted by FXMed.</p></div><button type="button" onClick={onClose} aria-label="Close referral form" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl transition hover:bg-white hover:text-green-deep">×</button></div></div><div className="p-6 sm:p-8">{error && <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{[['first_name','First name'],['last_name','Last name'],['email','Email address'],['phone','Phone number']].map(([key,label]) => <label key={key} className="text-sm font-bold text-green-deep">{label}<input type={key === 'email' ? 'email' : 'text'} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required className="mt-2 w-full rounded-[14px] border border-green-deep/15 bg-[#FCFFF0] px-4 py-3.5 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" /></label>)}<label className="text-sm font-bold text-green-deep sm:col-span-2">Helpful notes (optional)<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="mt-2 w-full resize-none rounded-[14px] border border-green-deep/15 bg-[#FCFFF0] px-4 py-3.5 font-normal outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10" /></label><label className="flex items-start gap-3 rounded-[16px] border border-green-mid/15 bg-green-50 p-4 text-sm leading-6 text-green-deep sm:col-span-2"><input type="checkbox" checked={form.consent_confirmed} onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })} required className="mt-1 h-4 w-4 accent-green-deep" /><span>I confirm that this person has agreed for me to share their contact details with FXMed and to be contacted about FXMed services.</span></label><button disabled={saving} className="rounded-full bg-green-deep px-6 py-4 font-bold text-white shadow-custom transition hover:-translate-y-0.5 hover:bg-green-mid disabled:translate-y-0 disabled:opacity-50 sm:col-span-2">{saving ? 'Submitting…' : 'Submit referral'}</button></form></div></div></div>
}

function SupportModal({ onClose }: { onClose: () => void }) {
  const whatsappMessage = encodeURIComponent('Hello FXMed, I need assistance with the Ambassador Program.')
  const emailSubject = encodeURIComponent('FXMed Ambassador Program Support')
  const emailBody = encodeURIComponent('Hello FXMed Ambassador Program team,\n\nI need assistance with: ')

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-labelledby="support-modal-title" className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.28)]"><div className="relative overflow-hidden bg-green-deep p-7 text-white"><div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gold/20 blur-2xl" /><PortalNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/20" /><div className="relative flex items-start justify-between gap-4"><div><SectionLabel inverse>Ambassador help</SectionLabel><h2 id="support-modal-title" className="mt-3 text-2xl font-bold">Contact Support</h2><p className="mt-2 text-sm leading-6 text-white/65">Choose the most convenient way to reach our team.</p></div><button type="button" onClick={onClose} aria-label="Close support options" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl transition hover:bg-white hover:text-green-deep">×</button></div></div><div className="space-y-3 p-6"><a href={`https://wa.me/2349077031311?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5 no-underline transition hover:-translate-y-0.5 hover:border-[#25D366]/50 hover:shadow-custom"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#E2F8EA] text-[#168A43]"><WhatsappLogoIcon size={27} weight="fill" /></span><span><span className="block font-bold text-green-deep">Send us a WhatsApp message</span><span className="mt-1 block text-sm text-text-mid">Chat with the FXMed support team</span></span></a><a href={`mailto:fxmed@wellnesswits.com?subject=${emailSubject}&body=${emailBody}`} className="group flex items-center gap-4 rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5 no-underline transition hover:-translate-y-0.5 hover:border-green-mid hover:shadow-custom"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF2FE] text-[#3374A8]"><EnvelopeSimpleIcon size={27} weight="fill" /></span><span><span className="block font-bold text-green-deep">Send us an email</span><span className="mt-1 block text-sm text-text-mid">fxmed@wellnesswits.com</span></span></a></div></div></div>
}

function Empty({ text }: { text: string }) { return <div className="mt-6 rounded-[16px] border border-dashed border-green-deep/20 bg-cream/50 p-8 text-center text-sm leading-6 text-text-mid">{text}</div> }

function SectionLabel({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return <span className={`inline-flex rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] ${inverse ? 'border border-gold/25 bg-gold/10 text-gold' : 'bg-green-mid/10 text-green-mid'}`}>{children}</span>
}

function PortalPayoutBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
  }
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{formatPortalLabel(status)}</span>
}

function PortalNodes({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 800 500" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1"><path d="M60 70 160 120 105 205 60 70Z" /><path d="m160 120 92-58 58 118-205 25" /><path d="m590 320 105-58 55 132-112 42-48-116Z" /><path d="m695 262 42-130" strokeOpacity=".45" /></g><g fill="currentColor"><circle cx="60" cy="70" r="3" /><circle cx="160" cy="120" r="4" /><circle cx="105" cy="205" r="3" /><circle cx="252" cy="62" r="2.5" /><circle cx="310" cy="180" r="3" /><circle cx="590" cy="320" r="3" /><circle cx="695" cy="262" r="4" /><circle cx="750" cy="394" r="3" /><circle cx="638" cy="436" r="2.5" /></g></svg>
}

function PortalIcon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" /><path d="M16 13h4" /></>,
    folder: <path d="M3 5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2V5Z" />,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></>,
    progress: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    document: <><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
    support: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
  }
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
