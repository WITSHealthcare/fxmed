'use client'

import { useState } from 'react'

const tiers = [
  { name: 'Tier 1', level: 'Essential', monthly: 65000, rate: 10, annual: 780000, commission: 78000 },
  { name: 'Tier 2', level: 'Premium', monthly: 450000, rate: 15, annual: 5400000, commission: 810000 },
  { name: 'Tier 3', level: 'Elite', monthly: 700000, rate: 20, annual: 8400000, commission: 1680000 },
]

const signupCounts = [5, 10, 15, 20, 25]

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export default function CompensationModel() {
  const [tierIndex, setTierIndex] = useState(1)
  const [signups, setSignups] = useState(5)
  const selectedTier = tiers[tierIndex]
  const estimatedCommission = selectedTier.commission * signups

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((tier, index) => (
          <article
            key={tier.name}
            className={`relative overflow-hidden rounded-[24px] border p-7 transition-all duration-300 ${index === 1 ? 'border-gold bg-green-deep text-white shadow-[0_18px_45px_rgba(20,55,42,0.18)]' : 'border-green-deep/10 bg-white text-green-deep hover:-translate-y-1 hover:shadow-custom'}`}
          >
            {index === 1 && <span className="absolute right-5 top-5 rounded-full bg-gold px-3 py-1 font-dm-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-green-deep">Popular</span>}
            <p className={`font-dm-sans text-sm font-semibold ${index === 1 ? 'text-gold' : 'text-green-mid'}`}>{tier.name}</p>
            <h3 className="mt-1 font-dm-sans text-2xl font-bold">{tier.level}</h3>
            <p className={`mt-5 font-dm-sans text-sm ${index === 1 ? 'text-cream/70' : 'text-text-mid'}`}>Monthly membership</p>
            <p className="mt-1 font-dm-sans text-2xl font-bold">{naira.format(tier.monthly)}</p>
            <div className={`my-6 h-px ${index === 1 ? 'bg-white/15' : 'bg-green-deep/10'}`} />
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={`font-dm-sans text-sm ${index === 1 ? 'text-cream/70' : 'text-text-mid'}`}>Commission rate</p>
                <p className={`mt-1 font-dm-sans text-3xl font-bold ${index === 1 ? 'text-gold' : 'text-green-deep'}`}>{tier.rate}%</p>
              </div>
              <div className="text-right">
                <p className={`font-dm-sans text-sm ${index === 1 ? 'text-cream/70' : 'text-text-mid'}`}>Per annual signup</p>
                <p className="mt-1 font-dm-sans text-lg font-bold">{naira.format(tier.commission)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 grid overflow-hidden rounded-[28px] border border-green-deep/10 bg-white shadow-[0_12px_40px_rgba(26,61,46,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-7 sm:p-10">
          <p className="font-dm-sans text-sm font-semibold uppercase tracking-[0.12em] text-green-mid">Earnings estimator</p>
          <h3 className="mt-3 font-dm-sans text-3xl font-bold text-green-deep">Estimate your annual commission</h3>
          <p className="mt-3 max-w-xl font-dm-sans leading-7 text-text-mid">Choose a membership tier and the number of successful signups to see an illustrative estimate.</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <label className="font-dm-sans text-sm font-semibold text-green-deep">
              Membership tier
              <select
                value={tierIndex}
                onChange={(event) => setTierIndex(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-green-deep/15 bg-[#FCFFF0] px-4 py-3 font-dm-sans text-base font-medium text-green-deep outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/15"
              >
                {tiers.map((tier, index) => <option key={tier.name} value={index}>{tier.name} — {tier.level}</option>)}
              </select>
            </label>

            <label className="font-dm-sans text-sm font-semibold text-green-deep">
              Successful signups
              <input
                type="number"
                min="1"
                max="100"
                value={signups}
                onChange={(event) => setSignups(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                className="mt-2 w-full rounded-xl border border-green-deep/15 bg-[#FCFFF0] px-4 py-3 font-dm-sans text-base font-medium text-green-deep outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/15"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-green-deep p-8 text-white sm:p-10">
          <p className="font-dm-sans text-sm text-cream/70">Estimated annual commission</p>
          <p className="mt-2 break-words font-dm-sans text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-none text-gold">{naira.format(estimatedCommission)}</p>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-6">
            <div><p className="font-dm-sans text-xs text-cream/60">Commission per signup</p><p className="mt-1 font-dm-sans font-bold">{naira.format(selectedTier.commission)}</p></div>
            <div><p className="font-dm-sans text-xs text-cream/60">Successful signups</p><p className="mt-1 font-dm-sans font-bold">{signups}</p></div>
          </div>
        </div>
      </div>

      <details className="group mt-8 overflow-hidden rounded-2xl border border-green-deep/10 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-dm-sans font-bold text-green-deep marker:content-none">
          View full compensation breakdown
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-mid/10 text-xl text-green-mid transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="border-t border-green-deep/10 px-5 pb-6 pt-5 sm:px-6">
          <div className="overflow-x-auto rounded-xl border border-green-deep/10">
            <table className="w-full min-w-[720px] border-collapse font-dm-sans">
              <caption className="sr-only">FXMed Elite ambassador compensation details</caption>
              <thead><tr className="bg-green-deep text-left text-sm text-white"><th className="px-5 py-4">Membership tier</th><th className="px-5 py-4">Monthly subscription</th><th className="px-5 py-4">Commission</th><th className="px-5 py-4">Annual subscription</th><th className="px-5 py-4">Per signup</th></tr></thead>
              <tbody>{tiers.map((tier) => <tr key={tier.name} className="border-b border-gray-100 last:border-0"><td className="px-5 py-4 text-sm font-bold text-green-deep">{tier.name}</td><td className="px-5 py-4 text-sm text-text-mid">{naira.format(tier.monthly)}</td><td className="px-5 py-4 text-sm text-text-mid">{tier.rate}%</td><td className="px-5 py-4 text-sm text-text-mid">{naira.format(tier.annual)}</td><td className="px-5 py-4 text-sm text-text-mid">{naira.format(tier.commission)}</td></tr>)}</tbody>
            </table>
          </div>

          <h4 className="mb-4 mt-8 font-dm-sans text-xl font-bold text-green-deep">Illustrative annual commissions</h4>
          <div className="overflow-x-auto rounded-xl border border-green-deep/10">
            <table className="w-full min-w-[680px] border-collapse font-dm-sans">
              <caption className="sr-only">Annual commissions by successful signups</caption>
              <thead><tr className="bg-gold text-left text-sm text-green-deep"><th className="px-5 py-4">Signups</th>{tiers.map((tier) => <th key={tier.name} className="px-5 py-4">{tier.name} — {naira.format(tier.commission)}/referral</th>)}</tr></thead>
              <tbody>{signupCounts.map((count) => <tr key={count} className="border-b border-gray-100 last:border-0"><td className="px-5 py-4 text-sm font-bold text-green-deep">{count}</td>{tiers.map((tier) => <td key={tier.name} className="px-5 py-4 text-sm text-text-mid">{naira.format(tier.commission * count)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </details>

      <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4">
        <p className="font-dm-sans text-sm leading-6 text-green-deep"><span className="font-bold">Payment and partnership terms:</span> Commissions are disbursed within 30 days of a successful client subscription. Rewards are structured as business-development partnerships, not clinical referral fees. Final percentages and terms are documented in each Ambassador Agreement.</p>
      </div>
    </>
  )
}
