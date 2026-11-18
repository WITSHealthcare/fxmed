'use client'

import { useCallback, useEffect, useState } from 'react'
import CoursePlayer from '@/components/training/CoursePlayer'
import { CourseFacts, CourseOutline } from '@/components/training/CoursePreview'
import { Alert, Badge, Modal, buttonPrimary, buttonSecondary, call, formatDay } from '@/components/admin/hr/people/ui'
import { isOverdue, type TrainingAnswer, type TrainingPreview, type TrainingProgram } from '@/lib/training'

const api = '/api/admin/training'

// A staff member's own learning: assigned and joined courses, the staff
// catalogue with a preview before joining, and the lesson player.
export default function StaffLearning() {
  const [programs, setPrograms] = useState<TrainingProgram[] | null>(null)
  const [catalogue, setCatalogue] = useState<TrainingPreview[]>([])
  const [view, setView] = useState<'mine' | 'catalogue'>('mine')
  const [openId, setOpenId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<TrainingPreview | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { const result = await call<{ programs: TrainingProgram[]; catalogue: TrainingPreview[] }>(`${api}?view=learn`); setPrograms(result.programs); setCatalogue(result.catalogue || []) }
    catch (loadError) { setError((loadError as Error).message); setPrograms([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const patch = (id: string, update: Partial<TrainingProgram>) => setPrograms((items) => (items || []).map((item) => item.id === id ? { ...item, ...update } : item))
  async function tick(program: TrainingProgram, lessonId: string, completed: boolean) {
    setError('')
    try { patch(program.id, await call<Partial<TrainingProgram>>(api, 'PATCH', { id: program.id, lessonId, completed })) }
    catch (tickError) { setError((tickError as Error).message) }
  }
  async function submit(program: TrainingProgram, lessonId: string, answers: Record<string, TrainingAnswer>) {
    setError('')
    try {
      const { response, ...progress } = await call<Partial<TrainingProgram> & { response: NonNullable<TrainingProgram['form_responses']>[number] }>(`${api}/responses`, 'POST', { programId: program.id, lessonId, answers })
      patch(program.id, { ...progress, form_responses: [...(program.form_responses || []).filter((item) => item.lesson_id !== lessonId), response] })
      return true
    } catch (submitError) { setError((submitError as Error).message); return false }
  }
  async function join(preview: TrainingPreview) {
    setError('')
    try { await call(`${api}/enrol`, 'POST', { id: preview.id }); setPreviewing(null); await load(); setView('mine'); setOpenId(preview.id) }
    catch (joinError) { setError((joinError as Error).message) }
  }

  if (!programs) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading your training…</div>
  const open = programs.find((program) => program.id === openId)
  if (open) return <div className="space-y-4"><Alert>{error}</Alert><CoursePlayer program={open} onBack={() => setOpenId(null)} onTick={(lessonId, completed) => tick(open, lessonId, completed)} onSubmit={(lessonId, answers) => submit(open, lessonId, answers)} /></div>

  const overdue = programs.filter((program) => isOverdue(program.enrolment)).length
  return <div className="space-y-5">
    <Alert>{error}</Alert>
    <div className="flex flex-wrap items-center gap-2" role="tablist">
      {([['mine', `My courses (${programs.length})`], ['catalogue', `Catalogue (${catalogue.length})`]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`rounded-full px-4 py-2 text-sm font-bold ${view === id ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>{label}</button>)}
      {overdue > 0 && <span className="ml-auto text-sm font-bold text-red-600">{overdue} overdue</span>}
    </div>

    {view === 'mine' ? (!programs.length
      ? <div className="rounded-[20px] border bg-white p-16 text-center"><h3 className="text-xl font-bold text-green-deep">No training yet</h3><p className="mt-2 text-text-mid">Courses assigned to you appear here. {catalogue.length > 0 && <button onClick={() => setView('catalogue')} className="font-bold text-green-mid underline">Browse the catalogue</button>}</p></div>
      : <div className="grid gap-4 md:grid-cols-2">{programs.map((program) => {
        const late = isOverdue(program.enrolment); const percent = program.progress_percent || 0
        return <button key={program.id} onClick={() => setOpenId(program.id)} className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white text-left shadow-sm transition hover:shadow-md">
          {program.cover_image_url && <img src={program.cover_image_url} alt="" className="h-32 w-full object-cover" />}
          <div className="p-5">
            <div className="flex flex-wrap gap-2">{percent === 100 ? <Badge>Complete</Badge> : late ? <Badge tone="bg-red-50 text-red-700">Overdue</Badge> : <Badge tone="bg-gold/30 text-green-deep">{percent > 0 ? 'In progress' : 'Not started'}</Badge>}{program.enrolment?.due_at && percent < 100 && <Badge tone="bg-gray-100 text-text-mid">Due {formatDay(program.enrolment.due_at)}</Badge>}</div>
            <h3 className="mt-3 text-lg font-bold text-green-deep">{program.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-text-mid">{program.summary || program.description}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} /></div>
            <p className="mt-2 text-xs font-bold text-green-mid">{percent}% complete · {percent === 100 ? 'Review' : percent > 0 ? 'Continue' : 'Start'} →</p>
          </div>
        </button>
      })}</div>)
      : (!catalogue.length
        ? <div className="rounded-[20px] border bg-white p-16 text-center text-text-mid">No other courses are open to join right now.</div>
        : <div className="grid gap-4 md:grid-cols-2">{catalogue.map((preview) => <div key={preview.id} className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
          {preview.cover_image_url && <img src={preview.cover_image_url} alt="" className="h-32 w-full object-cover" />}
          <div className="p-5"><h3 className="text-lg font-bold text-green-deep">{preview.title}</h3><p className="mt-1 line-clamp-2 text-sm text-text-mid">{preview.summary || preview.description}</p><div className="mt-3"><CourseFacts preview={preview} showPrice={false} /></div>
            <div className="mt-4 flex gap-2"><button onClick={() => setPreviewing(preview)} className={buttonSecondary}>Preview</button><button onClick={() => join(preview)} className={buttonPrimary}>Enrol</button></div></div>
        </div>)}</div>)}

    {previewing && <Modal title={previewing.title} eyebrow="Course preview" wide onClose={() => setPreviewing(null)}>
      {previewing.description && <p className="whitespace-pre-wrap text-sm leading-6 text-text-mid">{previewing.description}</p>}
      <div className="my-5"><CourseFacts preview={previewing} showPrice={false} /></div>
      <CourseOutline preview={previewing} />
      <div className="mt-6 flex justify-end gap-3"><button onClick={() => setPreviewing(null)} className={buttonSecondary}>Close</button><button onClick={() => join(previewing)} className={buttonPrimary}>Enrol in this course</button></div>
    </Modal>}
  </div>
}
