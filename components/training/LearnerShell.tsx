'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/supabase-auth'

// Page frame for the external learner area (/learn).
export default function LearnerShell({ name, children }: { name?: string; children: ReactNode }) {
  const router = useRouter()
  return <div className="min-h-screen bg-[#FCFFF0] font-dm-sans">
    <header className="border-b border-green-deep/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/learn" className="relative block h-10 w-32 overflow-hidden" aria-label="FXMed courses home"><Image src="/FXMed_Logo_Black.png" alt="FXMed" width={1202} height={335} className="h-full w-auto" priority /></Link>
        <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-green-deep">
          <Link href="/learn" className="hover:underline">My courses</Link>
          <Link href="/courses" className="hover:underline">Browse</Link>
          {name && <span className="hidden text-text-mid sm:inline">{name}</span>}
          <button type="button" onClick={async () => { await signOut(); router.replace('/learn/login'); router.refresh() }} className="rounded-full border px-3 py-1.5 text-xs">Sign out</button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
  </div>
}
