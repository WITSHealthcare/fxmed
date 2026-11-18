'use client'

import { useMemo, useState } from 'react'
import { FormFill } from '@/components/forms/FormKit'
import { formatMinutes, hasForm, isLessonUnlocked, isOverdue, programLessons, videoEmbedUrl, type TrainingAnswer, type TrainingProgram } from '@/lib/training'

type Props = {
  program: TrainingProgram
  onTick: (lessonId: string, completed: boolean) => Promise<void>
  onSubmit: (lessonId: string, answers: Record<string, TrainingAnswer>) => Promise<boolean>
  onBack?: () => void
  backLabel?: string
}

const dateFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })

// One course, one lesson at a time: outline on the side (locked lessons in a
// sequential course), the lesson itself, its quiz, and previous/next.
export default function CoursePlayer({ program, onTick, onSubmit, onBack, backLabel = 'All courses' }: Props) {
  const lessons = useMemo(() => programLessons(program), [program])
  const completed = program.completed_lesson_ids || []
  const firstOpen = lessons.find((lesson) => !completed.includes(lesson.id))?.id || lessons[0]?.id
  const [currentId, setCurrentId] = useState(firstOpen)
  const [busy, setBusy] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.id === currentId))
  const lesson = lessons[index]
  const unlocked = (id: string) => isLessonUnlocked(program, completed, id)
  const done = lesson ? completed.includes(lesson.id) : false
  const attempts = program.attempts?.find((item) => item.lesson_id === lesson?.id)
  const embed = lesson?.resourceUrl ? videoEmbedUrl(lesson.resourceUrl) : null
  const enrolment = program.enrolment
  const finished = program.progress_percent === 100
  const go = (to: number) => { const next = lessons[to]; if (next && unlocked(next.id)) { setCurrentId(next.id); setOutlineOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) } }

  async function tick(value: boolean) { if (!lesson) return; setBusy(true); await onTick(lesson.id, value); setBusy(false) }

  return <div className="space-y-5">
    <div className="rounded-[20px] border border-green-deep/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {onBack && <button type="button" onClick={onBack} className="text-xs font-bold text-green-mid hover:underline">← {backLabel}</button>}
          <h2 className="mt-1 text-2xl font-bold text-green-deep">{program.title}</h2>
          <p className="mt-1 text-xs text-text-mid">
            {completed.length} of {lessons.length} lessons complete
            {enrolment?.due_at && <> · <span className={isOverdue(enrolment) ? 'font-bold text-red-600' : ''}>{isOverdue(enrolment) ? 'Overdue — was due' : 'Due'} {dateFormat.format(new Date(enrolment.due_at))}</span></>}
          </p>
        </div>
        {finished && enrolment?.certificate_id && <a href={`/api/training/certificates/${enrolment.certificate_id}`} className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-green-deep">Download certificate</a>}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${program.progress_percent || 0}%` }} /></div>
      {finished && <p role="status" className="mt-3 text-sm font-bold text-green-mid">Course complete{enrolment?.completed_at ? ` on ${dateFormat.format(new Date(enrolment.completed_at))}` : ''}. Well done!</p>}
    </div>

    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <nav aria-label="Course outline" className="rounded-[20px] border border-green-deep/10 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <button type="button" onClick={() => setOutlineOpen((open) => !open)} className="flex w-full items-center justify-between text-sm font-bold text-green-deep lg:pointer-events-none">Course outline <span className="lg:hidden">{outlineOpen ? '−' : '+'}</span></button>
        <div className={`${outlineOpen ? 'block' : 'hidden'} mt-3 max-h-[70vh] space-y-4 overflow-y-auto lg:block`}>
          {program.modules.map((module, moduleIndex) => <div key={module.id}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-green-mid">Module {moduleIndex + 1}</p>
            <p className="text-sm font-bold text-green-deep">{module.title}</p>
            <ul className="mt-2 space-y-1">{module.lessons.map((item) => {
              const isDone = completed.includes(item.id); const open = unlocked(item.id); const active = item.id === lesson?.id
              return <li key={item.id}><button type="button" disabled={!open} onClick={() => go(lessons.findIndex((l) => l.id === item.id))} aria-current={active ? 'step' : undefined}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${active ? 'bg-green-50 font-bold text-green-deep' : 'text-text-mid hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50`}>
                <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${isDone ? 'bg-green-mid text-white' : 'border border-gray-300'}`}>{isDone ? '✓' : open ? '' : '🔒'}</span>
                <span className="min-w-0 flex-1">{item.title}<span className="sr-only">{isDone ? ' (complete)' : open ? '' : ' (locked)'}</span></span>
              </button></li>
            })}</ul>
          </div>)}
        </div>
      </nav>

      {lesson ? <article className="min-w-0 rounded-[20px] border border-green-deep/10 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-green-mid">Lesson {index + 1} of {lessons.length}{lesson.durationMinutes ? ` · ${formatMinutes(lesson.durationMinutes)}` : ''}</p>
        <h3 className="mt-1 text-2xl font-bold text-green-deep">{lesson.title}</h3>
        {embed && <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-black"><iframe src={embed} title={lesson.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" /></div>}
        {lesson.content && <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-text-dark">{lesson.content}</div>}
        {lesson.resourceUrl && !embed && <a href={lesson.resourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-full border px-4 py-2 text-sm font-bold text-green-mid">Open lesson resource ↗</a>}

        {hasForm(lesson) ? <div className="mt-6 border-t pt-6">
          {attempts && <p className="mb-3 text-xs text-text-mid">Attempt{attempts.attempts === 1 ? '' : 's'}: {attempts.attempts}{attempts.best_score !== null && ` · best score ${attempts.best_score}%`}</p>}
          <FormFill key={lesson.id} form={lesson.form!} response={program.form_responses?.find((response) => response.lesson_id === lesson.id)} onSubmit={(answers) => onSubmit(lesson.id, answers)} />
        </div> : <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
          {done
            ? <><span className="text-sm font-bold text-green-mid">✓ Lesson complete</span><button type="button" disabled={busy} onClick={() => tick(false)} className="text-xs font-bold text-text-mid underline disabled:opacity-50">Mark as not done</button></>
            : <button type="button" disabled={busy} onClick={async () => { await tick(true); if (index < lessons.length - 1) setCurrentId(lessons[index + 1].id) }} className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : index < lessons.length - 1 ? 'Mark complete and continue' : 'Mark complete'}</button>}
        </div>}

        <div className="mt-8 flex justify-between gap-3">
          <button type="button" disabled={index === 0} onClick={() => go(index - 1)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-30">← Previous</button>
          <button type="button" disabled={index >= lessons.length - 1 || !unlocked(lessons[index + 1]?.id)} onClick={() => go(index + 1)} title={index < lessons.length - 1 && !unlocked(lessons[index + 1]?.id) ? 'Complete this lesson to continue' : undefined} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-30">Next →</button>
        </div>
      </article> : <p className="rounded-[20px] border bg-white p-10 text-center text-text-mid">This course has no lessons yet.</p>}
    </div>
  </div>
}
