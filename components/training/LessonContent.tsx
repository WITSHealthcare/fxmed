'use client'

import { Fragment, useMemo, type ReactNode } from 'react'
import { parseLesson, type Block, type CalloutKind, type Inline } from '@/lib/lessonContent'
import { ChatCircleTextIcon, InfoIcon, LightbulbIcon, StarIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { LessonVisual } from './LessonVisuals'

// Renders lesson content (see lib/lessonContent.ts) as React elements.

function Inlines({ nodes }: { nodes: Inline[] }) {
  return <>{nodes.map((node, i) => {
    switch (node.t) {
      case 'text': return <Fragment key={i}>{node.v}</Fragment>
      case 'br': return <br key={i} />
      case 'bold': return <strong key={i} className="font-bold text-green-deep"><Inlines nodes={node.c} /></strong>
      case 'italic': return <em key={i}><Inlines nodes={node.c} /></em>
      case 'code': return <code key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]">{node.v}</code>
      case 'link': return <a key={i} href={node.href} target={node.href.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="font-bold text-green-mid underline underline-offset-2"><Inlines nodes={node.c} /></a>
    }
  })}</>
}

const callouts: Record<CalloutKind, { label: string; Icon: typeof InfoIcon; box: string; badge: string }> = {
  note: { label: 'Note', Icon: InfoIcon, box: 'border-[#2a78d6]/25 bg-[#eef4fc]', badge: 'bg-[#2a5fb0]' },
  tip: { label: 'Tip', Icon: LightbulbIcon, box: 'border-green-mid/25 bg-green-50', badge: 'bg-green-mid' },
  key: { label: 'Key point', Icon: StarIcon, box: 'border-gold bg-gold/20', badge: 'bg-green-deep' },
  warning: { label: 'Watch out', Icon: WarningCircleIcon, box: 'border-[#d03b3b]/25 bg-[#fdf0ef]', badge: 'bg-[#b42d2d]' },
  example: { label: 'Example', Icon: ChatCircleTextIcon, box: 'border-[#6250d6]/20 bg-[#f3f1fd]', badge: 'bg-[#5a46c4]' },
}

function Blocks({ blocks, editing }: { blocks: Block[]; editing?: boolean }): ReactNode {
  return blocks.map((block, i) => {
    switch (block.t) {
      case 'heading': {
        const cls = block.level === 2 ? 'mt-7 text-xl' : block.level === 3 ? 'mt-6 text-lg' : 'mt-5 text-base'
        const Tag = `h${block.level + 1}` as 'h3' | 'h4' | 'h5'
        return <Tag key={i} className={`${cls} font-bold text-green-deep first:mt-0`}><Inlines nodes={block.c} /></Tag>
      }
      case 'paragraph': return <p key={i} className="mt-4 first:mt-0"><Inlines nodes={block.c} /></p>
      case 'list': {
        const Tag = block.ordered ? 'ol' : 'ul'
        return <Tag key={i} start={block.ordered && block.start !== 1 ? block.start : undefined} className={`mt-4 space-y-1.5 pl-6 first:mt-0 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-green-mid`}>{block.items.map((item, j) => <li key={j} className="pl-1"><Inlines nodes={item} /></li>)}</Tag>
      }
      case 'table': return <div key={i} className="my-5 overflow-x-auto rounded-xl border border-green-deep/10">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead className="bg-green-deep text-left text-white">{<tr>{block.head.map((cell, j) => <th key={j} className="px-3 py-2.5 font-bold" style={{ textAlign: block.align[j] }}><Inlines nodes={cell} /></th>)}</tr>}</thead>
          <tbody>{block.rows.map((row, r) => <tr key={r} className="border-t border-green-deep/10 even:bg-[#f7f8f3]">{row.map((cell, j) => <td key={j} className="px-3 py-2.5 align-top leading-6" style={{ textAlign: block.align[j] }}><Inlines nodes={cell} /></td>)}</tr>)}</tbody>
        </table>
      </div>
      case 'callout': {
        const c = callouts[block.kind]
        return <aside key={i} className={`my-6 flex gap-4 rounded-2xl border p-4 sm:p-5 ${c.box}`}>
          <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${c.badge}`}><c.Icon size={24} weight="fill" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold uppercase tracking-wide text-green-deep">{block.title || c.label}</p>
            {block.body.length > 0 && <div className="mt-1 text-[15px] leading-7"><Blocks blocks={block.body} editing={editing} /></div>}</div>
        </aside>
      }
      case 'quote': return <blockquote key={i} className="my-5 border-l-4 border-green-mid/40 pl-4 italic text-text-mid"><Blocks blocks={block.body} editing={editing} /></blockquote>
      case 'image': return <figure key={i} className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- lesson images come from any uploaded URL */}
        <img src={block.src} alt={block.alt} loading="lazy" className="w-full rounded-xl border border-green-deep/10" />
        {block.caption && <figcaption className="mt-2 text-center text-xs text-text-mid">{block.caption}</figcaption>}
      </figure>
      case 'rule': return <hr key={i} className="my-7 border-green-deep/10" />
      case 'visual': return <LessonVisual key={i} visual={block.data} />
      case 'invalid': return editing
        ? <p key={i} role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><strong>{block.kind} visual can’t be shown:</strong> {block.error}</p>
        : null
    }
  })
}

export default function LessonContent({ content, editing = false }: { content: string; editing?: boolean }) {
  const blocks = useMemo(() => parseLesson(content), [content])
  return <div className="text-[15px] leading-7 text-text-dark"><Blocks blocks={blocks} editing={editing} /></div>
}
