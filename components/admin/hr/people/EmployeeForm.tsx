'use client'

import { useEffect, useState } from 'react'
import { displayName, employeeStatuses, hrDepartments, hrEmploymentTypes, hrLevels, type HrEmployee } from '@/lib/hr'
import { workPatterns, type EmergencyContact, type HrEmployeeFile, type HrPayrollProfile, type PortalAccount } from '@/lib/hr-people'
import { Field, Modal, buttonPrimary, call, peopleApi } from './ui'

// Admin only: create or edit an employee file, and the payroll profile.

const blank = { legal_name: '', preferred_name: '', staff_number: '', job_title: '', department: 'Clinical', employment_type: 'Full-time', level: '', status: 'pre_start', work_pattern: '', location: 'Lagos', work_email: '', personal_email: '', phone: '', date_of_birth: '', gender: '', nin: '', address: '', line_manager_id: '', buddy_id: '', clinical_supervisor_id: '', start_date: '', probation_end_date: '', retention_until: '', notes: '', auth_user_id: '', legal_hold: false }
type Form = typeof blank

function toForm(employee: HrEmployeeFile): Form {
  const text = (value: unknown) => typeof value === 'string' ? value : ''
  return Object.fromEntries(Object.keys(blank).map((key) => [key, key === 'legal_hold' ? !!employee.legal_hold : text(employee[key as keyof HrEmployeeFile])])) as Form
}

export function EmployeeForm({ employee, employees, onClose, onSaved }: { employee: HrEmployeeFile | null; employees: HrEmployee[]; onClose: () => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState<Form>(employee ? toForm(employee) : blank); const [contacts, setContacts] = useState<EmergencyContact[]>(employee?.emergency_contacts?.length ? employee.emergency_contacts : [{ name: '', relationship: '', phone: '' }])
  const [accounts, setAccounts] = useState<PortalAccount[]>([]); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { call<{ accounts: PortalAccount[] }>(`${peopleApi}?accounts=1`).then((r) => setAccounts(r.accounts)).catch((e) => setError(e.message)) }, [])
  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const others = employees.filter((e) => e.id !== employee?.id && e.status !== 'exited')
  const linkable = accounts.filter((a) => !a.linked_employee_id || a.linked_employee_id === employee?.id)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const body = { ...form, emergency_contacts: contacts.filter((c) => c.name && c.phone), ...(employee ? { id: employee.id } : {}) }
      const result = await call<{ employee: HrEmployee }>(peopleApi, employee ? 'PATCH' : 'POST', body)
      // Account links go through their own logged action on edit.
      if (employee && (form.auth_user_id || null) !== (employee.auth_user_id || null)) await call(peopleApi, 'PATCH', { id: employee.id, action: 'link', auth_user_id: form.auth_user_id || null })
      onSaved(result.employee.id)
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }
  const select = (key: keyof Form, list: readonly string[] | { value: string; label: string }[], empty?: string) => <select value={String(form[key])} onChange={set(key)} className="input">{empty !== undefined && <option value="">{empty}</option>}{list.map((item) => typeof item === 'string' ? <option key={item} value={item}>{item}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}</select>
  const person = (key: keyof Form) => select(key, others.map((e) => ({ value: e.id, label: `${displayName(e)} · ${e.job_title}` })), 'None')
  return <Modal wide title={employee ? `Edit ${displayName(employee)}` : 'New staff file'} eyebrow="Employee file" onClose={onClose}><form onSubmit={save} className="space-y-6">
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-green-mid">Job</legend>
      <Field label="Legal name"><input required maxLength={160} value={form.legal_name} onChange={set('legal_name')} className="input" /></Field>
      <Field label="Preferred name"><input maxLength={160} value={form.preferred_name} onChange={set('preferred_name')} className="input" /></Field>
      <Field label="Staff number"><input maxLength={40} value={form.staff_number} onChange={set('staff_number')} className="input" /></Field>
      <Field label="Job title"><input required maxLength={160} value={form.job_title} onChange={set('job_title')} className="input" /></Field>
      <Field label="Department">{select('department', hrDepartments)}</Field>
      <Field label="Employment type">{select('employment_type', hrEmploymentTypes)}</Field>
      <Field label="Level">{select('level', hrLevels, 'Not set')}</Field>
      <Field label="Status">{select('status', employeeStatuses.filter((s) => s.value !== 'exited' || form.status === 'exited'))}</Field>
      <Field label="Work pattern">{select('work_pattern', workPatterns, 'Not set')}</Field>
      <Field label="Location"><input maxLength={160} value={form.location} onChange={set('location')} className="input" /></Field>
      <Field label="Start date"><input type="date" value={form.start_date} onChange={set('start_date')} className="input" /></Field>
      <Field label="Probation ends" hint="defaults to start + 90 days"><input type="date" value={form.probation_end_date} onChange={set('probation_end_date')} className="input" /></Field>
      <Field label="Line manager" hint="sets who sees this file">{person('line_manager_id')}</Field>
      <Field label="Buddy">{person('buddy_id')}</Field>
      <Field label="Clinical supervisor">{person('clinical_supervisor_id')}</Field>
      <Field label="Portal account" hint="link only; create accounts in Users & Roles" className="sm:col-span-2">{select('auth_user_id', linkable.map((a) => ({ value: a.id, label: `${a.email} (${a.role})` })), 'Not linked')}</Field>
      <Field label="Work email"><input type="email" maxLength={254} value={form.work_email} onChange={set('work_email')} className="input" /></Field>
    </fieldset>
    <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-green-mid">Personal (employee and People Ops only)</legend>
      <Field label="Phone"><input maxLength={40} value={form.phone} onChange={set('phone')} className="input" /></Field>
      <Field label="Personal email"><input type="email" maxLength={254} value={form.personal_email} onChange={set('personal_email')} className="input" /></Field>
      <Field label="Date of birth"><input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className="input" /></Field>
      <Field label="Gender"><input maxLength={40} value={form.gender} onChange={set('gender')} className="input" /></Field>
      <Field label="NIN"><input maxLength={20} value={form.nin} onChange={set('nin')} className="input" /></Field>
      <Field label="Address"><input maxLength={500} value={form.address} onChange={set('address')} className="input" /></Field>
      <div className="sm:col-span-3"><p className="text-sm font-bold text-green-deep">Emergency contacts and next of kin <span className="font-normal text-gray-400">— two preferred for home-visit staff</span></p>
        {contacts.map((c, i) => <div key={i} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">{(['name', 'relationship', 'phone'] as const).map((key) => <input key={key} aria-label={key} placeholder={key[0].toUpperCase() + key.slice(1)} value={c[key]} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, [key]: e.target.value } : x))} className="input mt-0" />)}<button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} className="px-2 text-red-600">×</button></div>)}
        {contacts.length < 4 && <button type="button" onClick={() => setContacts([...contacts, { name: '', relationship: '', phone: '' }])} className="mt-2 text-xs font-bold text-green-mid">+ Add contact</button>}</div>
    </fieldset>
    <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-green-mid">Records (People Ops only)</legend>
      <Field label="Keep file until" hint="retention date"><input type="date" value={form.retention_until} onChange={set('retention_until')} className="input" /></Field>
      <label className="flex items-center gap-2 pt-7 text-sm font-bold text-green-deep"><input type="checkbox" checked={form.legal_hold} onChange={(e) => setForm({ ...form, legal_hold: e.target.checked })} />Legal hold (MD): nothing is deleted</label>
      <Field label="HR notes" className="sm:col-span-3"><textarea rows={3} maxLength={5000} value={form.notes} onChange={set('notes')} className="input" placeholder="No patient data here; reference record IDs instead." /></Field>
    </fieldset>
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className={buttonPrimary}>{saving ? 'Saving…' : employee ? 'Save changes' : 'Create file'}</button></div>
  </form></Modal>
}

const payrollBlank = { bank_name: '', account_number: '', account_name: '', bvn: '', tin: '', paye_state: 'Lagos', pfa_name: '', rsa_pin: '', nhf_number: '', pension_employee_rate: '8', pension_employer_rate: '10', group_life_enrolled_at: '', hmo_enrolled_at: '' }
export function PayrollForm({ employeeId, payroll, onClose, onSaved }: { employeeId: string; payroll: HrPayrollProfile | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(payroll ? Object.fromEntries(Object.keys(payrollBlank).map((key) => [key, String(payroll[key as keyof HrPayrollProfile] ?? '')])) as typeof payrollBlank : payrollBlank)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof payrollBlank) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  async function submit(body: Record<string, unknown>) { setSaving(true); setError(''); try { await call(`${peopleApi}/payroll`, 'PUT', { employee_id: employeeId, ...body }); onSaved() } catch (err) { setError((err as Error).message) } setSaving(false) }
  const input = (key: keyof typeof payrollBlank, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <Field label={label}><input value={form[key]} onChange={set(key)} className="input" {...props} /></Field>
  return <Modal title="Pay and statutory details" eyebrow="Payroll profile" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit(form) }} className="space-y-4">
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">{input('bank_name', 'Bank')}{input('account_number', 'Account number (NUBAN)', { inputMode: 'numeric', pattern: '[0-9]{10}' })}{input('account_name', 'Account name', { placeholder: 'Must match ID' })}{input('bvn', 'BVN', { inputMode: 'numeric', pattern: '[0-9]{11}', placeholder: 'Only if the bank or payroll provider requires it' })}
      {input('tin', 'TIN')}{input('paye_state', 'PAYE state')}{input('pfa_name', 'Pension fund administrator')}{input('rsa_pin', 'RSA PIN')}{input('nhf_number', 'NHF number')}
      {input('pension_employee_rate', 'Employee pension %', { type: 'number', min: 0, max: 100, step: '0.01' })}{input('pension_employer_rate', 'Employer pension %', { type: 'number', min: 0, max: 100, step: '0.01' })}
      {input('group_life_enrolled_at', 'Group life enrolled', { type: 'date' })}{input('hmo_enrolled_at', 'HMO enrolled', { type: 'date' })}</div>
    <p className="text-xs text-text-mid">Rates are the current understanding (8% / 10%) and need the accountant's confirmation. Changes are logged without the values.</p>
    <div className="flex flex-wrap justify-between gap-3">{payroll?.account_number || payroll?.bvn ? <button type="button" disabled={saving} onClick={() => confirm('Erase bank details and BVN? Do this at final pay + 3 months. The erasure is logged and cannot be undone.') && submit({ erase_bank: true })} className="text-sm font-bold text-red-600">Erase bank details and BVN</button> : <span />}
      <div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className={buttonPrimary}>{saving ? 'Saving…' : 'Save'}</button></div></div>
  </form></Modal>
}
