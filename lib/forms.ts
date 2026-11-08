// Survey and quiz forms: the question model, validation and grading shared by
// standalone forms (customers, staff, patients) and training lesson forms.
// Client-safe: no server imports.

export type FormQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown' | 'yes_no' | 'rating'
// `correct` holds option text for gradable questions; it is only used when the form is a quiz.
export type FormQuestion = { id: string; type: FormQuestionType; label: string; help: string; required: boolean; options: string[]; correct: string[]; scaleMax: number }
export type FormDefinition = { kind: 'survey' | 'quiz'; title: string; description: string; passPercent: number; questions: FormQuestion[] }
export type FormAnswer = string | string[] | number
export type FormAnswers = Record<string, FormAnswer>
export type GradedResponse = { answers: FormAnswers; score: number | null; passed: boolean | null }
// The parts of a stored response the form components need, whatever table it came from.
export type FormResponseView = GradedResponse & { submitted_at: string; respondent?: string; key?: string }

export const questionTypes: { value: FormQuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short answer' }, { value: 'long_text', label: 'Paragraph' },
  { value: 'single_choice', label: 'Multiple choice' }, { value: 'multi_choice', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' }, { value: 'yes_no', label: 'Yes / No' }, { value: 'rating', label: 'Rating scale' },
]
export const choiceTypes: FormQuestionType[] = ['single_choice', 'multi_choice', 'dropdown']
export const yesNo = ['Yes', 'No']

export function questionOptions(question: FormQuestion) {
  return question.type === 'yes_no' ? yesNo : choiceTypes.includes(question.type) ? question.options : []
}
export const isGradable = (question: FormQuestion) => questionOptions(question).length > 0 && question.correct.length > 0

export function cleanFormText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function cleanFormDefinition(value: unknown): FormDefinition | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const types = questionTypes.map((type) => type.value)
  const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 100).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const q = item as Record<string, unknown>
    const label = cleanFormText(q.label, 500)
    const type = types.includes(q.type as FormQuestionType) ? q.type as FormQuestionType : 'short_text'
    if (!label) return []
    const options = choiceTypes.includes(type) && Array.isArray(q.options)
      ? Array.from(new Set(q.options.map((option) => cleanFormText(option, 200)).filter(Boolean))).slice(0, 30) : []
    if (choiceTypes.includes(type) && options.length < 2) return []
    const valid = type === 'yes_no' ? yesNo : options
    const correct = Array.isArray(q.correct) ? Array.from(new Set(q.correct.filter((c): c is string => typeof c === 'string' && valid.includes(c)))) : []
    return [{
      id: cleanFormText(q.id, 80) || `question-${index + 1}`, type, label, help: cleanFormText(q.help, 1000), required: q.required === true,
      options, correct: type === 'multi_choice' ? correct : correct.slice(0, 1), scaleMax: Number(q.scaleMax) === 10 ? 10 : 5,
    } satisfies FormQuestion]
  }) : []
  if (!questions.length) return null
  return {
    kind: raw.kind === 'quiz' ? 'quiz' : 'survey', title: cleanFormText(raw.title, 160), description: cleanFormText(raw.description, 3000),
    passPercent: Math.max(0, Math.min(100, Math.trunc(Number(raw.passPercent) || 0))), questions,
  }
}

// Validates a respondent's answers against the form and grades quizzes.
export function gradeFormResponse(form: FormDefinition, value: unknown): GradedResponse | { error: string } {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const answers: FormAnswers = {}
  for (const question of form.questions) {
    const input = raw[question.id]; const options = questionOptions(question); let answer: FormAnswer | null = null
    if (question.type === 'rating') {
      const n = Math.trunc(Number(input)); if (n >= 1 && n <= question.scaleMax) answer = n
    } else if (question.type === 'multi_choice') {
      const picked = Array.isArray(input) ? Array.from(new Set(input.filter((v): v is string => typeof v === 'string' && options.includes(v)))) : []
      if (picked.length) answer = picked
    } else if (options.length) {
      if (typeof input === 'string' && options.includes(input)) answer = input
    } else {
      const text = cleanFormText(input, question.type === 'long_text' ? 10000 : 1000); if (text) answer = text
    }
    if (answer === null) { if (question.required) return { error: `Please answer “${question.label}”.` }; continue }
    answers[question.id] = answer
  }
  if (form.kind !== 'quiz') return { answers, score: null, passed: null }
  const graded = form.questions.filter(isGradable)
  if (!graded.length) return { answers, score: null, passed: true }
  const right = graded.filter((question) => {
    const given = answers[question.id]; const picked = Array.isArray(given) ? given : given === undefined ? [] : [String(given)]
    return picked.length === question.correct.length && picked.every((option) => question.correct.includes(option))
  }).length
  const score = Math.round(right / graded.length * 100)
  return { answers, score, passed: score >= form.passPercent }
}
