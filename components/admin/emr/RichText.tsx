'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import 'react-quill-new/dist/quill.snow.css'
import { clinicalPlainText, isRichText, sanitizeClinicalHtml, toEditorHtml } from '@/lib/clinicalText'

// The editor runs in the browser only.
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div className="min-h-[148px] rounded-[14px] border border-green-deep/15 bg-white" /> })

const toolbar = [
  [{ header: 3 }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'bullet' }, { list: 'ordered' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['blockquote'],
  ['clean'],
]
const formats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'indent', 'blockquote']

// Lists, headings and spacing for formatted clinical text, on screen and in the editor.
const richStyles = '[&_p]:my-1 [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-bold [&_h4]:font-bold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-green-deep/20 [&_blockquote]:pl-3 [&_strong]:font-bold'

/**
 * A rich text field for encounters and notes. It takes and gives stored values:
 * plain text from older entries or AI drafts opens as paragraphs, and an empty
 * editor gives an empty string.
 */
export function RichTextEditor({ id, value, onChange, placeholder, labelledBy }: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  labelledBy?: string
}) {
  // The editor keeps its own content while staff type. When the value changes
  // from outside, such as an AI draft from a transcript, it starts again from
  // that value.
  const [emitted, setEmitted] = useState(value)
  const [generation, setGeneration] = useState(0)
  if (value !== emitted) {
    setEmitted(value)
    setGeneration(current => current + 1)
  }

  return <div id={id} role="group" aria-labelledby={labelledBy} className={`rounded-[14px] border border-green-deep/15 bg-white focus-within:border-green-mid focus-within:ring-2 focus-within:ring-green-mid/15 [&_.ql-toolbar]:rounded-t-[14px] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-green-deep/10 [&_.ql-container]:rounded-b-[14px] [&_.ql-container]:border-0 [&_.ql-container]:font-[inherit] [&_.ql-container]:text-sm [&_.ql-editor]:min-h-[104px] [&_.ql-editor]:leading-6 [&_.ql-editor.ql-blank::before]:not-italic [&_.ql-editor.ql-blank::before]:text-text-mid/60`}>
    <ReactQuill
      key={generation}
      theme="snow"
      defaultValue={toEditorHtml(value)}
      placeholder={placeholder}
      modules={{ toolbar }}
      formats={formats}
      onChange={(html: string, _delta: unknown, source: string) => {
        // Loading content also reports a change; only staff edits count.
        if (source !== 'user') return
        const next = clinicalPlainText(html).trim() ? html : ''
        setEmitted(next)
        onChange(next)
      }}
    />
  </div>
}

/** Shows a stored encounter or note field: formatted when it was written with the editor. */
export function ClinicalText({ value, className = '' }: { value?: string | null; className?: string }) {
  if (!value) return null
  if (isRichText(value)) return <div className={`${richStyles} ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeClinicalHtml(value) }} />
  return <p className={`whitespace-pre-wrap ${className}`}>{value}</p>
}
