// Survey and quiz forms: the question model, validation and grading shared by
// standalone forms (customers, staff, patients) and training lesson forms.
// Client-safe: no server imports.

export type FormQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'dropdown' | 'yes_no' | 'rating' | 'matrix' | 'ranking' | 'section'
// `correct` holds option text for gradable questions; it is only used when the form is a quiz.
// `options` are the choices, the columns of a rating grid, or the items to rank. `rows` are a rating grid's rows.
// `maxChoices` caps checkbox picks (0 = no cap). `allowOther` adds an "Other (please specify)" choice.
// `icon` decorates a section heading when the form uses the playful style.
// The optional fields are optional because forms saved before they existed don't carry them.
export type FormQuestion = {
  id: string; type: FormQuestionType; label: string; help: string; required: boolean; options: string[]; correct: string[]; scaleMax: number
  rows?: string[]; maxChoices?: number; allowOther?: boolean; icon?: SectionIcon
}
// `paged` shows each section heading and its questions on a screen of its own.
// `playful` adds section icons, animations and a celebration when the form is sent.
// `thankYouLink` is a button on the thank-you screen, e.g. "Leave us a Google review".
export type FormDefinition = {
  kind: 'survey' | 'quiz'; title: string; description: string; passPercent: number; questions: FormQuestion[]; paged?: boolean
  playful?: boolean; thankYouLink?: { label: string; url: string }
}

export const sectionIcons = ['wave', 'heartbeat', 'clipboard', 'smiley', 'house', 'video', 'calendar', 'leaf', 'brain', 'baby', 'drop', 'star'] as const
export type SectionIcon = typeof sectionIcons[number]
// Rating grids answer with { row: column }; rankings with the options in ranked order.
export type FormAnswer = string | string[] | number | Record<string, string>
export type FormAnswers = Record<string, FormAnswer>
export type GradedResponse = { answers: FormAnswers; score: number | null; passed: boolean | null }
// The parts of a stored response the form components need, whatever table it came from.
export type FormResponseView = GradedResponse & { submitted_at: string; respondent?: string; key?: string }

export const questionTypes: { value: FormQuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short answer' }, { value: 'long_text', label: 'Paragraph' },
  { value: 'single_choice', label: 'Multiple choice' }, { value: 'multi_choice', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' }, { value: 'yes_no', label: 'Yes / No' }, { value: 'rating', label: 'Rating scale' },
  { value: 'matrix', label: 'Rating grid' }, { value: 'ranking', label: 'Ranking' }, { value: 'section', label: 'Section heading' },
]
export const choiceTypes: FormQuestionType[] = ['single_choice', 'multi_choice', 'dropdown']
// Types whose `options` list is edited in the builder.
export const optionListTypes: FormQuestionType[] = [...choiceTypes, 'matrix', 'ranking']
export const yesNo = ['Yes', 'No']
export const otherPrefix = 'Other: '

export function questionOptions(question: FormQuestion) {
  return question.type === 'yes_no' ? yesNo : choiceTypes.includes(question.type) ? question.options : []
}
export const isGradable = (question: FormQuestion) => questionOptions(question).length > 0 && question.correct.length > 0
export const isOtherAnswer = (value: string) => value.startsWith(otherPrefix)

// The screens of a paged form: a new one starts at each section heading.
export function formPages(questions: FormQuestion[]) {
  return questions.reduce<FormQuestion[][]>((pages, q) => {
    if (q.type === 'section' && pages[pages.length - 1].length) pages.push([])
    pages[pages.length - 1].push(q); return pages
  }, [[]]).filter((page) => page.length)
}

// Question numbers shown to respondents; section headings are not numbered.
export function questionNumbers(questions: FormQuestion[]) {
  let n = 0
  return new Map(questions.filter((q) => q.type !== 'section').map((q) => [q.id, ++n]))
}

export function cleanFormText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

const cleanList = (value: unknown, max: number, limit: number) =>
  Array.isArray(value) ? Array.from(new Set(value.map((item) => cleanFormText(item, max)).filter(Boolean))).slice(0, limit) : []

export function cleanFormDefinition(value: unknown): FormDefinition | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const types = questionTypes.map((type) => type.value)
  const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 150).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const q = item as Record<string, unknown>
    const label = cleanFormText(q.label, 500)
    const type = types.includes(q.type as FormQuestionType) ? q.type as FormQuestionType : 'short_text'
    if (!label) return []
    const options = optionListTypes.includes(type) ? cleanList(q.options, 200, 30) : []
    if (optionListTypes.includes(type) && options.length < 2) return []
    const rows = type === 'matrix' ? cleanList(q.rows, 300, 40) : []
    if (type === 'matrix' && !rows.length) return []
    const valid = type === 'yes_no' ? yesNo : choiceTypes.includes(type) ? options : []
    const correct = Array.isArray(q.correct) ? Array.from(new Set(q.correct.filter((c): c is string => typeof c === 'string' && valid.includes(c)))) : []
    const maxChoices = type === 'multi_choice' ? Math.max(0, Math.trunc(Number(q.maxChoices) || 0)) : 0
    const allowOther = (type === 'single_choice' || type === 'multi_choice') && q.allowOther === true
    return [{
      id: cleanFormText(q.id, 80) || `question-${index + 1}`, type, label, help: cleanFormText(q.help, 1000), required: type !== 'section' && q.required === true,
      options, correct: type === 'multi_choice' ? correct : correct.slice(0, 1), scaleMax: Number(q.scaleMax) === 10 ? 10 : 5,
      ...(type === 'matrix' ? { rows } : {}),
      // A cap at or above the number of choices is no cap.
      ...(maxChoices && maxChoices < options.length + (allowOther ? 1 : 0) ? { maxChoices } : {}),
      ...(allowOther ? { allowOther } : {}),
      ...(type === 'section' && sectionIcons.includes(q.icon as SectionIcon) ? { icon: q.icon as SectionIcon } : {}),
    } satisfies FormQuestion]
  }) : []
  if (!questions.some((q) => q.type !== 'section')) return null
  return {
    kind: raw.kind === 'quiz' ? 'quiz' : 'survey', title: cleanFormText(raw.title, 160), description: cleanFormText(raw.description, 3000),
    passPercent: Math.max(0, Math.min(100, Math.trunc(Number(raw.passPercent) || 0))), questions,
    ...(raw.paged === true && questions.some((q) => q.type === 'section') ? { paged: true } : {}),
    ...(raw.playful === true ? { playful: true } : {}),
    ...cleanThankYouLink(raw.thankYouLink),
  }
}

// Only http(s) links, so a form can never carry a javascript: or data: URL to respondents.
function cleanThankYouLink(value: unknown) {
  if (!value || typeof value !== 'object') return {}
  const link = value as Record<string, unknown>; const url = cleanFormText(link.url, 2000)
  try { if (!['https:', 'http:'].includes(new URL(url).protocol)) return {} } catch { return {} }
  return { thankYouLink: { label: cleanFormText(link.label, 80) || 'Visit link', url } }
}

// A picked choice, or "Other: <text>" when the question allows it; anything else is dropped.
function cleanChoice(question: FormQuestion, value: unknown) {
  if (typeof value !== 'string') return null
  if (question.allowOther && isOtherAnswer(value)) { const text = cleanFormText(value.slice(otherPrefix.length), 300); return text ? otherPrefix + text : null }
  return questionOptions(question).includes(value) ? value : null
}

// Validates a respondent's answers against the form and grades quizzes.
// `questionId` says which question an error is about, so the form can point to it.
export function gradeFormResponse(form: FormDefinition, value: unknown): GradedResponse | { error: string; questionId?: string } {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const answers: FormAnswers = {}
  for (const question of form.questions) {
    if (question.type === 'section') continue
    const input = raw[question.id]; const options = questionOptions(question); let answer: FormAnswer | null = null
    const fail = (error: string) => ({ error, questionId: question.id })
    if (question.type === 'rating') {
      const n = Math.trunc(Number(input)); if (n >= 1 && n <= question.scaleMax) answer = n
    } else if (question.type === 'matrix') {
      const given = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
      const rated = Object.fromEntries((question.rows || []).flatMap((row) => typeof given[row] === 'string' && question.options.includes(given[row] as string) ? [[row, given[row] as string]] : []))
      const count = Object.keys(rated).length
      if (question.required && count < (question.rows || []).length) return fail(count ? `Please rate every row in “${question.label}”.` : `Please answer “${question.label}”.`)
      if (count) answer = rated
    } else if (question.type === 'ranking') {
      const ranked = Array.isArray(input) ? Array.from(new Set(input.filter((v): v is string => typeof v === 'string' && question.options.includes(v)))) : []
      if (question.required && ranked.length && ranked.length < question.options.length) return fail(`Please rank all ${question.options.length} items in “${question.label}”.`)
      if (ranked.length) answer = ranked
    } else if (question.type === 'multi_choice') {
      const picked = Array.isArray(input) ? Array.from(new Set(input.map((v) => cleanChoice(question, v)).filter((v): v is string => !!v))) : []
      if (question.maxChoices && picked.length > question.maxChoices) return fail(`Choose no more than ${question.maxChoices} for “${question.label}”.`)
      if (picked.length) answer = picked
    } else if (options.length) {
      answer = cleanChoice(question, input)
    } else {
      const text = cleanFormText(input, question.type === 'long_text' ? 10000 : 1000); if (text) answer = text
    }
    if (answer === null) { if (question.required) return fail(`Please answer “${question.label}”.`); continue }
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
