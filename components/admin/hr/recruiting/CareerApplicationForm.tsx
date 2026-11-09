'use client'

import { useEffect, useState } from 'react'
import { candidatePrivacyNoticeVersion } from '@/lib/hr'

type Role = { id: string; title: string; location: string; employment_type: string }

// Public application form for /careers (posts to /api/careers/apply). Opens
// from the floating "Apply online" button or a #apply / #apply-<opening id>
// link. The privacy notice must be acknowledged; talent-pool consent is a
// separate, optional choice.
export default function CareerApplicationForm({ openings, contactEmail }: { openings: Role[]; contactEmail: string }) {
  const [open, setOpen] = useState(false); const [openingId, setOpeningId] = useState(''); const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle'); const [error, setError] = useState(''); const [showNotice, setShowNotice] = useState(false)
  useEffect(() => {
    const fromHash = () => { const match = window.location.hash.match(/^#apply(?:-([0-9a-f-]{36}))?$/i); if (!match) return; setOpen(true); if (match[1] && openings.some((role) => role.id === match[1])) setOpeningId(match[1]) }
    fromHash(); window.addEventListener('hashchange', fromHash); return () => window.removeEventListener('hashchange', fromHash)
  }, [openings])
  if (!openings.length) return null
  const close = () => { setOpen(false); if (window.location.hash.startsWith('#apply')) history.replaceState(null, '', window.location.pathname + window.location.search) }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus('sending'); setError('')
    const form = new FormData(event.currentTarget); form.set('privacy_acknowledged', form.get('privacy_acknowledged') ? 'true' : 'false'); form.set('talent_pool', form.get('talent_pool') ? 'true' : 'false')
    const response = await fetch('/api/careers/apply', { method: 'POST', body: form }).catch(() => null); const result = await response?.json().catch(() => ({})) || {}
    if (!response?.ok) { setStatus('idle'); setError(result.error || 'We could not send your application. Please try again.'); return }
    setStatus('sent')
  }
  const label = 'font-dm-sans block text-[0.85rem] font-semibold text-green-deep'; const input = 'font-dm-sans mt-1.5 w-full rounded-[12px] border border-green-deep/15 bg-white px-4 py-3 text-[0.95rem] outline-none focus:border-green-mid'
  return <>
    <button onClick={() => setOpen(true)} className="font-dm-sans fixed bottom-6 right-6 z-40 rounded-[50px] bg-gold px-6 py-3.5 text-[0.95rem] font-semibold text-green-deep shadow-custom transition-all hover:bg-gold-light">Apply online →</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="apply-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">Careers at FXMed</p><h2 id="apply-title" className="font-dm-sans mt-1 text-[1.6rem] font-bold text-green-deep">Apply for a role</h2></div><button onClick={close} aria-label="Close" className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div>
        {status === 'sent' ? <div className="font-dm-sans mt-6 space-y-3 text-text-mid"><p className="text-[1.05rem] font-semibold text-green-deep">Thank you — your application is in.</p><p>We reply to every applicant within five working days at each stage, including when the answer is no. If anything changes, email <a className="font-semibold text-green-mid underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p><button onClick={close} className="mt-2 rounded-[30px] bg-green-deep px-6 py-3 font-semibold text-cream">Close</button></div>
        : <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p role="alert" className="font-dm-sans rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <label className={label}>Role<select name="opening_id" required value={openingId} onChange={(e) => setOpeningId(e.target.value)} className={input}><option value="">Choose a role…</option>{openings.map((role) => <option key={role.id} value={role.id}>{role.title} · {role.location} · {role.employment_type}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Full name<input name="full_name" required maxLength={160} autoComplete="name" className={input} /></label>
            <label className={label}>Email<input name="email" type="email" required maxLength={254} autoComplete="email" className={input} /></label>
            <label className={label}>Phone<input name="phone" type="tel" maxLength={40} autoComplete="tel" className={input} /></label>
            <label className={label}>Where you live<input name="location" maxLength={160} placeholder="e.g. Lekki, Lagos" className={input} /></label>
            <label className={label}>Notice period<input name="notice_period" maxLength={120} placeholder="e.g. 1 month" className={input} /></label>
            <label className={label}>Salary expectation (₦ per month)<input name="salary_expectation_ngn" type="number" min="0" className={input} /></label>
          </div>
          <label className={label}>Right to work in Nigeria<input name="right_to_work_status" maxLength={120} placeholder="e.g. Nigerian citizen, or permit type" className={input} /></label>
          <label className={label}>Why this role fits you<textarea name="cover_note" rows={4} maxLength={5000} className={input} /></label>
          <label className={label}>CV <span className="font-normal text-text-mid">(PDF or Word, up to 15 MB)</span><input name="cv" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className={input} /></label>
          {/* Honeypot: hidden from people, filled by bots. */}
          <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <div className="font-dm-sans rounded-[16px] bg-[#FCFFF0] p-4 text-[0.85rem] leading-[1.6] text-text-mid">
            <p><b className="text-green-deep">Candidate privacy notice</b> (version {candidatePrivacyNoticeVersion}). <button type="button" onClick={() => setShowNotice(!showNotice)} className="font-semibold text-green-mid underline">{showNotice ? 'Hide' : 'Read it'}</button></p>
            {showNotice && <div className="mt-2 space-y-2">
              <p>FXMed (WITS Functional Medicine, Lagos) is the data controller for your application under the Nigeria Data Protection Act 2023. We collect the details on this form and your CV to assess you for the role you choose, because you asked us to consider you for a job and we have a legitimate interest in a fair hiring process.</p>
              <p>Only our recruiter, the hiring manager and the interview panel for this role see your application; panel access ends when the role closes. We store it in our own HR system and do not ask for identity numbers, health information or references unless we decide to offer you the role, and then only with your consent.</p>
              <p>If you are not successful we keep your application, interview notes and scores for 12 months after the role closes, then delete them (anonymised statistics are kept). If you also agree to join our talent pool, we keep your details for up to 24 months, asking you to renew every 12, and you can withdraw at any time.</p>
              <p>You can ask to see, correct or delete your data, or withdraw consent, by emailing <a className="font-semibold text-green-mid underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>. You can also complain to the Nigeria Data Protection Commission.</p>
            </div>}
            <label className="mt-3 flex items-start gap-2.5"><input type="checkbox" name="privacy_acknowledged" required className="mt-1 h-4 w-4 accent-green-deep" /><span>I have read the candidate privacy notice.</span></label>
            <label className="mt-2 flex items-start gap-2.5"><input type="checkbox" name="talent_pool" className="mt-1 h-4 w-4 accent-green-deep" /><span>Optional: keep my details in FXMed's talent pool so you can contact me about future roles (up to 24 months, renewed every 12).</span></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={close} className="font-dm-sans rounded-[30px] border border-green-deep/15 px-6 py-3 font-semibold text-green-deep">Cancel</button><button disabled={status === 'sending'} className="font-dm-sans rounded-[30px] bg-green-deep px-6 py-3 font-semibold text-cream transition-all hover:bg-green-mid disabled:opacity-50">{status === 'sending' ? 'Sending…' : 'Send application'}</button></div>
        </form>}
      </div>
    </div>}
  </>
}
