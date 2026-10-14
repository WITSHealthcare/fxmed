'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { festiveOffer } from '@/lib/festive-offer'

const alt = 'FXMed festive Health-Hamper gift box with wellness gifts and green and gold ribbons'

export default function FestiveFlyer() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const open = () => {
    dialogRef.current?.showModal()
    document.body.style.overflow = 'hidden'
  }
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog" aria-label="View the Health-Hamper flyer full size"
        className="group relative mx-auto block w-full max-w-[470px] cursor-zoom-in overflow-hidden rounded-[28px] border border-white shadow-[0_20px_60px_rgba(26,61,46,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-mid">
        <Image src={festiveOffer.image} alt={alt} width={1080} height={1350} sizes="(max-width: 640px) 90vw, 470px" className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]" />
        <span aria-hidden="true" className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-green-deep shadow-md transition group-hover:bg-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </span>
      </button>
      <dialog ref={dialogRef} aria-label="Health-Hamper flyer"
        onClose={() => { document.body.style.overflow = '' }}
        onClick={(event) => { if (event.target === event.currentTarget) close() }}
        className="fixed inset-0 m-auto h-fit max-h-none w-fit max-w-none overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm">
        <button type="button" autoFocus onClick={close} aria-label="Close flyer" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl text-green-deep shadow-md transition hover:bg-[#e3edc6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">×</button>
        <Image src={festiveOffer.image} alt={alt} width={1080} height={1350} sizes="(max-width: 640px) 100vw, 75vh" className="h-auto max-h-[92dvh] w-auto max-w-[calc(100vw_-_2rem)] rounded-2xl" />
      </dialog>
    </>
  )
}
