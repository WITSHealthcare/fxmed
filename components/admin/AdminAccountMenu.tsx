'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretDownIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  LockKeyIcon,
  UserCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase-auth'

type Props = { roleLabel: string }

export default function AdminAccountMenu({ roleLabel }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const closeModal = useCallback(() => {
    if (saving) return
    setModalOpen(false)
    setError('')
    setSuccess(false)
    setShowPasswords(false)
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }, [saving])

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeModal() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [modalOpen, closeModal])

  const openPasswordModal = () => {
    setMenuOpen(false)
    setError('')
    setSuccess(false)
    setModalOpen(true)
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError('The new passwords do not match')
      return
    }
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      setError('Use at least 8 characters, including a letter and a number')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Password could not be updated')
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession(data.session)
        if (sessionError) throw sessionError
      }
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Password could not be updated')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-[14px] border border-green-deep/15 bg-white py-3 pl-11 pr-12 outline-none transition focus:border-green-mid focus:ring-2 focus:ring-green-mid/10'

  return <>
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} className="flex items-center gap-3 rounded-full border border-green-deep/10 bg-white px-3 py-2 text-left shadow-sm transition hover:border-green-mid/30 hover:shadow-md sm:px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-deep text-gold"><UserCircleIcon size={20} weight="fill" /></span>
        <span className="hidden min-w-0 md:block"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-mid/60">My account</span><span className="mt-0.5 block truncate text-xs font-bold text-green-deep">{roleLabel}</span></span>
        <CaretDownIcon size={15} weight="bold" className={`hidden text-green-mid transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-[18px] border border-green-deep/10 bg-white shadow-[0_20px_60px_rgba(26,61,46,0.18)]">
        <div className="bg-[#f7f5ee] p-4"><p className="truncate text-sm font-bold text-green-deep">{email || 'Dashboard account'}</p><p className="mt-1 text-xs text-text-mid">{roleLabel}</p></div>
        <div className="p-2"><button type="button" onClick={openPasswordModal} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-sm font-bold text-green-deep transition hover:bg-[#FCFFF0]"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gold/35"><KeyIcon size={19} weight="fill" /></span><span><span className="block">Change password</span><span className="mt-0.5 block text-[11px] font-normal text-text-mid">Update your dashboard login</span></span></button></div>
      </div>}
    </div>

    {modalOpen && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-green-deep/60 p-3 py-6 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onMouseDown={event => { if (event.target === event.currentTarget) closeModal() }}>
      <section className="relative my-auto max-h-[calc(100dvh-3rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/20 bg-white p-5 shadow-[0_28px_80px_rgba(17,45,33,0.35)] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[26px] sm:p-8">
        <button type="button" onClick={closeModal} disabled={saving} aria-label="Close password dialog" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f5ee] text-green-deep transition hover:bg-green-deep hover:text-white disabled:opacity-50"><XIcon size={20} weight="bold" /></button>
        <div className="flex items-center gap-3 pr-12"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-gold/35 text-green-deep sm:h-12 sm:w-12 sm:rounded-[14px]"><LockKeyIcon size={24} weight="fill" /></span><div><h3 id="change-password-title" className="text-xl font-bold tracking-[-0.03em] text-green-deep sm:text-2xl">Change password</h3><p className="mt-1 text-sm text-text-mid">Update the password for your own account.</p></div></div>

        {success ? <div className="mt-7"><div className="rounded-[16px] border border-green-200 bg-green-50 p-5 text-green-deep"><CheckCircleIcon size={30} weight="fill" className="text-green-mid" /><h4 className="mt-3 text-lg font-bold">Password updated</h4><p className="mt-1 text-sm leading-6 text-text-mid">Use your new password the next time you sign in. No email confirmation is required.</p></div><button type="button" onClick={closeModal} className="mt-5 w-full rounded-full bg-green-deep px-5 py-3.5 font-bold text-white">Done</button></div> : <form onSubmit={changePassword} className="mt-7 space-y-4">
          {error && <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {[
            ['currentPassword', 'Current password', 'current-password'],
            ['newPassword', 'New password', 'new-password'],
            ['confirmPassword', 'Confirm new password', 'new-password'],
          ].map(([field, label, autoComplete]) => <label key={field} className="block"><span className="mb-2 block text-sm font-bold text-green-deep">{label}</span><div className="relative"><LockKeyIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-mid" /><input type={showPasswords ? 'text' : 'password'} value={form[field as keyof typeof form]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} autoComplete={autoComplete} className={inputClass} required /><button type="button" onClick={() => setShowPasswords(visible => !visible)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-mid transition hover:text-green-deep">{showPasswords ? <EyeSlashIcon size={19} /> : <EyeIcon size={19} />}</button></div></label>)}
          <p className="rounded-[12px] bg-[#f7f5ee] p-3 text-xs leading-5 text-text-mid">Your new password must contain at least 8 characters, including a letter and a number. It must differ from your current password.</p>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row"><button type="button" onClick={closeModal} disabled={saving} className="flex-1 rounded-full border border-green-deep/15 px-5 py-3.5 font-bold text-green-deep disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-full bg-gold px-5 py-3.5 font-bold text-green-deep transition hover:-translate-y-0.5 disabled:opacity-50">{saving ? 'Updating…' : 'Update password'}</button></div>
        </form>}
      </section>
    </div>, document.body)}
  </>
}
