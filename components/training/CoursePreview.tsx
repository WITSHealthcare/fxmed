import { formatMinutes, formatPrice, type TrainingPreview } from '@/lib/training'

// What a course covers, shown before anyone enrols: outcomes and the module
// and lesson outline. Never shows lesson content or quiz questions.
export function CourseFacts({ preview, showPrice = true }: { preview: TrainingPreview; showPrice?: boolean }) {
  const facts = [
    `${preview.modules.length} module${preview.modules.length === 1 ? '' : 's'}`,
    `${preview.lesson_count} lesson${preview.lesson_count === 1 ? '' : 's'}`,
    preview.total_minutes ? formatMinutes(preview.total_minutes) : null,
    preview.quiz_count ? `${preview.quiz_count} quiz${preview.quiz_count === 1 ? '' : 'zes'}` : null,
    preview.certificate_enabled ? 'Certificate on completion' : null,
    showPrice ? formatPrice(preview.price_kobo, preview.currency) : null,
  ].filter(Boolean)
  return <ul className="flex flex-wrap gap-2">{facts.map((fact) => <li key={fact} className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-deep">{fact}</li>)}</ul>
}

export function CourseOutline({ preview }: { preview: TrainingPreview }) {
  return <div className="space-y-6">
    {preview.learning_outcomes.length > 0 && <div><h4 className="font-bold text-green-deep">What you will learn</h4><ul className="mt-3 grid gap-2 sm:grid-cols-2">{preview.learning_outcomes.map((outcome) => <li key={outcome} className="flex gap-2 text-sm leading-6 text-text-mid"><span aria-hidden className="mt-1 text-green-mid">✓</span>{outcome}</li>)}</ul></div>}
    <div><h4 className="font-bold text-green-deep">Course outline{preview.sequential && <span className="ml-2 text-xs font-normal text-text-mid">Lessons open in order</span>}</h4>
      <ol className="mt-3 space-y-3">{preview.modules.map((module, index) => <li key={module.id} className="rounded-xl border bg-white p-4">
        <p className="font-bold text-green-deep">Module {index + 1}: {module.title}</p>
        <ul className="mt-2 space-y-1.5">{module.lessons.map((lesson) => <li key={lesson.id} className="flex items-center justify-between gap-3 text-sm text-text-mid"><span>{lesson.title}{lesson.hasQuiz && <span className="ml-2 rounded-full bg-gold/40 px-2 py-0.5 text-[10px] font-bold uppercase text-green-deep">Quiz</span>}</span>{lesson.durationMinutes > 0 && <span className="shrink-0 text-xs text-gray-400">{formatMinutes(lesson.durationMinutes)}</span>}</li>)}</ul>
      </li>)}</ol>
    </div>
  </div>
}
