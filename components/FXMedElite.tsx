'use client'

import Link from 'next/link'

export default function FXMedElite() {
  return (
    <section className="relative py-[90px] px-[5%] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-cover bg-center brightness-[0.6]"
             style={{backgroundImage: "url('/fxmed-van/IMG_0300.jpeg')"}}>
        </div>

        {/* Black Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 text-gold-light px-[18px] py-2 rounded-[30px] text-[0.82rem] font-medium tracking-[0.08em] uppercase mb-4">
              <span className="text-[0.5rem] animate-pulse">●</span>
              PREMIUM HEALTHCARE · CONCIERGE CARE
            </div>
            <h2 className="font-dm-sans font-extrabold text-white text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              <img 
                src="/FXMed Elite White.svg" 
                alt="FXMed Elite" 
                className="h-[clamp(2.5rem,5vw,4rem)] w-auto inline-block"
              /><br/>Concierge Care for Distinguished Clients
            </h2>
            <p className="font-dm-sans text-white/90 text-[1.05rem] leading-[1.7] mb-6">
              FXMed Elite is a premium healthcare service crafted for professionals, dignitaries, and distinguished seniors who value privacy, precision, and lifestyle-integrated care.
            </p>
            <p className="font-dm-sans text-white/90 text-[1.05rem] leading-[1.7] mb-8">
              Experience world-class chronic and geriatric care delivered directly to your home, office, or estate via our fully equipped luxury mobile health units and advanced telemedicine platforms.
            </p>
            <Link href="/elite">
              <button className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg hover:bg-gold-light transition-all transform hover:scale-105 shadow-xl">
                Learn More
              </button>
            </Link>
          </div>

          {/* Right Content - Image or Visual */}
          <div className="relative">
            <div className="bg-white rounded-[20px] p-8 border border-green-deep/10 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-[1.3rem] flex-shrink-0">
                    <img src="/Spade.svg" alt="Spade" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-2">Discreet & Exclusive Access</h3>
                    <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">Healthcare beyond the public eye, designed for your lifestyle</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-[1.3rem] flex-shrink-0">
                    <img src="/DeviceMobile.svg" alt="Device" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-2">24/7 Virtual Concierge</h3>
                    <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">Direct access to specialists, coaches, and your health team</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center text-[1.3rem] flex-shrink-0">
                    <img src="/Ambulance 2.svg" alt="Ambulance" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-2">At-Home Mini-Clinic</h3>
                    <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">State-of-the-art mobile van visits for diagnostics and checkups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
