'use client'

import Image from 'next/image'

export default function CorporateWellness() {
  return (
    <section id="corporate-wellness" className="bg-[#FCFFF0] py-[90px] px-[5%]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content - Image */}
          <div className="order-first lg:order-first">
            <div className="relative rounded-[20px] overflow-hidden shadow-2xl min-h-[600px]">
              <Image
                src="/diverse-business-team-meeting-office-hallway.jpg"
                alt="Diverse business team in office hallway"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-deep/20 to-transparent"></div>
            </div>
          </div>

          {/* Right Content */}
          <div className="order-first lg:order-last">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Corporate Wellness
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Invest in your<br/>team's health
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] mb-8">
              From executive health checks to full on-site wellness pop-ups, FXMed brings enterprise-grade healthcare to your workforce. Our corporate packages include routine screening, specialist access, coaching, and digital health reports.
            </p>

            {/* Pricing Options */}
            <div className="space-y-4">
              <div className="bg-white rounded-[16px] p-6 border border-green-deep/8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">NGO & Community Outreach</h3>
                    <p className="font-dm-sans text-text-mid text-[0.9rem]">Community health programs</p>
                  </div>
                  <div className="text-right">
                    <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">from ₦7,000</div>
                    <div className="font-dm-sans text-text-mid text-[0.85rem]">per person</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[16px] p-6 border border-green-deep/8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Executive On-Site Clinics</h3>
                    <p className="font-dm-sans text-text-mid text-[0.9rem]">Corporate health screening</p>
                  </div>
                  <div className="text-right">
                    <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">from ₦60,000</div>
                    <div className="font-dm-sans text-text-mid text-[0.85rem]">per person</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[16px] p-6 border border-green-deep/8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Virtual Coaching</h3>
                    <p className="font-dm-sans text-text-mid text-[0.9rem]">Remote wellness sessions</p>
                  </div>
                  <div className="text-right">
                    <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">from ₦10,000</div>
                    <div className="font-dm-sans text-text-mid text-[0.85rem]">per session</div>
                  </div>
                </div>
              </div>

              <a href="/#contact" className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block w-full text-center mt-6">
                Contact for Corporate Plans →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
