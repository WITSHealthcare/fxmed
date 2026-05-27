'use client'

import Image from 'next/image'

export default function WhyFXMed() {
  const benefits = [
    {
      icon: <Image src="/House.svg" alt="House" width={32} height={32} />,
      title: "We Come to You",
      description: "House calls, workplace visits, and mobile diagnostics. Quality care without the waiting room."
    },
    {
      icon: <Image src="/Dna.svg" alt="DNA" width={32} height={32} />,
      title: "Root Cause Medicine",
      description: "We use advanced biomarker testing and in-depth health history to find what's really driving your symptoms."
    },
    {
      icon: <Image src="/DeviceMobileCamera.svg" alt="Device" width={32} height={32} />,
      title: "Always Connected",
      description: "The WellnessWits app keeps you connected to your care team 24/7, with tracking and guidance at your fingertips."
    },
    {
      icon: <Image src="/User.svg" alt="User" width={32} height={32} />,
      title: "Truly Personalized",
      description: "No cookie-cutter plans. Every protocol — nutrition, lifestyle, supplements — is built specifically for you."
    }
  ]

  return (
    <section id="about" className="bg-white py-[90px] px-[5%]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-left mb-16">
          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
            Why FXMed
          </div>
          <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4 tracking-tight">
            Medicine that sees <span className="italic bg-[#CADE68] px-2 rounded">you,</span><br/>not just your symptoms
          </h2>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start mt-15">
          {/* Benefits Cards */}
          <div className="flex flex-col gap-5">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex gap-5 items-start bg-[#FCFFF0] rounded-[16px] p-6 border border-green-deep/7 transition-all hover:translate-x-1.5 hover:border-green-light hover:shadow-custom"
              >
                <div className="w-12 h-12 rounded-[12px] bg-green-deep flex items-center justify-center text-[1.3rem] flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep text-[1rem] mb-1.5">
                    {benefit.title}
                  </h3>
                  <p className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Dr. Kike Card */}
          <div className="rounded-[24px] overflow-hidden relative shadow-custom-hover">
            <div className="relative w-full h-[600px]">
              <Image
                src="/Team/Dr Kike Oduba.jpg"
                alt="Dr. Kike Oduba"
                fill
                className="object-cover object-center"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(15,36,25,0.95)] via-[rgba(15,36,25,0.6)] to-transparent p-9">
              <blockquote className="font-dm-sans italic text-cream text-[1.05rem] leading-[1.65] mb-4">
                "Good medicine is a patient-doctor partnership, not a doctor-patient dictatorship. I created FXMed so no one has to feel unheard by their healthcare provider again."
              </blockquote>
              <cite className="text-gold text-[0.85rem] font-medium not-italic">
                Dr. Kike Oduba, MBBS, MPH, CIC · Founder, WITS Functional Medicine
              </cite>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
