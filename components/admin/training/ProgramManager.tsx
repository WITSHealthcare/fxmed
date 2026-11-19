'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CourseFacts, CourseOutline } from '@/components/training/CoursePreview'
import { Alert, Badge, Field, Modal, Stat } from '@/components/admin/hr/people/ui'
import { formatPrice, hasForm, slugify, toPreview, type TrainingModule, type TrainingProgram, type TrainingVisibility } from '@/lib/training'
import { FormBuilder, ResponsesModal, newTrainingForm } from '../TrainingForms'

const api = '/api/admin/training'
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const roles = ['admin', 'clinical', 'sales'] as const

type Form = {
  title: string; description: string; status: 'draft' | 'published'; audience_roles: string[]; assigned_emails: string; modules: TrainingModule[]
  slug: string; visibility: TrainingVisibility; price_naira: string; cover_image_url: string; summary: string; learning_outcomes: string
  self_enrol: boolean; listed: boolean; sequential: boolean; certificate_enabled: boolean; default_due_days: string
}
const blank: Form = {
  title: '', description: '', status: 'draft', audience_roles: ['clinical'], assigned_emails: '', modules: [], slug: '', visibility: 'internal', price_naira: '',
  cover_image_url: '', summary: '', learning_outcomes: '', self_enrol: false, listed: true, sequential: false, certificate_enabled: true, default_due_days: '',
}
function programForm(program: TrainingProgram): Form {
  return {
    title: program.title, description: program.description, status: program.status, audience_roles: program.audience_roles, assigned_emails: program.assigned_emails.join('\n'),
    modules: program.modules, slug: program.slug || '', visibility: program.visibility || 'internal', price_naira: program.price_kobo ? String(program.price_kobo / 100) : '',
    cover_image_url: program.cover_image_url || '', summary: program.summary || '', learning_outcomes: (program.learning_outcomes || []).join('\n'),
    self_enrol: !!program.self_enrol, listed: program.listed !== false, sequential: !!program.sequential, certificate_enabled: !!program.certificate_enabled, default_due_days: program.default_due_days ? String(program.default_due_days) : '',
  }
}
const visibilityLabel: Record<TrainingVisibility, string> = { internal: 'Staff only', public: 'Public', both: 'Staff + public' }
const origin = () => typeof window === 'undefined' ? '' : window.location.origin
/** The links to share for a published course: the public course page, and/or the dashboard link for staff. */
function shareLinks(program: TrainingProgram) {
  const links: { key: string; label: string; url: string }[] = []
  if (program.visibility !== 'internal' && program.slug) links.push({ key: 'public', label: program.listed === false ? 'Public link (unlisted)' : 'Public link', url: `${origin()}/courses/${program.slug}` })
  if (program.visibility !== 'public') links.push({ key: 'staff', label: 'Staff link', url: `${origin()}/admin?tab=training&course=${program.id}` })
  return links
}

function ShareLinks({ program }: { program: TrainingProgram }) {
  const [copied, setCopied] = useState('')
  const copy = async (key: string, url: string) => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(key); setTimeout(() => setCopied(''), 1500) }
  return <div className="mt-3 space-y-2">{shareLinks(program).map((link) => <div key={link.key} className="flex max-w-xl items-center gap-2 rounded-full bg-gray-50 py-1 pl-4 pr-1 text-xs">
    <span className="shrink-0 font-bold text-green-mid">{link.label}</span><span className="min-w-0 flex-1 truncate text-text-mid">{link.url}</span>
    <button type="button" onClick={() => copy(link.key, link.url)} className="rounded-full bg-white px-3 py-1 font-bold text-green-deep shadow-sm">{copied === link.key ? 'Copied' : 'Copy link'}</button>
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-full px-2 py-1 font-bold text-green-mid">Open ↗</a>
  </div>)}</div>
}

// Admins build and publish courses here.
export default function ProgramManager() {
  const [programs, setPrograms] = useState<TrainingProgram[] | null>(null); const [error, setError] = useState('')
  const [editing, setEditing] = useState<TrainingProgram | 'new' | null>(null); const [reviewing, setReviewing] = useState<TrainingProgram | null>(null); const [previewing, setPreviewing] = useState<TrainingProgram | null>(null)
  const load = useCallback(async () => { const response = await fetch(api); const result = await response.json().catch(() => ({})); if (response.ok) setPrograms(result.programs || []); else { setError(result.error || 'Could not load training.'); setPrograms([]) } }, [])
  useEffect(() => { load() }, [load])

  async function save(form: Form, id?: string) {
    setError('')
    const body = { ...form, assigned_emails: form.assigned_emails.split(/[\n,]+/).map((email) => email.trim()).filter(Boolean), learning_outcomes: form.learning_outcomes.split('\n').map((line) => line.trim()).filter(Boolean), ...(id ? { id } : {}) }
    const response = await fetch(api, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json().catch(() => ({})); if (!response.ok) { setError(result.error || 'Could not save training.'); return false } await load(); return true
  }
  async function remove(program: TrainingProgram) { if (!confirm(`Permanently delete “${program.title}”? Enrolments, progress and quiz attempts for it are deleted too.`)) return; const response = await fetch(`${api}?id=${program.id}`, { method: 'DELETE' }); if (response.ok) await load(); else setError((await response.json()).error || 'Could not delete training.') }

  if (!programs) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading training…</div>
  const published = programs.filter((p) => p.status === 'published').length
  const open = programs.filter((p) => p.status === 'published' && p.visibility !== 'internal').length
  return <div className="space-y-6">
    <Alert>{error}</Alert>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"><Stat label="Courses" value={programs.length} /><Stat label="Published" value={published} /><Stat label="Public" value={open} /><Stat label="Drafts" value={programs.length - published} /></div>
    <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6"><div><h3 className="text-2xl font-bold text-green-deep">Courses</h3><p className="mt-1 text-sm text-text-mid">Build lessons and quizzes, assign staff, or publish to the public course catalogue.</p></div><button onClick={() => setEditing('new')} className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white">+ New course</button></div>
      {!programs.length ? <p className="p-16 text-center text-text-mid">No courses yet. Create the first one.</p> : <div className="divide-y">{programs.map((program) => {
        const lessons = program.modules.reduce((n, m) => n + m.lessons.length, 0); const forms = program.modules.reduce((n, m) => n + m.lessons.filter(hasForm).length, 0)
        return <div key={program.id} className="flex flex-wrap items-start justify-between gap-4 p-6"><div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold text-green-deep">{program.title}</h4><Badge tone={program.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-text-mid'}>{program.status}</Badge><Badge tone="bg-gold/30 text-green-deep">{visibilityLabel[program.visibility || 'internal']}</Badge>{program.visibility !== 'internal' && <Badge tone="bg-gray-100 text-text-mid">{formatPrice(program.price_kobo, program.currency)}</Badge>}{program.visibility !== 'internal' && program.listed === false && <Badge tone="bg-gray-100 text-text-mid">Unlisted</Badge>}</div>
          <p className="mt-1 text-sm text-text-mid">{program.summary || program.description || 'No description'}</p>
          <p className="mt-2 text-xs text-gray-500">{program.modules.length} modules · {lessons} lessons{forms ? ` · ${forms} form(s)` : ''}{program.visibility !== 'public' && ` · ${program.audience_roles.join(', ') || 'no roles'}`}{program.assigned_emails.length ? ` · ${program.assigned_emails.length} direct assignment(s)` : ''}{program.self_enrol ? ' · self-enrol' : ''}{program.sequential ? ' · in order' : ''}{program.default_due_days ? ` · due in ${program.default_due_days} days` : ''}</p>
          {program.status === 'published' ? <ShareLinks program={program} /> : <p className="mt-2 text-xs text-gray-400">Publish to get a shareable link.</p>}
        </div><div className="flex flex-wrap gap-2">
          <button onClick={() => setPreviewing(program)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Preview</button>
          {forms > 0 && <button onClick={() => setReviewing(program)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Responses</button>}
          <button onClick={() => setEditing(program)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Edit</button>
          <button onClick={() => remove(program)} className="rounded-full px-3 py-2 text-xs font-bold text-red-600">Delete</button>
        </div></div>
      })}</div>}
    </section>
    {reviewing && <ResponsesModal program={reviewing} onClose={() => setReviewing(null)} />}
    {previewing && <Modal title={previewing.title} eyebrow="What learners see before enrolling" wide onClose={() => setPreviewing(null)}>
      {previewing.description && <p className="whitespace-pre-wrap text-sm leading-6 text-text-mid">{previewing.description}</p>}
      <div className="my-5"><CourseFacts preview={toPreview(previewing)} showPrice={previewing.visibility !== 'internal'} /></div>
      <CourseOutline preview={toPreview(previewing)} />
    </Modal>}
    {editing && <Editor program={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={async (form) => { const ok = await save(form, editing === 'new' ? undefined : editing.id); if (ok) setEditing(null); return ok }} error={error} />}
  </div>
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string }) {
  return <label className="flex items-start gap-3 rounded-xl border bg-white p-3"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-green-deep" /><span><span className="block text-sm font-bold text-green-deep">{label}</span><span className="block text-xs text-text-mid">{hint}</span></span></label>
}

function Editor({ program, onClose, onSave, error }: { program: TrainingProgram | null; onClose: () => void; onSave: (form: Form) => Promise<boolean>; error: string }) {
  const [form, setForm] = useState<Form>(program ? programForm(program) : blank); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState('')
  const lessonCount = useMemo(() => form.modules.reduce((n, m) => n + m.lessons.length, 0), [form.modules])
  const updateModule = (index: number, module: TrainingModule) => setForm((f) => ({ ...f, modules: f.modules.map((m, i) => i === index ? module : m) }))
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const staff = form.visibility !== 'public'; const publicCourse = form.visibility !== 'internal'

  async function uploadCover(file: File) {
    setUploading(true); setUploadError('')
    const data = new FormData(); data.append('file', file)
    const response = await fetch('/api/upload-image', { method: 'POST', body: data }); const result = await response.json().catch(() => ({}))
    if (response.ok && result.url) set('cover_image_url', result.url); else setUploadError(result.error || 'Upload failed.')
    setUploading(false)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-label={program ? 'Edit course' : 'New course'} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Course builder</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{program ? 'Edit course' : 'New course'}</h3></div><button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full bg-gray-100 text-xl">×</button></div>
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false) }} className="mt-6 space-y-5">
      <Alert>{error}</Alert>
      <div className="grid gap-5 sm:grid-cols-[1fr_200px]"><Field label="Course title"><input required maxLength={160} value={form.title} onChange={(e) => set('title', e.target.value)} className="input" /></Field><Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])} className="input"><option value="draft">Draft</option><option value="published">Published</option></select></Field></div>
      <Field label="Short summary" hint="one or two sentences for course cards"><input maxLength={600} value={form.summary} onChange={(e) => set('summary', e.target.value)} className="input" /></Field>
      <Field label="Description"><textarea rows={3} maxLength={3000} value={form.description} onChange={(e) => set('description', e.target.value)} className="input" /></Field>
      <Field label="What learners will learn" hint="one outcome per line"><textarea rows={3} value={form.learning_outcomes} onChange={(e) => set('learning_outcomes', e.target.value)} className="input" /></Field>
      <Field label="Cover image" hint="optional">
        <div className="mt-2 flex flex-wrap items-center gap-3">{form.cover_image_url && <img src={form.cover_image_url} alt="" className="h-16 w-28 rounded-lg object-cover" />}<input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadCover(file) }} className="text-sm font-normal" />{form.cover_image_url && <button type="button" onClick={() => set('cover_image_url', '')} className="text-xs font-bold text-red-600">Remove</button>}{uploading && <span className="text-xs font-normal text-text-mid">Uploading…</span>}</div>
        {uploadError && <span className="mt-1 block text-xs font-normal text-red-600">{uploadError}</span>}
      </Field>

      <div className="rounded-2xl border bg-[#fbfaf6] p-5"><h4 className="font-bold text-green-deep">Who can take it</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">{(['internal', 'both', 'public'] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-white p-3 text-sm ${form.visibility === value ? 'border-green-mid font-bold text-green-deep' : 'text-text-mid'}`}><input type="radio" name="visibility" checked={form.visibility === value} onChange={() => set('visibility', value)} className="accent-green-deep" />{visibilityLabel[value]}</label>)}</div>
        {staff && <div className="mt-4 space-y-4">
          <Field label="Assign to roles"><div className="mt-2 flex flex-wrap gap-5">{roles.map((role) => <label key={role} className="flex items-center gap-2 font-normal capitalize"><input type="checkbox" checked={form.audience_roles.includes(role)} onChange={(e) => set('audience_roles', e.target.checked ? [...form.audience_roles, role] : form.audience_roles.filter((r) => r !== role))} />{role}</label>)}</div></Field>
          <Field label="Assign specific staff emails" hint="one per line or comma-separated"><textarea rows={2} value={form.assigned_emails} onChange={(e) => set('assigned_emails', e.target.value)} placeholder="member@fxmed.ng" className="input" /></Field>
          <Toggle checked={form.self_enrol} onChange={(v) => set('self_enrol', v)} label="Show in the staff catalogue" hint="Any staff member can preview and enrol themselves." />
        </div>}
        {publicCourse && <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Web address" hint={`fxmed.ng/courses/${form.slug || slugify(form.title) || '…'}`}><input value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder={slugify(form.title)} className="input" /></Field>
          <Field label="Price (₦)" hint="leave empty for free"><input type="number" min="0" step="100" value={form.price_naira} onChange={(e) => set('price_naira', e.target.value)} placeholder="0" className="input" /></Field>
          <div className="sm:col-span-2"><Toggle checked={form.listed} onChange={(v) => set('listed', v)} label="List in the public course catalogue" hint="Turn off to make it unlisted: only people with the link can find it, and it stays out of search results." /></div>
        </div>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={form.sequential} onChange={(v) => set('sequential', v)} label="Lessons in order" hint="Each lesson opens once the one before it is complete." />
        <Toggle checked={form.certificate_enabled} onChange={(v) => set('certificate_enabled', v)} label="Certificate on completion" hint="Learners download a PDF certificate with a verification number." />
        {staff && <Field label="Due" hint="days after enrolment; empty for no deadline" className="rounded-xl border bg-white p-3"><input type="number" min="1" max="365" value={form.default_due_days} onChange={(e) => set('default_due_days', e.target.value)} className="input" /></Field>}
      </div>

      <div className="rounded-2xl border bg-[#fbfaf6] p-5"><div className="flex items-center justify-between"><div><h4 className="font-bold text-green-deep">Course content</h4><p className="text-xs text-text-mid">{form.modules.length} modules · {lessonCount} lessons · YouTube and Vimeo links play inside the lesson</p></div><button type="button" onClick={() => set('modules', [...form.modules, { id: makeId('module'), title: '', lessons: [] }])} className="rounded-full bg-green-deep px-4 py-2 text-xs font-bold text-white">+ Module</button></div>
        <div className="mt-4 space-y-4">{form.modules.map((module, mi) => <div key={module.id} className="rounded-xl border bg-white p-4"><div className="flex gap-2"><input required value={module.title} onChange={(e) => updateModule(mi, { ...module, title: e.target.value })} placeholder={`Module ${mi + 1} title`} className="input mt-0" /><button type="button" aria-label="Remove module" onClick={() => set('modules', form.modules.filter((_, i) => i !== mi))} className="px-2 text-red-600">×</button></div><div className="mt-4 space-y-3">{module.lessons.map((lesson, li) => {
          const setLesson = (update: Partial<typeof lesson>) => updateModule(mi, { ...module, lessons: module.lessons.map((l, i) => i === li ? { ...l, ...update } : l) })
          return <div key={lesson.id} className="rounded-xl bg-gray-50 p-4"><div className="flex gap-2"><input required value={lesson.title} onChange={(e) => setLesson({ title: e.target.value })} placeholder="Lesson title" className="input mt-0" /><button type="button" aria-label="Remove lesson" onClick={() => updateModule(mi, { ...module, lessons: module.lessons.filter((_, i) => i !== li) })} className="px-2 text-red-600">×</button></div><textarea rows={4} value={lesson.content} onChange={(e) => setLesson({ content: e.target.value })} placeholder="Lesson content" className="input" /><div className="grid gap-3 sm:grid-cols-[1fr_150px]"><input type="url" value={lesson.resourceUrl} onChange={(e) => setLesson({ resourceUrl: e.target.value })} placeholder="Video or resource URL (optional)" className="input" /><input type="number" min="0" value={lesson.durationMinutes} onChange={(e) => setLesson({ durationMinutes: Number(e.target.value) })} placeholder="Minutes" aria-label="Minutes" className="input" /></div>{lesson.form ? <FormBuilder form={lesson.form} onChange={(f) => setLesson({ form: f })} onRemove={() => setLesson({ form: null })} passNote="learners must pass to complete the lesson" /> : <button type="button" onClick={() => setLesson({ form: newTrainingForm() })} className="mt-3 rounded-full border border-dashed border-green-mid/40 px-4 py-2 text-xs font-bold text-green-mid">+ Add survey or quiz</button>}</div>
        })}</div><button type="button" onClick={() => updateModule(mi, { ...module, lessons: [...module.lessons, { id: makeId('lesson'), title: '', content: '', resourceUrl: '', durationMinutes: 0 }] })} className="mt-3 text-xs font-bold text-green-mid">+ Add lesson</button></div>)}</div>
      </div>
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : program ? 'Save changes' : 'Create course'}</button></div>
    </form></div></div>
}
