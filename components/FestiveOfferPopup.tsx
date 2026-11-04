'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { openFestiveBooking } from '@/components/FestiveBooking'
import { festiveBookingUrl, festiveOffer, festiveOfferPhase, wellnessPackages } from '@/lib/festive-offer'

// Keep the promotion out of staff areas and active patient workflows.
const excludedPaths = ['/admin', '/api', '/ambassador-portal', '/patient-portal', '/register', '/patient-registration', '/health-assessment', '/functional-health-analysis/form', '/functional-health-analysis/results', '/functional-health-analysis/investigations']
const storageKey = `fxmed:${festiveOffer.id}:shown`

export default function FestiveOfferPopup() {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const shownRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !pathname || excludedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return
    if (shownRef.current || festiveOfferPhase() !== 'live') return
    try {
      if (sessionStorage.getItem(storageKey)) return
    } catch {
      // The in-memory flag still prevents repeats if browser storage is disabled.
    }

    let previousFocus: HTMLElement | null = null
    let previousOverflow: string | null = null
    const restorePage = () => {
      if (previousOverflow !== null) {
        document.body.style.overflow = previousOverflow
        previousOverflow = null
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      previousFocus = null
    }
    dialog.addEventListener('close', restorePage)

    const showOffer = () => {
      // Wait until the visitor returns to this tab and finishes any other dialog.
      if (document.hidden || document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]') || document.activeElement?.matches('input, textarea, select')) return false
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      shownRef.current = true
      try {
        sessionStorage.setItem(storageKey, 'true')
      } catch {
        // Storage may be unavailable in private or restricted browser contexts.
      }
      return true
    }

    let retryTimer: ReturnType<typeof setInterval> | undefined
    const timer = setTimeout(() => {
      if (!showOffer()) {
        retryTimer = setInterval(() => {
          if (showOffer()) clearInterval(retryTimer)
        }, 1000)
      }
    }, festiveOffer.delayMs)

    return () => {
      clearTimeout(timer)
      clearInterval(retryTimer)
      dialog.removeEventListener('close', restorePage)
      if (dialog.open) dialog.close()
      restorePage()
    }
  }, [pathname])

  const close = () => dialogRef.current?.close()
  // The popup hands focus and page scrolling back when its close event fires,
  // which comes after close() returns, so the booking opens only after that.
  const book = () => {
    dialogRef.current?.addEventListener('close', () => openFestiveBooking(), { once: true })
    close()
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="festive-popup-title" aria-describedby="festive-popup-description"
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-[24px] border-0 bg-[#f8faef] p-0 font-dm-sans text-green-deep shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="relative grid sm:grid-cols-[0.85fr_1fr]">
        <button type="button" autoFocus onClick={close} aria-label="Close festive offer" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-green-deep/15 bg-white text-2xl text-green-deep shadow-sm transition hover:bg-[#e3edc6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-mid">×</button>
        <div className="hidden items-center bg-[#edf2de] sm:flex">
          <Image src={festiveOffer.image} alt="FXMed festive Health-Hamper wellness gift box" width={1080} height={1350} sizes="340px" className="h-auto w-full" />
        </div>
        <div className="p-7 pt-16 sm:p-8 sm:pt-16">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-green-mid">A festive gift of care</p>
          <h2 id="festive-popup-title" className="mt-3 font-dm-sans text-3xl font-bold leading-[1.15] tracking-tight">Give something<br />that matters.<br /><span className="text-green-mid">Give health.</span></h2>
          <p id="festive-popup-description" className="mt-4 text-sm leading-relaxed text-text-mid">Celebrate the people you value with a health and wellness package, delivered with thoughtfulness.</p>
          <div className="mt-5 flex items-center gap-4">
            <Image src={festiveOffer.image} alt="Festive wellness gift hamper" width={80} height={100} sizes="80px" className="rounded-lg sm:hidden" />
            <div className="flex-1 space-y-2">
              {wellnessPackages.map((pkg) => (
                <div key={pkg.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"><span>{pkg.name}</span><strong>{pkg.price}</strong></div>
              ))}
            </div>
          </div>
          <button type="button" onClick={book} aria-haspopup="dialog" className="primary mt-6 w-full py-3.5">Book now</button>
          <Link href={`/#${festiveOffer.sectionId}`} onClick={close} className="secondary mt-3 w-full py-3">Explore the packages</Link>
          <a href={festiveBookingUrl()} onClick={close} target="_blank" rel="noopener noreferrer" className="mx-auto mt-4 block w-fit rounded px-3 py-2 text-sm text-text-mid underline underline-offset-4 hover:text-green-deep">Enquire on WhatsApp</a>
        </div>
      </div>
    </dialog>
  )
}
