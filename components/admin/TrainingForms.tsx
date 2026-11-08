'use client'

import { useEffect, useMemo, useState } from 'react'
import { choiceTypes, isGradable, questionOptions, questionTypes, type TrainingAnswer, type TrainingForm, type TrainingFormResponse, type TrainingProgram, type TrainingQuestion, type TrainingQuestionType } from '@/lib/training'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const newQuestion = (type: TrainingQuestionType = 'single_choice'): TrainingQuestion => ({ id: makeId('question'), type, label: '', help: '', required: true, options: choiceTypes.includes(type) ? ['Option 1', 'Option 2'] : [], correct: [], scaleMax: 5 })
export const newTrainingForm = (): TrainingForm => ({ kind: 'survey', title: '', description: '', passPercent: 70, questions: [newQuestion()] })
const formatAnswer = (answer: TrainingAnswer | undefined) => answer === undefined ? '' : Array.isArray(answer) ? answer.join(', ') : String(answer)

// ---------- Builder (admin) ----------

export function FormBuilder({ form, onChange, onRemove }: { form: TrainingForm; onChange: (form: TrainingForm) => void; onRemove: () => void }) {
  const [preview, setPreview] = useState(false)
  const quiz = form.kind === 'quiz'
  const gradable = form.questions.filter(isGradable).length
  const setQuestion = (index: number, question: TrainingQuestion) => onChange({ ...form, questions: form.questions.map((q, i) => i === index ? question : q) })
  const move = (index: number, by: number) => { const questions = [...form.questions]; const [q] = questions.splice(index, 1); questions.splice(index + by, 0, q); onChange({ ...form, questions }) }
  return <div className="mt-3 rounded-xl border border-green-mid/25 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Lesson form</p><div className="flex rounded-full bg-gray-100 p-0.5 text-xs font-bold">{(['survey', 'quiz'] as const).map((kind) => <button key={kind} type="button" onClick={() => onChange({ ...form, kind })} className={`rounded-full px-3 py-1 capitalize ${form.kind === kind ? 'bg-green-deep text-white' : 'text-green-deep'}`}>{kind}</button>)}</div></div>
      <div className="flex gap-2"><button type="button" onClick={() => setPreview(!preview)} className="rounded-full border px-3 py-1 text-xs font-bold text-green-deep">{preview ? 'Back to editing' : 'Preview'}</button><button type="button" onClick={() => { if (confirm('Remove this form from the lesson?')) onRemove() }} className="rounded-full px-3 py-1 text-xs font-bold text-red-600">Remove form</button></div></div>
    {preview ? <div className="mt-4 rounded-xl bg-[#fbfaf6] p-4"><FormFill form={form} preview /></div> : <>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]"><input value={form.title} maxLength={160} onChange={(e) => onChange({ ...form, title: e.target.value })} placeholder={quiz ? 'Quiz title (optional)' : 'Survey title (optional)'} className="input" />{quiz && <label className="text-xs font-bold text-green-deep">Pass mark %<input type="number" min="0" max="100" value={form.passPercent} onChange={(e) => onChange({ ...form, passPercent: Number(e.target.value) })} className="input mt-1" /></label>}</div>
      <textarea rows={2} maxLength={3000} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Instructions for learners (optional)" className="input mt-3" />
      {quiz && <p className="mt-2 text-xs text-text-mid">{gradable ? `${gradable} graded question(s). Learners must score ${form.passPercent}% to complete the lesson.` : 'Mark the correct answers on choice questions to grade this quiz.'}</p>}
      <div className="mt-4 space-y-3">{form.questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} quiz={quiz} total={form.questions.length} onChange={(q) => setQuestion(index, q)} onMove={(by) => move(index, by)}
        onDuplicate={() => onChange({ ...form, questions: [...form.questions.slice(0, index + 1), { ...question, id: makeId('question') }, ...form.questions.slice(index + 1)] })}
        onDelete={() => onChange({ ...form, questions: form.questions.filter((_, i) => i !== index) })} />)}</div>
      <button type="button" onClick={() => onChange({ ...form, questions: [...form.questions, newQuestion()] })} className="mt-3 text-xs font-bold text-green-mid">+ Add question</button>
    </>}
  </div>
}

function QuestionEditor({ question, index, total, quiz, onChange, onMove, onDuplicate, onDelete }: { question: TrainingQuestion; index: number; total: number; quiz: boolean; onChange: (q: TrainingQuestion) => void; onMove: (by: number) => void; onDuplicate: () => void; onDelete: () => void }) {
  const options = questionOptions(question); const multi = question.type === 'multi_choice'
  const changeType = (type: TrainingQuestionType) => onChange({ ...question, type, correct: [], options: choiceTypes.includes(type) ? (question.options.length >= 2 ? question.options : ['Option 1', 'Option 2']) : [] })
  const renameOption = (i: number, value: string) => onChange({ ...question, options: question.options.map((o, j) => j === i ? value : o), correct: question.correct.map((c) => c === question.options[i] ? value : c) })
  const toggleCorrect = (option: string) => onChange({ ...question, correct: question.correct.includes(option) ? question.correct.filter((c) => c !== option) : multi ? [...question.correct, option] : [option] })
  return <div className="rounded-xl bg-gray-50 p-4">
    <div className="flex flex-wrap gap-2"><span className="pt-3 text-xs font-bold text-gray-400">Q{index + 1}</span><input required value={question.label} maxLength={500} onChange={(e) => onChange({ ...question, label: e.target.value })} placeholder="Question" className="input mt-0 min-w-[200px] flex-1" />
      <select aria-label="Question type" value={question.type} onChange={(e) => changeType(e.target.value as TrainingQuestionType)} className="input mt-0 w-auto">{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
    <input value={question.help} maxLength={1000} onChange={(e) => onChange({ ...question, help: e.target.value })} placeholder="Help text (optional)" className="input mt-2 py-2 text-xs" />
    {choiceTypes.includes(question.type) && <div className="mt-3 space-y-2">{question.options.map((option, i) => <div key={i} className="flex items-center gap-2"><span className={`h-4 w-4 shrink-0 border border-gray-300 ${multi ? 'rounded' : 'rounded-full'}`} /><input required value={option} maxLength={200} onChange={(e) => renameOption(i, e.target.value)} className="input mt-0 py-2" />
      {quiz && <CorrectToggle on={question.correct.includes(option)} onClick={() => toggleCorrect(option)} />}
      <button type="button" disabled={question.options.length <= 2} onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i), correct: question.correct.filter((c) => c !== option) })} className="px-2 text-red-600 disabled:opacity-30" aria-label="Remove option">×</button></div>)}
      <button type="button" disabled={question.options.length >= 30} onClick={() => onChange({ ...question, options: [...question.options, `Option ${question.options.length + 1}`] })} className="text-xs font-bold text-green-mid">+ Add option</button></div>}
    {question.type === 'yes_no' && quiz && <div className="mt-3 flex gap-3">{options.map((option) => <span key={option} className="flex items-center gap-2 text-sm">{option}<CorrectToggle on={question.correct.includes(option)} onClick={() => toggleCorrect(option)} /></span>)}</div>}
    {question.type === 'rating' && <label className="mt-3 flex items-center gap-2 text-xs font-bold text-green-deep">Scale 1 to<select value={question.scaleMax} onChange={(e) => onChange({ ...question, scaleMax: Number(e.target.value) })} className="input mt-0 w-auto py-1.5"><option value={5}>5</option><option value={10}>10</option></select></label>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><label className="flex items-center gap-2 text-xs font-bold text-green-deep"><input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...question, required: e.target.checked })} className="accent-green-deep" />Required</label>
      <div className="flex gap-1 text-xs font-bold text-green-deep"><button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-full px-2 py-1 disabled:opacity-30" aria-label="Move up">↑</button><button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-full px-2 py-1 disabled:opacity-30" aria-label="Move down">↓</button><button type="button" onClick={onDuplicate} className="rounded-full px-2 py-1">Duplicate</button><button type="button" onClick={onDelete} className="rounded-full px-2 py-1 text-red-600">Delete</button></div></div>
  </div>
}

function CorrectToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${on ? 'bg-green-deep text-white' : 'border text-gray-400'}`}>{on ? '✓ Correct' : 'Correct?'}</button>
}

// ---------- Filling in (learner) ----------

export function FormFill({ form, response, preview, onSubmit }: { form: TrainingForm; response?: TrainingFormResponse; preview?: boolean; onSubmit?: (answers: Record<string, TrainingAnswer>) => Promise<boolean> }) {
  const [answers, setAnswers] = useState<Record<string, TrainingAnswer>>(response?.answers || {})
  const [editing, setEditing] = useState(!response); const [saving, setSaving] = useState(false)
  useEffect(() => { if (response) { setAnswers(response.answers); setEditing(false) } }, [response])
  const quiz = form.kind === 'quiz'
  const set = (id: string, value: TrainingAnswer) => setAnswers((a) => ({ ...a, [id]: value }))

  if (response && !editing) return <div className="rounded-xl border border-green-mid/20 bg-green-50/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-green-deep">{quiz ? (response.passed === false ? 'Not passed yet' : 'Quiz passed') : 'Response submitted'}{response.score !== null && <span className="ml-2 font-normal text-text-mid">Score {response.score}%{quiz && ` · pass mark ${form.passPercent}%`}</span>}</p><p className="text-xs text-text-mid">Submitted {new Date(response.submitted_at).toLocaleString()}</p></div>
      <button type="button" onClick={() => { setEditing(true); if (quiz) setAnswers({}) }} className="rounded-full border bg-white px-4 py-2 text-xs font-bold text-green-deep">{quiz ? 'Retake quiz' : 'Edit response'}</button></div>
    {!quiz && <dl className="mt-3 space-y-2 text-sm">{form.questions.filter((q) => response.answers[q.id] !== undefined).map((q) => <div key={q.id}><dt className="font-bold text-green-deep">{q.label}</dt><dd className="whitespace-pre-wrap text-text-mid">{formatAnswer(response.answers[q.id])}</dd></div>)}</dl>}
  </div>

  // The preview sits inside the program editor's <form>, so it must not be a form or carry required fields itself.
  const Wrapper = preview ? 'div' : 'form'
  return <Wrapper onSubmit={async (e: React.FormEvent) => { e.preventDefault(); if (!onSubmit) return; setSaving(true); await onSubmit(answers); setSaving(false) }} className="space-y-4">
    {(form.title || form.description) && <div>{form.title && <h6 className="font-bold text-green-deep">{form.title}</h6>}{form.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{form.description}</p>}</div>}
    {form.questions.map((q, index) => <fieldset key={q.id} className="rounded-xl border bg-white p-4"><legend className="sr-only">{q.label}</legend><p className="text-sm font-bold text-green-deep">{index + 1}. {q.label}{q.required && <span className="text-red-600"> *</span>}</p>{q.help && <p className="mt-0.5 text-xs text-text-mid">{q.help}</p>}<div className="mt-3"><QuestionInput question={preview ? { ...q, required: false } : q} value={answers[q.id]} onChange={(v) => set(q.id, v)} /></div></fieldset>)}
    <div className="flex items-center justify-end gap-3">{response && <button type="button" onClick={() => { setAnswers(response.answers); setEditing(false) }} className="rounded-full border px-4 py-2 text-xs font-bold">Cancel</button>}<button type={preview ? 'button' : 'submit'} disabled={preview || saving} className="rounded-full bg-green-deep px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{preview ? 'Submit (preview)' : saving ? 'Submitting…' : quiz ? 'Submit quiz' : 'Submit'}</button></div>
  </Wrapper>
}

function QuestionInput({ question, value, onChange }: { question: TrainingQuestion; value: TrainingAnswer | undefined; onChange: (value: TrainingAnswer) => void }) {
  const options = questionOptions(question); const name = `q-${question.id}`
  if (question.type === 'short_text') return <input required={question.required} maxLength={1000} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0" />
  if (question.type === 'long_text') return <textarea required={question.required} rows={4} maxLength={10000} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0" />
  if (question.type === 'dropdown') return <select required={question.required} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0"><option value="">Choose…</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
  if (question.type === 'rating') return <div className="flex flex-wrap gap-2">{Array.from({ length: question.scaleMax }, (_, i) => i + 1).map((n) => <label key={n} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm font-bold ${value === n ? 'border-green-deep bg-green-deep text-white' : 'text-green-deep'}`}><input type="radio" name={name} required={question.required} checked={value === n} onChange={() => onChange(n)} className="sr-only" />{n}</label>)}</div>
  if (question.type === 'multi_choice') { const picked = Array.isArray(value) ? value : []; return <div className="space-y-2">{options.map((o) => <label key={o} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(o)} onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((p) => p !== o))} className="h-4 w-4 accent-green-deep" />{o}</label>)}</div> }
  return <div className="space-y-2">{options.map((o) => <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={name} required={question.required} checked={value === o} onChange={() => onChange(o)} className="h-4 w-4 accent-green-deep" />{o}</label>)}</div>
}

// ---------- Responses (admin) ----------

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
    const header = ['Respondent', 'Submitted', ...(form.kind === 'quiz' ? ['Score %', 'Passed'] : []), ...form.questions.map((q) => q.label)]
    const body = rows.map((r) => [r.respondent, new Date(r.submitted_at).toISOString(), ...(form.kind === 'quiz' ? [r.score ?? '', r.passed === null ? '' : r.passed ? 'Yes' : 'No'] : []), ...form.questions.map((q) => formatAnswer(r.answers[q.id]))])
    const url = URL.createObjectURL(new Blob([[header, ...body].map((line) => line.map(cell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `${program.title}-${lesson!.title}-responses.csv`.replace(/[^\w.-]+/g, '-'); a.click(); URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
    <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Form responses</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{program.title}</h3></div><button onClick={onClose} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div>
    {!lessons.length ? <p className="py-16 text-center text-text-mid">No lessons in this program have a form yet. Add one from the program editor.</p> : <>
      <div className="mt-5 flex flex-wrap items-center gap-3"><select aria-label="Lesson form" value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="input mt-0 w-auto flex-1">{lessons.map((l) => <option key={l.id} value={l.id}>{l.module} — {l.title} ({l.form!.kind})</option>)}</select><button type="button" disabled={!rows.length} onClick={exportCsv} className="rounded-full border px-4 py-2.5 text-xs font-bold text-green-deep disabled:opacity-40">Export CSV</button></div>
      {error ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : !responses ? <p className="py-16 text-center text-text-mid">Loading responses…</p> : form && <ResponseSummary form={form} rows={rows} />}
    </>}
  </div></div>
}

function ResponseSummary({ form, rows }: { form: TrainingForm; rows: TrainingFormResponse[] }) {
  const quiz = form.kind === 'quiz'; const scored = rows.filter((r) => r.score !== null)
  if (!rows.length) return <p className="py-16 text-center text-text-mid">No responses yet.</p>
  return <div className="mt-5 space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Tile label="Responses" value={rows.length} />{quiz && <><Tile label="Average score" value={scored.length ? `${Math.round(scored.reduce((n, r) => n + (r.score || 0), 0) / scored.length)}%` : '—'} /><Tile label="Passed" value={`${rows.filter((r) => r.passed).length} / ${rows.length}`} /></>}</div>
    {form.questions.map((q, index) => { const given = rows.map((r) => r.answers[q.id]).filter((a) => a !== undefined); const options = questionOptions(q)
      return <section key={q.id} className="rounded-xl border p-4"><p className="text-sm font-bold text-green-deep">{index + 1}. {q.label}</p><p className="text-xs text-text-mid">{given.length} answer(s)</p>
        {q.type === 'rating' ? <RatingSummary question={q} answers={given as number[]} />
          : options.length ? <div className="mt-3 space-y-2">{options.map((o) => { const count = given.filter((a) => Array.isArray(a) ? a.includes(o) : a === o).length; const pct = given.length ? Math.round(count / given.length * 100) : 0
            return <div key={o} className="text-sm"><div className="flex justify-between gap-3"><span className="text-text-dark">{o}{quiz && q.correct.includes(o) && <span className="ml-2 text-[10px] font-bold uppercase text-green-700">✓ correct</span>}</span><span className="text-text-mid">{count} · {pct}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-mid" style={{ width: `${pct}%` }} /></div></div> })}</div>
          : <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">{rows.filter((r) => r.answers[q.id] !== undefined).map((r) => <li key={r.user_id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><span className="whitespace-pre-wrap text-text-dark">{formatAnswer(r.answers[q.id])}</span><span className="mt-1 block text-xs text-gray-400">{r.respondent}</span></li>)}</ul>}
      </section> })}
    <section className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Respondent</th><th className="px-4 py-2">Submitted</th>{quiz && <th className="px-4 py-2">Score</th>}</tr></thead>
      <tbody className="divide-y">{rows.map((r) => <tr key={r.user_id}><td className="px-4 py-2 font-bold text-green-deep">{r.respondent}</td><td className="px-4 py-2 text-text-mid">{new Date(r.submitted_at).toLocaleString()}</td>{quiz && <td className="px-4 py-2">{r.score ?? '—'}{r.score !== null && '%'} {r.passed !== null && <span className={`ml-1 text-xs font-bold ${r.passed ? 'text-green-700' : 'text-red-600'}`}>{r.passed ? 'Passed' : 'Not passed'}</span>}</td>}</tr>)}</tbody></table></section>
  </div>
}

function RatingSummary({ question, answers }: { question: TrainingQuestion; answers: number[] }) {
  const average = answers.length ? (answers.reduce((n, a) => n + a, 0) / answers.length).toFixed(1) : '—'
  const max = Math.max(1, ...Array.from({ length: question.scaleMax }, (_, i) => answers.filter((a) => a === i + 1).length))
  return <div className="mt-3"><p className="text-2xl font-bold text-green-deep">{average}<span className="text-sm font-normal text-text-mid"> / {question.scaleMax} average</span></p>
    <div className="mt-3 flex h-20 items-end gap-1.5">{Array.from({ length: question.scaleMax }, (_, i) => { const count = answers.filter((a) => a === i + 1).length; return <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-green-mid" style={{ height: `${count / max * 56}px` }} title={`${count} response(s)`} /><span className="text-[10px] text-gray-500">{i + 1}</span></div> })}</div></div>
}

function Tile({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border bg-[#fbfaf6] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-green-mid">{label}</p><p className="mt-1 text-2xl font-bold text-green-deep">{value}</p></div> }
