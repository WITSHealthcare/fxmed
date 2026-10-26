'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowCounterClockwiseIcon, PaperPlaneRightIcon, SparkleIcon, StopIcon, XIcon } from '@phosphor-icons/react'

// The AI assistant on a patient record: a button in the bottom-right corner
// that opens a chat for asking questions about this patient. Answers come
// from the patient's record (see app/api/admin/emr/assistant). The
// conversation lasts while this patient's record is open.

const API = '/api/admin/emr/assistant'
// The latest turns sent with each question; older ones are dropped.
const HISTORY = 12

type Message = { role: 'user' | 'assistant'; content: string }

const suggestions = [
  'Summarise this patient\'s history',
  'What are the latest investigation results? Is anything abnormal?',
  'What medications and allergies are on record?',
  'When was the last visit, and what was the plan?',
  'Is anything outstanding, such as results or follow-ups?',
]

// **bold** inside a line of text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index} className="font-bold">{part.slice(2, -2)}</strong> : part)
}

const cells = (line: string) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim())

/** The small Markdown subset the assistant is asked to write, rendered without raw HTML. */
function Answer({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const items = list.items.map((item, index) => <li key={index}>{inline(item)}</li>)
    blocks.push(list.ordered ? <ol key={blocks.length} className="ml-5 list-decimal space-y-1">{items}</ol> : <ul key={blocks.length} className="ml-5 list-disc space-y-1">{items}</ul>)
    list = null
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1] || '')) {
      flush()
      const head = cells(line)
      const rows: string[][] = []
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(cells(lines[i]))
      i--
      blocks.push(<div key={blocks.length} className="overflow-x-auto"><table className="w-full border-collapse text-xs">
        <thead><tr>{head.map((cell, index) => <th key={index} className="border-b border-green-deep/15 px-2 py-1.5 text-left font-bold">{inline(cell)}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-green-deep/10 last:border-0">{row.map((cell, column) => <td key={column} className="px-2 py-1.5 align-top">{inline(cell)}</td>)}</tr>)}</tbody>
      </table></div>)
      continue
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flush()
      if (!list) list = { ordered, items: [] }
      list.items.push((bullet || numbered)![1])
      continue
    }
    flush()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) blocks.push(<p key={blocks.length} className="font-bold">{inline(heading[1])}</p>)
    else if (/^_.*_$/.test(line.trim())) blocks.push(<p key={blocks.length} className="italic text-text-mid">{line.trim().slice(1, -1)}</p>)
    else if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>)
  }
  flush()
  return <div className="space-y-2">{blocks}</div>
}

export default function PatientAssistant({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [answering, setAnswering] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  // Counts conversations, so an answer still arriving after "new chat" is dropped.
  const conversationId = useRef(0)
  const list = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const firstName = patientName.split(' ')[0] || 'this patient'

  // Keep the newest words in view while an answer is written.
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages, open])
  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])
  // Stop any answer still being written when the record is closed.
  useEffect(() => () => abort.current?.abort(), [])

  async function ask(question: string) {
    const text = question.trim()
    if (!text || answering) return
    const conversation: Message[] = [...messages, { role: 'user', content: text }]
    setMessages([...conversation, { role: 'assistant', content: '' }])
    setInput('')
    setError('')
    setAnswering(true)
    const controller = new AbortController()
    abort.current = controller
    const id = conversationId.current
    const current = () => conversationId.current === id
    const show = (answer: string) => { if (current()) setMessages(list => [...list.slice(0, -1), { role: 'assistant', content: answer }]) }
    let answer = ''
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, messages: conversation.slice(-HISTORY) }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'The assistant could not answer just now. Try again in a moment.')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        show(answer)
      }
      answer += decoder.decode()
      show(answer.trim() || 'No answer was given. Try asking again.')
    } catch (askError) {
      if (!current()) return
      if (answer.trim()) {
        show(`${answer.trim()}\n\n_${controller.signal.aborted ? 'Stopped.' : 'The answer was cut off.'}_`)
      } else {
        // Nothing came back: take the question off the chat and give it back to resend.
        setMessages(messages)
        setInput(text)
      }
      if (!controller.signal.aborted) setError(askError instanceof Error ? askError.message : 'The assistant could not answer just now.')
    } finally {
      if (current()) {
        setAnswering(false)
        abort.current = null
      }
    }
  }

  function startOver() {
    conversationId.current++
    abort.current?.abort()
    abort.current = null
    setAnswering(false)
    setMessages([])
    setError('')
    setInput('')
    field.current?.focus()
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} aria-label={`Ask AI about ${patientName}`} title={`Ask AI about ${firstName}`}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-deep text-gold shadow-[0_12px_30px_rgba(26,61,46,0.35)] transition hover:-translate-y-0.5 hover:bg-green-mid focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">
      <SparkleIcon size={26} weight="fill" />
      {messages.length > 0 && <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-green-deep bg-gold" aria-hidden />}
    </button>
  }

  return <section role="dialog" aria-label={`Ask AI about ${patientName}`} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}
    className="fixed bottom-4 right-4 z-40 flex h-[min(640px,calc(100vh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-green-deep/10 bg-white shadow-[0_24px_60px_rgba(26,61,46,0.28)] sm:bottom-6 sm:right-6 sm:w-[420px]">
    <header className="flex items-start justify-between gap-3 bg-green-deep px-5 py-4 text-white">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-green-deep"><SparkleIcon size={20} weight="fill" /></span>
        <div className="min-w-0"><h3 className="truncate font-bold">Ask about {firstName}</h3><p className="text-xs text-white/65">Answers come from this patient's record.</p></div>
      </div>
      <div className="flex shrink-0 gap-1">
        {messages.length > 0 && <button type="button" onClick={startOver} title="Start a new chat" aria-label="Start a new chat" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"><ArrowCounterClockwiseIcon size={18} weight="bold" /></button>}
        <button type="button" onClick={() => setOpen(false)} title="Close" aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"><XIcon size={18} weight="bold" /></button>
      </div>
    </header>

    <div ref={list} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto bg-cream/30 px-4 py-5">
      {!messages.length && <div>
        <p className="text-sm leading-6 text-text-dark">Ask anything about {patientName}: history, results, medications, visits or what is outstanding. The assistant reads the whole record each time, including anything added since you opened it.</p>
        <div className="mt-4 flex flex-col items-start gap-2">{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="rounded-full border border-green-deep/15 bg-white px-3.5 py-2 text-left text-xs font-semibold text-green-deep transition hover:border-green-mid hover:bg-green-deep/5">{suggestion}</button>)}</div>
      </div>}
      {messages.map((message, index) => message.role === 'user'
        ? <div key={index} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-green-deep px-4 py-2.5 text-sm leading-6 text-white">{message.content}</p></div>
        : <div key={index} className="flex justify-start"><div className="max-w-[92%] rounded-[18px] rounded-bl-md border border-green-deep/10 bg-white px-4 py-3 text-sm leading-6 text-text-dark shadow-sm">
          {message.content ? <Answer text={message.content} /> : <p className="flex items-center gap-2 text-text-mid"><span className="flex gap-1" aria-hidden>{[0, 150, 300].map(delay => <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-mid" style={{ animationDelay: `${delay}ms` }} />)}</span>Reading the record…</p>}
        </div></div>)}
      {error && <p role="alert" className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    </div>

    <form onSubmit={event => { event.preventDefault(); ask(input) }} className="border-t border-green-deep/10 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea ref={field} value={input} onChange={event => setInput(event.target.value)} rows={1} maxLength={4000}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(input) } }}
          placeholder={`Ask about ${firstName}…`} aria-label="Your question"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[14px] border border-green-deep/15 bg-white px-3.5 py-2.5 text-sm text-text-dark outline-none placeholder:text-text-mid/60 focus:border-green-mid focus:ring-2 focus:ring-gold/30" />
        {answering
          ? <button type="button" onClick={() => abort.current?.abort()} title="Stop the answer" aria-label="Stop the answer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-green-deep/15 text-green-deep hover:bg-green-deep/5"><StopIcon size={18} weight="fill" /></button>
          : <button type="submit" disabled={!input.trim()} title="Ask" aria-label="Ask" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-deep text-gold transition hover:bg-green-mid disabled:opacity-40"><PaperPlaneRightIcon size={18} weight="fill" /></button>}
      </div>
      <p className="mt-2 px-1 text-[11px] leading-4 text-text-mid">AI can make mistakes. Check anything important against the record before acting on it.</p>
    </form>
  </section>
}
