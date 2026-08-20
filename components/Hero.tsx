'use client'

import { useState } from 'react'
import Image from 'next/image'
import AppointmentModal from '@/components/AppointmentModal'

export default function Hero() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center px-[5%] pt-[140px] pb-[60px] md:pt-[180px]">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center brightness-[0.35]" 
           style={{backgroundImage: "url('/Hero Background.jpeg')"}}>
      </div>
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.92)] via-[rgba(26,61,46,0.7)] to-[rgba(30,74,53,0.4)]"></div>
      
      {/* Glassmorphism Icons */}
      <div className="absolute top-[480px] left-[20%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float hidden md:flex">
        <Image src="/Sparkle.svg" alt="" width={32} height={32} />
      </div>
      
      <div className="absolute top-40 right-[35%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float-delayed hidden md:flex">
        <Image src="/Ambulance.svg" alt="" width={32} height={32} />
      </div>
      
      <div className="absolute bottom-40 left-[30%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float hidden md:flex">
        <Image src="/BowlFood.svg" alt="" width={32} height={32} />
      </div>
      
      <div className="absolute top-60 left-1/4 w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float-delayed hidden md:flex">
        <Image src="/Hospital.svg" alt="" width={32} height={32} />
      </div>
      
      <div className="absolute top-[640px] right-[32%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float hidden md:flex">
        <Image src="/OrangeSlice.svg" alt="" width={32} height={32} />
      </div>
      
      <div className="absolute top-[45%] right-[20%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center animate-float-delayed hidden md:flex">
        <Image src="/Avocado.svg" alt="" width={32} height={32} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[900px] text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 text-gold-light px-[18px] py-2 rounded-[30px] text-[0.82rem] font-medium tracking-[0.08em] uppercase mb-7 animate-fade-in-up">
          <span className="text-[0.5rem] animate-pulse">●</span>
          FUNCTIONAL MEDICINE · WE COME TO YOU
        </div>
        
        {/* Title */}
        <h1 className="font-dm-sans font-bold text-white leading-[1.08] mb-6 animate-fade-in-up text-[clamp(2.8rem,6vw,5rem)] tracking-tight">
          Your <span className="italic text-[#CADE68]">Wellness</span> Begins<br/>at Your Door
        </h1>
        
        {/* Description */}
        <p className="font-dm-sans text-cream/80 text-[1.15rem] leading-[1.7] mb-10 animate-fade-in-up">
          FXMed treats the root cause — not just the symptoms. We bring personalized, data-driven healthcare directly to your home or workplace, so you never have to wait in another clinic again.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col gap-4 items-center animate-fade-in-up max-w-sm mx-auto">
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-6 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block text-center w-full whitespace-nowrap"
          >
            Book an Appointment
          </button>
          <a href="/#programs" className="font-dm-sans bg-transparent text-cream px-9 py-[15px] rounded-[50px] font-medium text-[1rem] no-underline border border-cream/40 transition-all hover:border-cream hover:bg-cream/8 inline-block text-center w-full">
            View Programs
          </a>
        </div>
        
        {/* Stats */}
        <div className="flex gap-10 justify-center mt-20 animate-fade-in-up">
          <div className="text-center">
            <div className="font-dm-sans text-4xl text-gold font-bold">6+</div>
            <div className="font-dm-sans text-[0.82rem] text-cream/55 mt-0.5">Wellness Programs</div>
          </div>
          <div className="text-center">
            <div className="font-dm-sans text-4xl text-gold font-bold">3 in 5</div>
            <div className="font-dm-sans text-[0.82rem] text-cream/55 mt-0.5">Deaths Are Preventable</div>
          </div>
          <div className="text-center">
            <div className="font-dm-sans text-4xl text-gold font-bold">2</div>
            <div className="font-dm-sans text-[0.82rem] text-cream/55 mt-0.5">Countries Served</div>
          </div>
        </div>
      </div>
      
      {/* Appointment Modal */}
      <AppointmentModal 
        isOpen={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)} 
      />
    </section>
  )
}
