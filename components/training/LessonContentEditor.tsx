'use client'

import { useMemo, useRef, useState } from 'react'
import { lessonProblems } from '@/lib/lessonContent'
import LessonContent from './LessonContent'

// The lesson text box in the course builder, with buttons that insert a
// table, callout or drawn visual as an editable template, and a preview.

const templates: { label: string; group: 'Text' | 'Visual'; text: string }[] = [
  { label: 'Heading', group: 'Text', text: '## Section heading' },
  { label: 'Table', group: 'Text', text: '| Marker | Typical range | What it suggests |\n| --- | --- | --- |\n| Ferritin | 30–150 ng/mL | Iron stores |\n| TSH | 0.5–2.5 mIU/L | Thyroid signalling |' },
  { label: 'Key point', group: 'Text', text: '> [!KEY] The one thing to remember\n> Write the main takeaway here.' },
  { label: 'Tip', group: 'Text', text: '> [!TIP]\n> A practical tip for clinic.' },
  { label: 'Watch out', group: 'Text', text: '> [!WARNING] Red flag\n> When to refer or escalate.' },
  { label: 'Example', group: 'Text', text: '> [!EXAMPLE] Case example\n> A short patient scenario.' },
  { label: 'Image', group: 'Text', text: '![Describe the image](https://… "Optional caption")' },
  { label: 'Bar chart', group: 'Visual', text: '```chart\n{\n  "type": "bar",\n  "title": "Chart title",\n  "unit": "%",\n  "data": [\n    { "label": "First", "value": 42 },\n    { "label": "Second", "value": 27 },\n    { "label": "Third", "value": 12 }\n  ],\n  "caption": "Where the numbers come from."\n}\n```' },
  { label: 'Line chart', group: 'Visual', text: '```chart\n{\n  "type": "line",\n  "title": "Change over time",\n  "unit": "mg/dL",\n  "labels": ["Week 0", "Week 4", "Week 8", "Week 12"],\n  "series": [\n    { "name": "Fasting glucose", "values": [118, 109, 101, 96] }\n  ]\n}\n```' },
  { label: 'Donut', group: 'Visual', text: '```chart\n{\n  "type": "donut",\n  "title": "Share of the whole",\n  "unit": "%",\n  "data": [\n    { "label": "Part A", "value": 50 },\n    { "label": "Part B", "value": 30 },\n    { "label": "Part C", "value": 20 }\n  ]\n}\n```' },
  { label: 'Steps', group: 'Visual', text: '```steps\n{\n  "title": "How it works",\n  "steps": [\n    { "title": "First", "text": "What happens first." },\n    { "title": "Then", "text": "What follows." },\n    { "title": "Finally", "text": "The result." }\n  ]\n}\n```' },
  { label: 'Compare', group: 'Visual', text: '```compare\n{\n  "title": "Side by side",\n  "columns": [\n    { "heading": "Conventional view", "points": ["Point one", "Point two"] },\n    { "heading": "Functional medicine view", "points": ["Point one", "Point two"] }\n  ]\n}\n```' },
  { label: 'Key numbers', group: 'Visual', text: '```stats\n{\n  "title": "By the numbers",\n  "items": [\n    { "value": "70%", "label": "of immune tissue", "note": "sits in and around the gut" },\n    { "value": "1 in 3", "label": "adults", "note": "short explanation" }\n  ]\n}\n```' },
  { label: 'Cycle', group: 'Visual', text: '```cycle\n{\n  "title": "A self-reinforcing loop",\n  "center": "Vicious cycle",\n  "items": ["Stress", "Poor sleep", "Cravings", "Blood sugar swings"]\n}\n```' },
  { label: 'Timeline', group: 'Visual', text: '```timeline\n{\n  "title": "What to expect",\n  "items": [\n    { "when": "Week 1", "title": "Start", "text": "What happens." },\n    { "when": "Week 4", "title": "Review", "text": "What we check." }\n  ]\n}\n```' },
  { label: 'Hub diagram', group: 'Visual', text: '```hub\n{\n  "title": "Everything connected to one idea",\n  "center": "Main idea",\n  "items": [\n    { "label": "Factor one", "text": "How it links." },\n    { "label": "Factor two", "text": "How it links." },\n    { "label": "Factor three", "text": "How it links." }\n  ]\n}\n```' },
  { label: 'Lab range', group: 'Visual', text: '```range\n{\n  "title": "Ferritin: lab range vs functional target",\n  "unit": "ng/mL",\n  "min": 0, "max": 300,\n  "bands": [\n    { "from": 0, "to": 30, "label": "Low", "tone": "serious" },\n    { "from": 30, "to": 50, "label": "Borderline", "tone": "warning" },\n    { "from": 50, "to": 150, "label": "Target", "tone": "good" },\n    { "from": 150, "to": 300, "label": "High", "tone": "warning" }\n  ],\n  "markers": [{ "value": 22, "label": "Patient: 22" }]\n}\n```' },
  { label: 'Body map', group: 'Visual', text: '```body\n{\n  "title": "Where it shows up in the body",\n  "items": [\n    { "system": "gut", "label": "Gut", "text": "Bloating, irregular stools." },\n    { "system": "brain", "label": "Brain", "text": "Low mood, brain fog." },\n    { "system": "skin", "label": "Skin", "text": "Eczema, acne." }\n  ]\n}\n```' },
]

export default function LessonContentEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const box = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const problems = useMemo(() => lessonProblems(value), [value])

  function insert(text: string) {
    const el = box.current; const at = el ? el.selectionEnd : value.length
    const before = value.slice(0, at); const after = value.slice(at)
    const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
    const trail = after && !after.startsWith('\n') ? '\n\n' : ''
    onChange(`${before}${lead}${text}${trail}${after}`)
    setPreview(false)
    requestAnimationFrame(() => { if (!el) return; const pos = (before + lead + text).length; el.focus(); el.setSelectionRange(pos, pos) })
  }

  return <div className="mt-2 rounded-xl border bg-white">
    <div className="flex flex-wrap items-center gap-1 border-b bg-[#fbfaf6] p-2">
      {(['Text', 'Visual'] as const).map((group) => <div key={group} className="flex flex-wrap items-center gap-1">
        <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{group === 'Text' ? 'Insert' : 'Visuals'}</span>
        {templates.filter((t) => t.group === group).map((t) => <button key={t.label} type="button" onClick={() => insert(t.text)} className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-bold text-green-deep hover:border-green-mid">{t.label}</button>)}
      </div>)}
      <button type="button" onClick={() => setPreview((p) => !p)} className={`ml-auto rounded-full px-3 py-1 text-[11px] font-bold ${preview ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>{preview ? 'Edit' : 'Preview'}</button>
    </div>
    {preview
      ? <div className="max-h-[70vh] overflow-y-auto p-4">{value.trim() ? <LessonContent content={value} editing /> : <p className="text-sm text-text-mid">Nothing to preview yet.</p>}</div>
      : <textarea ref={box} rows={8} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Lesson content. Markdown works: ## headings, **bold**, - lists, tables, and the visuals above." className="block w-full resize-y rounded-b-xl border-0 p-3 font-mono text-[13px] leading-6 outline-none" />}
    {problems.length > 0 && <p role="alert" className="border-t bg-red-50 px-3 py-2 text-xs text-red-700">{problems.length} visual{problems.length === 1 ? '' : 's'} can’t be shown: {problems.join(' · ')}</p>}
    <p className="border-t px-3 py-1.5 text-[11px] text-gray-400">Format guide: docs/lesson-visuals.md</p>
  </div>
}
