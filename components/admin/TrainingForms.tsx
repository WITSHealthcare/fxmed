'use client'

import { useEffect, useMemo, useState } from 'react'
import { ResponseSummary, answerColumns } from '@/components/forms/FormKit'
import type { TrainingFormResponse, TrainingProgram } from '@/lib/training'

export { FormBuilder, FormFill, newForm as newTrainingForm } from '@/components/forms/FormKit'

export function ResponsesModal({ program, onClose }: { program: TrainingProgram; onClose: () => void }) {
  const [responses, setResponses] = useState<TrainingFormResponse[] | null>(null); const [error, setError] = useState('')
  const lessons = useMemo(() => program.modules.flatMap((m) => m.lessons.filter((l) => l.form?.questions.length).map((l) => ({ ...l, module: m.title }))), [program])
  const [lessonId, setLessonId] = useState(lessons[0]?.id || '')
  useEffect(() => {
    fetch(`/api/admin/training/responses?programId=${program.id}`).then(async (r) => { const result = await r.json().catch(() => ({})); r.ok ? setResponses(result.responses || []) : setError(result.error || 'Could not load responses.') })
  }, [program.id])
  const lesson = lessons.find((l) => l.id === lessonId); const form = lesson?.form
  const rows = (responses || []).filter((r) => r.lesson_id === lessonId)

  function exportCsv() {
    if (!form) return
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const columns = answerColumns(form.questions)
    const header = ['Respondent', 'Submitted', ...(form.kind === 'quiz' ? ['Score %', 'Passed'] : []), ...columns.map((c) => c.header)]
    const body = rows.map((r) => [r.respondent, new Date(r.submitted_at).toISOString(), ...(form.kind === 'quiz' ? [r.score ?? '', r.passed === null ? '' : r.passed ? 'Yes' : 'No'] : []), ...columns.map((c) => c.value(r.answers))])
    const url = URL.createObjectURL(new Blob([[header, ...body].map((line) => line.map(cell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `${program.title}-${lesson!.title}-responses.csv`.replace(/[^\w.-]+/g, '-'); a.click(); URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
    <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Form responses</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{program.title}</h3></div><button onClick={onClose} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div>
    {!lessons.length ? <p className="py-16 text-center text-text-mid">No lessons in this program have a form yet. Add one from the program editor.</p> : <>
      <div className="mt-5 flex flex-wrap items-center gap-3"><select aria-label="Lesson form" value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="input mt-0 w-auto flex-1">{lessons.map((l) => <option key={l.id} value={l.id}>{l.module} — {l.title} ({l.form!.kind})</option>)}</select><button type="button" disabled={!rows.length} onClick={exportCsv} className="rounded-full border px-4 py-2.5 text-xs font-bold text-green-deep disabled:opacity-40">Export CSV</button></div>
      {error ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : !responses ? <p className="py-16 text-center text-text-mid">Loading responses…</p> : form && <ResponseSummary form={form} rows={rows.map((r) => ({ ...r, key: r.user_id }))} />}
    </>}
  </div></div>
}
