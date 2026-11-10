'use client'

// The playful form style: section icons, a step tracker with encouragement,
// and a celebration when the form is sent. Motion lives in globals.css under
// .form-playful and switches off for people who ask for reduced motion.
import {
  BabyIcon, BrainIcon, CalendarCheckIcon, ClipboardTextIcon, DropIcon, HandWavingIcon, HeartbeatIcon,
  HouseIcon, LeafIcon, SmileyIcon, StarIcon, VideoCameraIcon,
} from '@phosphor-icons/react'
import type { FormQuestion, SectionIcon } from '@/lib/forms'

const icons: Record<SectionIcon, { Icon: typeof StarIcon; label: string }> = {
  wave: { Icon: HandWavingIcon, label: 'Wave (welcome)' }, heartbeat: { Icon: HeartbeatIcon, label: 'Heartbeat (vitals)' },
  clipboard: { Icon: ClipboardTextIcon, label: 'Clipboard (history)' }, smiley: { Icon: SmileyIcon, label: 'Smiley (feelings)' },
  house: { Icon: HouseIcon, label: 'House (home visit)' }, video: { Icon: VideoCameraIcon, label: 'Video (telehealth)' },
  calendar: { Icon: CalendarCheckIcon, label: 'Calendar (booking)' }, leaf: { Icon: LeafIcon, label: 'Leaf (nutrition)' },
  brain: { Icon: BrainIcon, label: 'Brain (mind)' }, baby: { Icon: BabyIcon, label: 'Baby (maternal)' },
  drop: { Icon: DropIcon, label: 'Drop (labs)' }, star: { Icon: StarIcon, label: 'Star' },
}
export const sectionIconOptions = Object.entries(icons).map(([value, { label }]) => ({ value: value as SectionIcon, label }))
// Sections without a chosen icon take one in turn, so every heading still gets a picture.
const fallback: SectionIcon[] = ['wave', 'heartbeat', 'clipboard', 'smiley', 'calendar', 'star']

export function sectionIconFor(section: FormQuestion | undefined, index: number) {
  return icons[section?.icon || fallback[index % fallback.length]].Icon
}

export function PlayfulSection({ question, index }: { question: FormQuestion; index: number }) {
  const Icon = sectionIconFor(question, index)
  return <div className="form-pop flex items-start gap-4 pb-1 pt-3">
    <span aria-hidden="true" className="form-bob flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold/40 text-green-deep shadow-[0_6px_18px_rgba(201,226,101,0.45)]"><Icon size={30} weight="duotone" /></span>
    <div className="min-w-0"><h3 className="text-xl font-bold text-green-deep">{question.label}</h3>{question.help && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-mid">{question.help}</p>}</div>
  </div>
}

const cheers = ["Let's get started!", 'Great start!', "You're doing great!", 'Halfway there!', 'Nearly done!', 'Last step!']

// One dot per page, showing that page's section icon; the line fills as the respondent moves on.
export function StepTracker({ pages, at }: { pages: FormQuestion[][]; at: number }) {
  const last = at === pages.length - 1; const share = at / Math.max(1, pages.length - 1)
  const cheer = at === 0 ? cheers[0] : last ? cheers[5] : share >= 0.75 ? cheers[4] : share >= 0.45 && share <= 0.6 ? cheers[3] : at === 1 ? cheers[1] : cheers[2]
  return <div>
    <div className="flex items-center justify-between text-xs font-bold"><span className="text-green-mid">Step {at + 1} of {pages.length}</span><span key={at} className="form-pop rounded-full bg-gold/50 px-3 py-1 text-green-deep">{cheer}</span></div>
    <ol className="relative mt-4 flex justify-between" aria-hidden="true">
      <span className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-100" />
      <span className="absolute left-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-deep transition-all duration-700 ease-out" style={{ width: `calc((100% - 2rem) * ${share})` }} />
      {pages.map((page, i) => { const Icon = sectionIconFor(page.find((q) => q.type === 'section'), i)
        return <li key={i} className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${i < at ? 'border-green-deep bg-green-deep text-white' : i === at ? 'scale-110 border-green-deep bg-gold text-green-deep shadow-md' : 'border-gray-200 bg-white text-gray-300'}`}><Icon size={17} weight={i <= at ? 'fill' : 'regular'} /></li> })}
    </ol>
  </div>
}

// Confetti in brand colours and an animated tick. Positions are fixed per piece so each burst looks the same.
const confettiColours = ['#C9E265', '#52b788', '#2d6a4f', '#D8F085', '#1a3d2e', '#f4b860']
export function Celebration() {
  return <div aria-hidden="true" className="pointer-events-none relative mx-auto h-24 w-24">
    <div className="form-confetti absolute left-1/2 top-1/2">{Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.2; const distance = 70 + ((i * 37) % 60)
      return <span key={i} style={{ '--x': `${Math.cos(angle) * distance}px`, '--y': `${Math.sin(angle) * distance - 30}px`, '--r': `${(i * 47) % 360}deg`, '--d': `${(i % 6) * 40}ms`, background: confettiColours[i % confettiColours.length], borderRadius: i % 4 === 0 ? '9999px' : '2px' } as React.CSSProperties} />
    })}</div>
    <svg viewBox="0 0 96 96" className="form-tick relative h-24 w-24"><circle cx="48" cy="48" r="44" fill="#f0f7e1" stroke="#52b788" strokeWidth="4" /><path d="M30 50 l12 12 l24 -26" fill="none" stroke="#1a3d2e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
}
