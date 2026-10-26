import { NextRequest, NextResponse } from 'next/server'
import { assistantInstructions, streamPatientAnswer, type ChatMessage } from '@/lib/ai/patientAssistant'
import { emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import { loadPatientRecord, patientRecordText } from '@/lib/patientRecord'

export const runtime = 'nodejs'

// Answers a clinician's question about one patient from that patient's
// record, streamed back as plain text while it is written.

const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 8000
const today = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// Keeps the latest turns, starting with a question and alternating, so the
// model is always given a well-formed conversation ending in the question.
function cleanConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const messages: ChatMessage[] = []
  for (const item of value.slice(-MAX_MESSAGES)) {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null
    const content = typeof item?.content === 'string' ? item.content.trim().slice(0, MAX_MESSAGE_CHARS) : ''
    if (!role || !content) continue
    const last = messages[messages.length - 1]
    if (last?.role === role) last.content += `\n\n${content}`
    else messages.push({ role, content })
  }
  while (messages[0]?.role === 'assistant') messages.shift()
  return messages[messages.length - 1]?.role === 'user' ? messages : []
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'view_clinical_records')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context

  const body = await request.json().catch(() => null) as Record<string, any> | null
  const patientId = body?.patientId
  if (!isUuid(patientId)) return fail('A valid patient is required.')
  const messages = cleanConversation(body?.messages)
  if (!messages.length) return fail('Ask a question about the patient.')

  let record
  try {
    record = await loadPatientRecord(database, patientId)
  } catch (error) {
    console.error('Patient assistant: record could not be loaded:', error)
    return fail(emrErrorMessage(error), 500)
  }
  if (!record) return fail('Patient not found.', 404)

  const question = messages[messages.length - 1].content
  await writeEmrAudit(database, user, { action: 'ask_patient_assistant', entityType: 'emr_patient', entityId: patientId, patientId, metadata: { question: question.slice(0, 500), turns: messages.length } })

  // Stop generating if the clinician stops the answer or closes the page.
  const abort = new AbortController()
  request.signal.addEventListener('abort', () => abort.abort())
  const answer = streamPatientAnswer(assistantInstructions(today.format(new Date())), patientRecordText(record), messages, abort.signal)

  // Wait for the first words, so a failure to answer at all comes back as an
  // error rather than as the start of a reply.
  let first: IteratorResult<string>
  try {
    first = await answer.next()
  } catch (error) {
    console.error('Patient assistant could not answer:', error)
    const unconfigured = error instanceof Error && error.message === 'No AI provider is configured.'
    return fail(unconfigured ? 'The assistant needs an AI provider to be configured.' : 'The assistant could not answer just now. Try again in a moment.', unconfigured ? 503 : 502)
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value))
        // Carries on from the first words, already taken above.
        for await (const text of answer) controller.enqueue(encoder.encode(text))
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error('Patient assistant answer was interrupted:', error)
          controller.enqueue(encoder.encode('\n\n_The answer was interrupted. Ask again to get the rest._'))
        }
      } finally {
        // Already closed if the clinician stopped the answer.
        try { controller.close() } catch {}
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' } })
}
