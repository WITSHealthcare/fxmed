import sanitizeHtml from 'sanitize-html'

// Encounter and note fields written with the rich text editor are stored as a
// small, cleaned subset of HTML. Entries made before the editor are plain
// text, so every reader checks which it has: screens show the formatting, and
// AI prompts, previews and summaries use clinicalPlainText.

/** Encounter fields that use the rich text editor. The chief complaint stays a single line. */
export const RICH_ENCOUNTER_FIELDS = [
  'history_presenting_illness', 'past_medical_history', 'surgical_history', 'family_history', 'social_history',
  'review_of_systems', 'examination', 'clinical_assessment', 'treatment_plan', 'follow_up_plan',
]

const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote']

/** Whether a stored value was written with the rich text editor. */
export function isRichText(value: unknown): boolean {
  return typeof value === 'string' && /^\s*<(p|ul|ol|h[1-6]|blockquote|br)[\s>/]/i.test(value)
}

/** Keeps only the formatting the editor offers: no links, images, styles or scripts. */
export function sanitizeClinicalHtml(value: string) {
  return sanitizeHtml(value, { allowedTags, allowedAttributes: {} })
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }
const decodeEntities = (text: string) => text
  .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, name: string) => entities[name])
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))

/** A stored value as editor HTML: plain text becomes one paragraph per line. */
export function toEditorHtml(value?: string | null) {
  if (!value) return ''
  if (isRichText(value)) return value
  return value.split(/\r?\n/).map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('')
}

/** Plain text for AI prompts, previews and summaries. List items become "- " or "1. " lines. */
export function clinicalPlainText(value?: string | null) {
  if (!value) return ''
  if (!isRichText(value)) return value
  const lists: Array<{ ordered: boolean; count: number }> = []
  let text = ''
  for (const [token, closing, tag] of Array.from(sanitizeClinicalHtml(value).matchAll(/<(\/?)([a-z0-9]+)[^>]*>|[^<]+/gi))) {
    if (!tag) { text += decodeEntities(token); continue }
    const name = tag.toLowerCase()
    if (name === 'ul' || name === 'ol') {
      if (closing) lists.pop()
      else lists.push({ ordered: name === 'ol', count: 0 })
      if (!text.endsWith('\n') && text) text += '\n'
    } else if (name === 'li' && !closing) {
      const list = lists[lists.length - 1]
      if (text && !text.endsWith('\n')) text += '\n'
      text += '  '.repeat(Math.max(0, lists.length - 1)) + (list?.ordered ? `${++list.count}. ` : '- ')
    } else if (name === 'li' && closing) {
      // A nested list has already ended the line.
      if (!text.endsWith('\n')) text += '\n'
    } else if (name === 'br' || (closing && ['p', 'h3', 'h4', 'blockquote'].includes(name))) {
      text += '\n'
    }
  }
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * A rich text field as it should be saved: cleaned HTML, or trimmed plain text
 * for older entries and AI drafts. Null when there is nothing in it.
 */
export function cleanClinicalText(value: unknown, max = 12000): string | null {
  if (typeof value !== 'string') return null
  if (!isRichText(value)) return value.trim().slice(0, max) || null
  // Cutting can split a tag; sanitizing afterwards closes it again.
  const html = sanitizeClinicalHtml(value.trim().slice(0, max))
  return clinicalPlainText(html) ? html : null
}
