import Image from 'next/image'
import type { ReactNode } from 'react'

// Shared frame for the learner sign-in, sign-up and password pages.
export default function LearnerAuthCard({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07130e] px-4 py-12 font-dm-sans">
    <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
    <div className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full bg-green-mid/20 blur-3xl" />
    <div className="relative w-full max-w-lg overflow-hidden rounded-[30px] bg-white shadow-2xl">
      <div className="bg-green-deep px-7 py-5"><div className="relative mx-auto h-16 w-64 overflow-hidden" aria-label="FXMed"><Image src="/logo.png" alt="FXMed" width={430} height={242} priority className="absolute left-1/2 top-1/2 h-auto w-[21rem] max-w-none -translate-x-1/2 -translate-y-1/2 brightness-0 invert" /></div></div>
      <div className="p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-mid">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-green-deep">{title}</h1>
        <div className="mt-3 text-sm leading-6 text-text-mid">{intro}</div>
        {children}
      </div>
    </div>
  </main>
}

export const authInput = 'mt-2 w-full rounded-xl border border-green-deep/15 bg-[#fbfcf8] px-4 py-3.5 font-normal outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'
export const authButton = 'w-full rounded-full bg-green-deep px-6 py-4 font-bold text-white transition hover:bg-green-mid disabled:opacity-50'

/** Where to go after signing in: a course page or the learner area, never another site. */
export function safeNext(value: string | null) {
  return value && /^\/(courses|learn)(\/[a-z0-9-]{1,120})?$/.test(value) ? value : '/learn'
}
