'use client'

// Building, filling in and summarising survey and quiz forms. Used by training
// lessons and by standalone forms for customers, staff and patients.
import { useEffect, useRef, useState } from 'react'
import { PlayfulSection, StepTracker, sectionIconOptions } from '@/components/forms/FormFun'
import { choiceTypes, formPages, gradeFormResponse, isGradable, isOtherAnswer, optionListTypes, otherPrefix, questionNumbers, questionOptions, questionTypes, type FormAnswer, type FormAnswers, type FormDefinition, type FormQuestion, type FormQuestionType, type FormResponseView, type PatientField, type SectionIcon, formatAnswerText, patientFieldLabels, patientFieldTypes } from '@/lib/forms'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const newQuestion = (type: FormQuestionType = 'single_choice'): FormQuestion => ({ id: makeId('question'), type, label: '', help: '', required: true, options: choiceTypes.includes(type) ? ['Option 1', 'Option 2'] : [], correct: [], scaleMax: 5 })
export const newForm = (): FormDefinition => ({ kind: 'survey', title: '', description: '', passPercent: 70, questions: [newQuestion()] })
const gridAnswer = (answer: FormAnswer | undefined) => (answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, string>
export const formatAnswer = formatAnswerText

// Spreadsheet columns for a form's answers: one per question, one per row of a
// rating grid, and one rank per ranked item, so each can be sorted and averaged.
export function answerColumns(questions: FormQuestion[]) {
  return questions.flatMap((q): { header: string; value: (answers: FormAnswers) => string | number }[] => {
    if (q.type === 'section') return []
    if (q.type === 'matrix') return (q.rows || []).map((row) => ({ header: `${q.label} [${row}]`, value: (a) => gridAnswer(a[q.id])[row] || '' }))
    if (q.type === 'ranking') return q.options.map((item) => ({ header: `${q.label} [rank: ${item}]`, value: (a) => { const at = Array.isArray(a[q.id]) ? (a[q.id] as string[]).indexOf(item) : -1; return at >= 0 ? at + 1 : '' } }))
    return [{ header: q.label, value: (a) => formatAnswer(a[q.id], q) }]
  })
}

// ---------- Builder (admin) ----------

// `showDetails` adds the form's own title and instructions; standalone forms keep those on the form record instead.
// `patientMapping` lets an outreach form say which answers fill in the EMR patient record.
export function FormBuilder({ form, onChange, onRemove, heading = 'Lesson form', showDetails = true, passNote = '', patientMapping = false }: { form: FormDefinition; onChange: (form: FormDefinition) => void; onRemove?: () => void; heading?: string; showDetails?: boolean; passNote?: string; patientMapping?: boolean }) {
  const [preview, setPreview] = useState(false)
  const quiz = form.kind === 'quiz'
  const gradable = form.questions.filter(isGradable).length
  const numbers = questionNumbers(form.questions)
  const setQuestion = (index: number, question: FormQuestion) => onChange({ ...form, questions: form.questions.map((q, i) => i === index ? question : q) })
  const move = (index: number, by: number) => { const questions = [...form.questions]; const [q] = questions.splice(index, 1); questions.splice(index + by, 0, q); onChange({ ...form, questions }) }
  return <div className="mt-3 rounded-xl border border-green-mid/25 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{heading}</p><div className="flex rounded-full bg-gray-100 p-0.5 text-xs font-bold">{(['survey', 'quiz'] as const).map((kind) => <button key={kind} type="button" onClick={() => onChange({ ...form, kind })} className={`rounded-full px-3 py-1 capitalize ${form.kind === kind ? 'bg-green-deep text-white' : 'text-green-deep'}`}>{kind}</button>)}</div></div>
      <div className="flex gap-2"><button type="button" onClick={() => setPreview(!preview)} className="rounded-full border px-3 py-1 text-xs font-bold text-green-deep">{preview ? 'Back to editing' : 'Preview'}</button>{onRemove && <button type="button" onClick={() => { if (confirm('Remove this form from the lesson?')) onRemove() }} className="rounded-full px-3 py-1 text-xs font-bold text-red-600">Remove form</button>}</div></div>
    {preview ? <div className="mt-4 rounded-xl bg-[#fbfaf6] p-4"><FormFill form={form} preview /></div> : <>
      {(showDetails || quiz) && <div className={`mt-3 grid gap-3 ${showDetails ? 'sm:grid-cols-[1fr_140px]' : 'sm:grid-cols-[140px]'}`}>{showDetails && <input value={form.title} maxLength={160} onChange={(e) => onChange({ ...form, title: e.target.value })} placeholder={quiz ? 'Quiz title (optional)' : 'Survey title (optional)'} className="input" />}{quiz && <label className="text-xs font-bold text-green-deep">Pass mark %<input type="number" min="0" max="100" value={form.passPercent} onChange={(e) => onChange({ ...form, passPercent: Number(e.target.value) })} className="input mt-1" /></label>}</div>}
      {showDetails && <textarea rows={2} maxLength={3000} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Instructions (optional)" className="input mt-3" />}
      {quiz && <p className="mt-2 text-xs text-text-mid">{gradable ? `${gradable} graded question(s). Pass mark ${form.passPercent}%${passNote ? `; ${passNote}` : ''}.` : 'Mark the correct answers on choice questions to grade this quiz.'}</p>}
      {form.questions.some((q) => q.type === 'section') && <label className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-green-deep"><input type="checkbox" checked={!!form.paged} onChange={(e) => onChange({ ...form, paged: e.target.checked })} className="accent-green-deep" />Show one section per page<span className="font-normal text-text-mid">respondents move between sections with Back and Next</span></label>}
      <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-green-deep"><input type="checkbox" checked={!!form.playful} onChange={(e) => onChange({ ...form, playful: e.target.checked })} className="accent-green-deep" />Playful style<span className="font-normal text-text-mid">section icons, animations and a celebration when the form is sent</span></label>
      <div className="mt-4 space-y-3">{form.questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} number={numbers.get(question.id)} quiz={quiz} patientMapping={patientMapping} total={form.questions.length} onChange={(q) => setQuestion(index, q)} onMove={(by) => move(index, by)}
        onDuplicate={() => onChange({ ...form, questions: [...form.questions.slice(0, index + 1), { ...question, id: makeId('question') }, ...form.questions.slice(index + 1)] })}
        onDelete={() => onChange({ ...form, questions: form.questions.filter((_, i) => i !== index) })} />)}</div>
      <div className="mt-3 flex gap-4"><button type="button" onClick={() => onChange({ ...form, questions: [...form.questions, newQuestion()] })} className="text-xs font-bold text-green-mid">+ Add question</button><button type="button" onClick={() => onChange({ ...form, questions: [...form.questions, { ...newQuestion('section'), required: false }] })} className="text-xs font-bold text-green-mid">+ Add section heading</button></div>
    </>}
  </div>
}

function QuestionEditor({ question, index, number, total, quiz, patientMapping, onChange, onMove, onDuplicate, onDelete }: { question: FormQuestion; index: number; number?: number; total: number; quiz: boolean; patientMapping: boolean; onChange: (q: FormQuestion) => void; onMove: (by: number) => void; onDuplicate: () => void; onDelete: () => void }) {
  const options = questionOptions(question); const multi = question.type === 'multi_choice'; const section = question.type === 'section'
  const rows = question.rows || []; const choices = question.options.length + (question.allowOther ? 1 : 0)
  const changeType = (type: FormQuestionType) => onChange({
    ...question, type, correct: [], required: type === 'section' ? false : question.required,
    options: optionListTypes.includes(type) ? (question.options.length >= 2 ? question.options : ['Option 1', 'Option 2']) : [],
    rows: type === 'matrix' ? (rows.length ? rows : ['Row 1', 'Row 2']) : undefined,
    maxChoices: type === 'multi_choice' ? question.maxChoices : undefined,
    allowOther: type === 'single_choice' || type === 'multi_choice' ? question.allowOther : undefined,
  })
  const renameOption = (i: number, value: string) => onChange({ ...question, options: question.options.map((o, j) => j === i ? value : o), correct: question.correct.map((c) => c === question.options[i] ? value : c) })
  const toggleCorrect = (option: string) => onChange({ ...question, correct: question.correct.includes(option) ? question.correct.filter((c) => c !== option) : multi ? [...question.correct, option] : [option] })
  const listName = question.type === 'matrix' ? 'column' : question.type === 'ranking' ? 'item' : 'option'
  return <div className={`rounded-xl p-4 ${section ? 'border-l-4 border-green-deep bg-green-50/50' : 'bg-gray-50'}`}>
    <div className="flex flex-wrap gap-2"><span className="pt-3 text-xs font-bold text-gray-400">{section ? '§' : `Q${number}`}</span><input required value={question.label} maxLength={500} onChange={(e) => onChange({ ...question, label: e.target.value })} placeholder={section ? 'Section title' : 'Question'} className="input mt-0 min-w-[200px] flex-1" />
      <select aria-label="Question type" value={question.type} onChange={(e) => changeType(e.target.value as FormQuestionType)} className="input mt-0 w-auto">{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
    <input value={question.help} maxLength={1000} onChange={(e) => onChange({ ...question, help: e.target.value })} placeholder={section ? 'Introduction (optional)' : 'Help text (optional)'} className="input mt-2 py-2 text-xs" />
    {patientMapping && !section && (Object.keys(patientFieldTypes) as PatientField[]).some((field) => patientFieldTypes[field].includes(question.type)) && <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-green-deep">Save to patient record as<select value={question.patientField || ''} onChange={(e) => onChange({ ...question, patientField: (e.target.value || undefined) as PatientField | undefined })} className="input mt-0 w-auto py-1.5"><option value="">Nothing</option>{(Object.keys(patientFieldTypes) as PatientField[]).filter((field) => patientFieldTypes[field].includes(question.type)).map((field) => <option key={field} value={field}>{patientFieldLabels[field]}</option>)}</select><span className="font-normal text-text-mid">used when staff book a follow-up</span></label>}
    {section && <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-green-deep">Icon<select value={question.icon || ''} onChange={(e) => onChange({ ...question, icon: (e.target.value || undefined) as SectionIcon | undefined })} className="input mt-0 w-auto py-1.5"><option value="">Automatic</option>{sectionIconOptions.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select><span className="font-normal text-text-mid">shown with the playful style</span></label>}
    {optionListTypes.includes(question.type) && <div className="mt-3 space-y-2">
      {question.type === 'matrix' && <p className="text-xs font-bold text-green-deep">Columns (the rating scale)</p>}
      {question.type === 'ranking' && <p className="text-xs font-bold text-green-deep">Items to rank</p>}
      {question.options.map((option, i) => <div key={i} className="flex items-center gap-2">{question.type === 'ranking' ? <span className="w-4 shrink-0 text-xs font-bold text-gray-400">{i + 1}</span> : question.type !== 'matrix' && <span className={`h-4 w-4 shrink-0 border border-gray-300 ${multi ? 'rounded' : 'rounded-full'}`} />}<input required value={option} maxLength={200} onChange={(e) => renameOption(i, e.target.value)} className="input mt-0 py-2" />
        {quiz && choiceTypes.includes(question.type) && <CorrectToggle on={question.correct.includes(option)} onClick={() => toggleCorrect(option)} />}
        <button type="button" disabled={question.options.length <= 2} onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i), correct: question.correct.filter((c) => c !== option) })} className="px-2 text-red-600 disabled:opacity-30" aria-label={`Remove ${listName}`}>×</button></div>)}
      <button type="button" disabled={question.options.length >= 30} onClick={() => onChange({ ...question, options: [...question.options, `${listName[0].toUpperCase()}${listName.slice(1)} ${question.options.length + 1}`] })} className="text-xs font-bold text-green-mid">+ Add {listName}</button></div>}
    {question.type === 'matrix' && <div className="mt-4 space-y-2"><p className="text-xs font-bold text-green-deep">Rows (each one is rated)</p>
      {rows.map((row, i) => <div key={i} className="flex items-center gap-2"><input required value={row} maxLength={300} onChange={(e) => onChange({ ...question, rows: rows.map((r, j) => j === i ? e.target.value : r) })} className="input mt-0 py-2" />
        <button type="button" disabled={rows.length <= 1} onClick={() => onChange({ ...question, rows: rows.filter((_, j) => j !== i) })} className="px-2 text-red-600 disabled:opacity-30" aria-label="Remove row">×</button></div>)}
      <button type="button" disabled={rows.length >= 40} onClick={() => onChange({ ...question, rows: [...rows, `Row ${rows.length + 1}`] })} className="text-xs font-bold text-green-mid">+ Add row</button></div>}
    {(question.type === 'single_choice' || multi) && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-green-deep">
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!question.allowOther} onChange={(e) => onChange({ ...question, allowOther: e.target.checked })} className="accent-green-deep" />Add “Other (please specify)”</label>
      {multi && <label className="flex items-center gap-2">Limit choices<select value={question.maxChoices || 0} onChange={(e) => onChange({ ...question, maxChoices: Number(e.target.value) })} className="input mt-0 w-auto py-1.5"><option value={0}>No limit</option>{Array.from({ length: Math.max(0, choices - 1) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Up to {n}</option>)}</select></label>}</div>}
    {question.type === 'yes_no' && quiz && <div className="mt-3 flex gap-3">{options.map((option) => <span key={option} className="flex items-center gap-2 text-sm">{option}<CorrectToggle on={question.correct.includes(option)} onClick={() => toggleCorrect(option)} /></span>)}</div>}
    {question.type === 'rating' && <label className="mt-3 flex items-center gap-2 text-xs font-bold text-green-deep">Scale 1 to<select value={question.scaleMax} onChange={(e) => onChange({ ...question, scaleMax: Number(e.target.value) })} className="input mt-0 w-auto py-1.5"><option value={5}>5</option><option value={10}>10</option></select></label>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">{section ? <span className="text-xs text-text-mid">Groups the questions below it</span> : <label className="flex items-center gap-2 text-xs font-bold text-green-deep"><input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...question, required: e.target.checked })} className="accent-green-deep" />Required</label>}
      <div className="flex gap-1 text-xs font-bold text-green-deep"><button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-full px-2 py-1 disabled:opacity-30" aria-label="Move up">↑</button><button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-full px-2 py-1 disabled:opacity-30" aria-label="Move down">↓</button><button type="button" onClick={onDuplicate} className="rounded-full px-2 py-1">Duplicate</button><button type="button" onClick={onDelete} className="rounded-full px-2 py-1 text-red-600">Delete</button></div></div>
  </div>
}

function CorrectToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${on ? 'bg-green-deep text-white' : 'border text-gray-400'}`}>{on ? '✓ Correct' : 'Correct?'}</button>
}

// ---------- Filling in ----------

// `children` render above the questions inside the same <form>, e.g. a customer's contact fields.
export function FormFill({ form, response, preview, onSubmit, children }: { form: FormDefinition; response?: FormResponseView | null; preview?: boolean; onSubmit?: (answers: FormAnswers) => Promise<boolean>; children?: React.ReactNode }) {
  const [answers, setAnswers] = useState<FormAnswers>(response?.answers || {})
  const [editing, setEditing] = useState(!response); const [saving, setSaving] = useState(false)
  // A problem the browser's own validation can't catch, e.g. an unranked list; shown on that question.
  const [problem, setProblem] = useState<{ error: string; questionId?: string } | null>(null)
  // Paged forms show one section at a time; `top` is where each new page scrolls to.
  const [page, setPage] = useState(0); const top = useRef<HTMLDivElement>(null)
  useEffect(() => { if (response) { setAnswers(response.answers); setEditing(false) } }, [response])
  const quiz = form.kind === 'quiz'
  const numbers = questionNumbers(form.questions)
  const pages = form.paged ? formPages(form.questions) : [form.questions]
  const paged = pages.length > 1; const at = Math.min(page, pages.length - 1); const last = at === pages.length - 1
  const set = (id: string, value: FormAnswer) => { setAnswers((a) => ({ ...a, [id]: value })); setProblem((p) => p?.questionId === id ? null : p) }

  if (response && !editing) return <div className="rounded-xl border border-green-mid/20 bg-green-50/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-green-deep">{quiz ? (response.passed === false ? 'Not passed yet' : 'Quiz passed') : 'Response submitted'}{response.score !== null && <span className="ml-2 font-normal text-text-mid">Score {response.score}%{quiz && ` · pass mark ${form.passPercent}%`}</span>}</p><p className="text-xs text-text-mid">Submitted {new Date(response.submitted_at).toLocaleString()}</p></div>
      <button type="button" onClick={() => { setEditing(true); setPage(0); if (quiz) setAnswers({}) }} className="rounded-full border bg-white px-4 py-2 text-xs font-bold text-green-deep">{quiz ? 'Retake quiz' : 'Edit response'}</button></div>
    {!quiz && <dl className="mt-3 space-y-2 text-sm">{form.questions.filter((q) => response.answers[q.id] !== undefined).map((q) => <div key={q.id}><dt className="font-bold text-green-deep">{q.label}</dt><dd className="whitespace-pre-wrap text-text-mid">{formatAnswer(response.answers[q.id], q)}</dd></div>)}</dl>}
  </div>

  // Points to the question that needs attention, moving to its page first.
  function showProblem(found: { error: string; questionId?: string }) {
    setProblem(found); if (!found.questionId) return
    const onPage = pages.findIndex((p) => p.some((q) => q.id === found.questionId)); if (onPage >= 0) setPage(onPage)
    setTimeout(() => document.getElementById(`field-${found.questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }
  function goTo(next: number) {
    setPage(next); setProblem(null)
    setTimeout(() => { top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); top.current?.focus({ preventScroll: true }) }, 50)
  }
  // Checks only this page's questions before moving on; the browser checks its own required fields first.
  function next() {
    if (!preview) {
      if (top.current?.closest('form')?.reportValidity() === false) return
      const check = gradeFormResponse({ ...form, kind: 'survey', questions: pages[at] }, answers)
      if ('error' in check) return showProblem(check)
    }
    goTo(at + 1)
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (paged && !last) return next()
    if (!onSubmit) return
    const check = gradeFormResponse(form, answers)
    if ('error' in check) return showProblem(check)
    setProblem(null); setSaving(true); await onSubmit(answers); setSaving(false)
  }

  // The preview sits inside the program editor's <form>, so it must not be a form or carry required fields itself.
  const Wrapper = preview ? 'div' : 'form'
  const playful = !!form.playful; const sectionIndex = new Map(form.questions.filter((q) => q.type === 'section').map((q, i) => [q.id, i]))
  return <Wrapper onSubmit={submit} className={`space-y-4 ${playful ? 'form-playful' : ''}`}>
    <div ref={top} tabIndex={-1} className="scroll-mt-6 outline-none">{paged && playful ? <StepTracker pages={pages} at={at} /> : paged && <div><div className="flex justify-between text-xs font-bold text-green-mid"><span>Step {at + 1} of {pages.length}</span><span>{Math.round(at / pages.length * 100)}% complete</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-deep transition-all" style={{ width: `${(at + 1) / pages.length * 100}%` }} /></div></div>}</div>
    {at === 0 && (form.title || form.description) && <div>{form.title && <h6 className="font-bold text-green-deep">{form.title}</h6>}{form.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{form.description}</p>}</div>}
    {at === 0 && children}
    <div key={at} className="form-page space-y-4">{pages[at].map((q) => q.type === 'section'
      ? playful ? <PlayfulSection key={q.id} question={q} index={sectionIndex.get(q.id) || 0} /> : <div key={q.id} className="border-b border-green-deep/15 pb-2 pt-4"><h3 className="text-lg font-bold text-green-deep">{q.label}</h3>{q.help && <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{q.help}</p>}</div>
      : <fieldset key={q.id} id={`field-${q.id}`} className={`min-w-0 scroll-mt-24 rounded-xl border bg-white p-4 ${problem?.questionId === q.id ? 'border-red-300 ring-1 ring-red-200' : ''}`}><legend className="sr-only">{q.label}</legend><p className="text-sm font-bold text-green-deep">{numbers.get(q.id)}. {q.label}{q.required && <span className="text-red-600"> *</span>}</p>{q.help && <p className="mt-0.5 text-xs text-text-mid">{q.help}</p>}<div className="mt-3"><QuestionInput question={preview ? { ...q, required: false } : q} value={answers[q.id]} onChange={(v) => set(q.id, v)} /></div>
        {problem?.questionId === q.id && <p role="alert" className="mt-3 text-sm font-bold text-red-600">{problem.error}</p>}</fieldset>)}</div>
    {problem && !problem.questionId && <p role="alert" className="text-sm font-bold text-red-600">{problem.error}</p>}
    <div className="flex items-center justify-end gap-3">{paged && at > 0 && <button type="button" onClick={() => goTo(at - 1)} className="mr-auto rounded-full border px-5 py-2 text-xs font-bold text-green-deep">← Back</button>}{response && <button type="button" onClick={() => { setAnswers(response.answers); setEditing(false) }} className="rounded-full border px-4 py-2 text-xs font-bold">Cancel</button>}{paged && !last ? <button type="button" onClick={next} className="rounded-full bg-green-deep px-5 py-2 text-xs font-bold text-white">Next →</button> : <button type={preview ? 'button' : 'submit'} disabled={preview || saving} className="rounded-full bg-green-deep px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{preview ? 'Submit (preview)' : saving ? 'Submitting…' : quiz ? 'Submit quiz' : 'Submit'}</button>}</div>
  </Wrapper>
}

function QuestionInput({ question, value, onChange }: { question: FormQuestion; value: FormAnswer | undefined; onChange: (value: FormAnswer) => void }) {
  const options = questionOptions(question); const name = `q-${question.id}`
  if (question.type === 'short_text') return <input required={question.required} maxLength={1000} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0" />
  if (question.type === 'date') return <input type="date" required={question.required} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0 sm:max-w-xs" />
  if (question.type === 'long_text') return <textarea required={question.required} rows={4} maxLength={10000} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0" />
  if (question.type === 'dropdown') return <select required={question.required} value={formatAnswer(value)} onChange={(e) => onChange(e.target.value)} className="input mt-0"><option value="">Choose…</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
  if (question.type === 'rating') return <div className="flex flex-wrap gap-2">{Array.from({ length: question.scaleMax }, (_, i) => i + 1).map((n) => <label key={n} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm font-bold ${value === n ? 'border-green-deep bg-green-deep text-white' : 'text-green-deep'}`}><input type="radio" name={name} required={question.required} checked={value === n} onChange={() => onChange(n)} className="sr-only" />{n}</label>)}</div>
  // A table from `sm` up; on phones each row stacks, with every choice labelled, so no column is off-screen.
  if (question.type === 'matrix') { const rated = gridAnswer(value); const columns = { gridTemplateColumns: `minmax(0, 1fr) repeat(${question.options.length}, minmax(2.75rem, 4.25rem))` }
    return <div className="overflow-hidden rounded-lg border text-sm"><div aria-hidden="true" className="hidden bg-green-deep text-white sm:grid" style={columns}><span />{question.options.map((o) => <span key={o} className="px-1 py-2 text-center text-[11px] font-bold leading-tight">{o}</span>)}</div>
      {(question.rows || []).map((row, r) => <div key={row} role="radiogroup" aria-label={row} className="border-t p-3 first:border-t-0 even:bg-gray-50 sm:grid sm:items-center sm:p-0 sm:first:border-t" style={columns}><p className="leading-snug text-text-dark sm:p-2">{row}</p>
        <div className="mt-2 grid gap-1 sm:contents" style={{ gridTemplateColumns: `repeat(${question.options.length}, minmax(0, 1fr))` }}>{question.options.map((o) => <label key={o} className="flex cursor-pointer flex-col items-center gap-1 py-1 text-center sm:py-2"><input type="radio" name={`${name}-${r}`} required={question.required} checked={rated[row] === o} onChange={() => onChange({ ...rated, [row]: o })} aria-label={o} className="h-4 w-4 accent-green-deep" /><span aria-hidden="true" className="text-[10px] leading-tight text-text-mid sm:hidden">{o}</span></label>)}</div></div>)}</div> }
  if (question.type === 'ranking') { const ranked = Array.isArray(value) ? value : []
    return <div><div className="space-y-2">{question.options.map((o) => { const at = ranked.indexOf(o)
      return <button key={o} type="button" aria-pressed={at >= 0} onClick={() => onChange(at >= 0 ? ranked.filter((r) => r !== o) : [...ranked, o])} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${at >= 0 ? 'border-green-deep bg-green-50/70' : 'bg-white hover:border-green-mid'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${at >= 0 ? 'bg-green-deep text-white' : 'border border-dashed border-gray-300'}`}>{at >= 0 ? at + 1 : ''}</span>{o}</button> })}</div>
      <div className="mt-2 flex justify-between gap-3 text-xs text-text-mid"><span>{ranked.length === question.options.length ? 'All ranked' : `${ranked.length} of ${question.options.length} ranked · tap in order, starting with the highest priority`}</span>{ranked.length > 0 && <button type="button" onClick={() => onChange([])} className="shrink-0 font-bold text-green-mid">Reset order</button>}</div></div> }
  if (question.type === 'multi_choice') { const picked = Array.isArray(value) ? value : []; const other = picked.find(isOtherAnswer); const full = !!question.maxChoices && picked.length >= question.maxChoices
    return <div className="space-y-2">{options.map((o) => { const off = full && !picked.includes(o)
      return <label key={o} className={`form-choice flex items-center gap-2 text-sm ${off ? 'opacity-50' : ''}`}><input type="checkbox" checked={picked.includes(o)} disabled={off} onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((p) => p !== o))} className="h-4 w-4 accent-green-deep" />{o}</label> })}
      {question.allowOther && <OtherChoice kind="checkbox" name={name} checked={other !== undefined} disabled={full && other === undefined} text={other?.slice(otherPrefix.length) ?? ''}
        onCheck={(on) => onChange(on ? [...picked, otherPrefix] : picked.filter((p) => !isOtherAnswer(p)))} onText={(text) => onChange([...picked.filter((p) => !isOtherAnswer(p)), otherPrefix + text])} />}
      {question.maxChoices ? <p className="text-xs text-text-mid">{picked.length} of {question.maxChoices} chosen</p> : null}</div> }
  const other = typeof value === 'string' && isOtherAnswer(value)
  return <div className="space-y-2">{options.map((o) => <label key={o} className="form-choice flex items-center gap-2 text-sm"><input type="radio" name={name} required={question.required} checked={value === o} onChange={() => onChange(o)} className="h-4 w-4 accent-green-deep" />{o}</label>)}
    {question.allowOther && <OtherChoice kind="radio" name={name} required={question.required} checked={other} text={other ? (value as string).slice(otherPrefix.length) : ''} onCheck={() => onChange(otherPrefix)} onText={(text) => onChange(otherPrefix + text)} />}</div>
}

function OtherChoice({ kind, name, checked, disabled, required, text, onCheck, onText }: { kind: 'radio' | 'checkbox'; name: string; checked: boolean; disabled?: boolean; required?: boolean; text: string; onCheck: (on: boolean) => void; onText: (text: string) => void }) {
  return <div className={`text-sm ${disabled ? 'opacity-50' : ''}`}><label className="form-choice flex items-center gap-2"><input type={kind} name={name} required={required} checked={checked} disabled={disabled} onChange={(e) => onCheck(e.target.checked)} className="h-4 w-4 accent-green-deep" />Other (please specify)</label>
    {checked && <input required value={text} maxLength={300} onChange={(e) => onText(e.target.value)} placeholder="Please specify" aria-label="Other, please specify" className="input ml-6 mt-1.5 w-[calc(100%-1.5rem)] py-2" />}</div>
}

export function ResponseSummary({ form, rows }: { form: FormDefinition; rows: FormResponseView[] }) {
  const quiz = form.kind === 'quiz'; const scored = rows.filter((r) => r.score !== null); const numbers = questionNumbers(form.questions)
  if (!rows.length) return <p className="py-16 text-center text-text-mid">No responses yet.</p>
  return <div className="mt-5 space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><Tile label="Responses" value={rows.length} />{quiz && <><Tile label="Average score" value={scored.length ? `${Math.round(scored.reduce((n, r) => n + (r.score || 0), 0) / scored.length)}%` : '—'} /><Tile label="Passed" value={`${rows.filter((r) => r.passed).length} / ${rows.length}`} /></>}</div>
    {form.questions.map((q) => { if (q.type === 'section') return <h4 key={q.id} className="pt-2 text-lg font-bold text-green-deep">{q.label}</h4>
      const given = rows.map((r) => r.answers[q.id]).filter((a) => a !== undefined); const options = questionOptions(q)
      const others = q.allowOther ? given.flatMap((a) => (Array.isArray(a) ? a : [a]).filter((v): v is string => typeof v === 'string' && isOtherAnswer(v)).map((v) => v.slice(otherPrefix.length))) : []
      return <section key={q.id} className="rounded-xl border p-4"><p className="text-sm font-bold text-green-deep">{numbers.get(q.id)}. {q.label}</p><p className="text-xs text-text-mid">{given.length} answer(s)</p>
        {q.type === 'rating' ? <RatingSummary question={q} answers={given as number[]} />
          : q.type === 'matrix' ? <MatrixSummary question={q} answers={given.map(gridAnswer)} />
          : q.type === 'ranking' ? <RankingSummary question={q} answers={given.filter(Array.isArray) as string[][]} />
          : options.length ? <div className="mt-3 space-y-2">{[...options, ...(q.allowOther ? ['Other'] : [])].map((o, i) => { const isOther = i >= options.length
            const count = given.filter((a) => (Array.isArray(a) ? a : [a]).some((v) => isOther ? typeof v === 'string' && isOtherAnswer(v) : v === o)).length; const pct = given.length ? Math.round(count / given.length * 100) : 0
            return <div key={o} className="text-sm"><div className="flex justify-between gap-3"><span className="text-text-dark">{o}{quiz && q.correct.includes(o) && <span className="ml-2 text-[10px] font-bold uppercase text-green-700">✓ correct</span>}</span><span className="text-text-mid">{count} · {pct}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-mid" style={{ width: `${pct}%` }} /></div></div> })}
            {others.length > 0 && <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-text-mid">{others.map((text, i) => <li key={i}>“{text}”</li>)}</ul>}</div>
          : <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">{rows.filter((r) => r.answers[q.id] !== undefined).map((r, i) => <li key={r.key || i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><span className="whitespace-pre-wrap text-text-dark">{formatAnswer(r.answers[q.id], q)}</span><span className="mt-1 block text-xs text-gray-400">{r.respondent}</span></li>)}</ul>}
      </section> })}
    <section className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Respondent</th><th className="px-4 py-2">Submitted</th>{quiz && <th className="px-4 py-2">Score</th>}</tr></thead>
      <tbody className="divide-y">{rows.map((r, i) => <tr key={r.key || i}><td className="px-4 py-2 font-bold text-green-deep">{r.respondent}</td><td className="px-4 py-2 text-text-mid">{new Date(r.submitted_at).toLocaleString()}</td>{quiz && <td className="px-4 py-2">{r.score ?? '—'}{r.score !== null && '%'} {r.passed !== null && <span className={`ml-1 text-xs font-bold ${r.passed ? 'text-green-700' : 'text-red-600'}`}>{r.passed ? 'Passed' : 'Not passed'}</span>}</td>}</tr>)}</tbody></table></section>
  </div>
}

function RatingSummary({ question, answers }: { question: FormQuestion; answers: number[] }) {
  const average = answers.length ? (answers.reduce((n, a) => n + a, 0) / answers.length).toFixed(1) : '—'
  const max = Math.max(1, ...Array.from({ length: question.scaleMax }, (_, i) => answers.filter((a) => a === i + 1).length))
  return <div className="mt-3"><p className="text-2xl font-bold text-green-deep">{average}<span className="text-sm font-normal text-text-mid"> / {question.scaleMax} average</span></p>
    <div className="mt-3 flex h-20 items-end gap-1.5">{Array.from({ length: question.scaleMax }, (_, i) => { const count = answers.filter((a) => a === i + 1).length; return <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-green-mid" style={{ height: `${count / max * 56}px` }} title={`${count} response(s)`} /><span className="text-[10px] text-gray-500">{i + 1}</span></div> })}</div></div>
}

// How many people chose each column for each row; the darker the cell, the more common the answer.
function MatrixSummary({ question, answers }: { question: FormQuestion; answers: Record<string, string>[] }) {
  return <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[11px] text-gray-500"><th className="p-2" />{question.options.map((o) => <th key={o} className="px-1.5 py-2 text-center font-bold">{o}</th>)}</tr></thead>
    <tbody>{(question.rows || []).map((row) => { const total = answers.filter((a) => a[row]).length
      return <tr key={row} className="border-t"><th scope="row" className="p-2 text-left font-normal text-text-dark">{row}</th>{question.options.map((o) => { const count = answers.filter((a) => a[row] === o).length; const share = total ? count / total : 0
        return <td key={o} className="p-1 text-center"><span className="block rounded px-1 py-1.5 text-xs font-bold" style={{ background: `rgba(26, 61, 46, ${share * 0.85})`, color: share > 0.45 ? '#fff' : '#1a3d2e' }}>{count || '·'}</span></td> })}</tr> })}</tbody></table></div>
}

// Items in order of their average rank; 1 is the highest priority.
function RankingSummary({ question, answers }: { question: FormQuestion; answers: string[][] }) {
  const n = question.options.length
  const items = question.options.map((item) => { const ranks = answers.map((a) => a.indexOf(item)).filter((i) => i >= 0).map((i) => i + 1)
    return { item, average: ranks.length ? ranks.reduce((s, r) => s + r, 0) / ranks.length : null, first: ranks.filter((r) => r === 1).length } })
    .sort((a, b) => (a.average ?? Infinity) - (b.average ?? Infinity))
  return <ol className="mt-3 space-y-2">{items.map(({ item, average, first }, i) => <li key={item} className="text-sm"><div className="flex justify-between gap-3"><span className="text-text-dark"><span className="mr-2 font-bold text-green-deep">{i + 1}.</span>{item}</span><span className="shrink-0 text-text-mid">{average === null ? '—' : `average rank ${average.toFixed(1)}`} · ranked first {first}×</span></div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-mid" style={{ width: `${average === null ? 0 : (n - average + 1) / n * 100}%` }} /></div></li>)}</ol>
}

function Tile({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border bg-[#fbfaf6] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-green-mid">{label}</p><p className="mt-1 text-2xl font-bold text-green-deep">{value}</p></div> }
