'use client'

import { useState } from 'react'
import Image from 'next/image'
import MaternalWellnessModal, { useMaternalWellnessModal } from './MaternalWellnessModal'
import MaternalBookingModal from './MaternalBookingModal'

const programs = [
  {
    icon: <Image src="/healthicons_thyroid-24px.svg" alt="" width={32} height={32} />,
    title: "Thyroid Recovery",
    description: "A comprehensive protocol for hyperthyroidism, Hashimoto's, and thyroid imbalances using functional testing and targeted nutrition to restore thyroid function naturally.",
    link: "/programs/thyroid-recovery"
  },
  {
    icon: <Image src="/lets-icons_chemistry.svg" alt="" width={32} height={32} />,
    title: "Hormone Balance",
    description: "Hormonal chaos affects everything â mood, weight, sleep, and fertility. We identify your unique hormonal patterns and create a personalized rebalancing protocol.",
    link: "/programs/hormone-balance"
  },
  {
    icon: <Image src="/healthicons_intestine.svg" alt="" width={32} height={32} />,
    title: "Gut Repair",
    description: "From bloating to IBS, leaky gut to microbiome disruption â our Gut Repair program uses advanced stool analysis and targeted nutrition to heal your digestive system.",
    link: "/programs/gut-repair"
  },
  {
    icon: <Image src="/healthicons_intestine.svg" alt="" width={32} height={32} />,
    title: "Gut Analysis",
    description: "Not sure what's causing your gut issues? Our deep diagnostic gut analysis identifies pathogens, dysbiosis, and inflammation markers so we can build the right protocol.",
    link: "/functional-health-analysis"
  },
  {
    icon: <Image src="/adrenal_icon.svg?v=3" alt="Adrenal" width={32} height={32} />,
    title: "Adrenal Reset",
    description: "Burnout, chronic stress, and adrenal fatigue are real. Our Adrenal Reset program restores your cortisol rhythm, energy reserves, and resilience through personalized protocols.",
    link: "/programs/adrenal-reset"
  },
  {
    icon: <Image src="/healthicons_autoimmune-disease-outline-24px.svg" alt="" width={32} height={32} />,
    title: "Immune Support",
    description: "Frequent infections, autoimmune flares, or just chronically run-down? Our Immune Support program identifies and addresses the root causes of immune dysregulation.",
    link: "/programs/immune-support"
  }
]

export default function Programs() {
  const { isOpen, selectedPackage, openModal, closeModal } = useMaternalWellnessModal()
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  return (
    <>
      {/* Programs Section */}
      <section id="programs" className="bg-[#FCFFF0] py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Our Programs
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Personalized Health Programs
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-[560px] mx-auto">
              Evidence-based programs designed to address your specific health concerns 
              and help you achieve optimal wellness.
            </p>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-13">
            {programs.map((program, index) => (
              <div 
                key={index}
                className="bg-white rounded-[20px] p-9 px-7 border border-green-deep/8 transition-all duration-[0.35s] relative overflow-hidden hover:transform hover:translate-y-[-6px] hover:shadow-custom-hover group"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-mid to-green-light transform scale-x-0 group-hover:scale-x-100 transition-transform duration-[0.35s] origin-left"></div>
                <div className="text-[2.2rem] mb-[18px]">{program.icon}</div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.3rem] mb-3">
                  {program.title}
                </h3>
                <p className="font-dm-sans text-text-mid text-[0.92rem] leading-[1.65] mb-5">
                  {program.description}
                </p>
                <a 
                  href={program.link}
                  className="font-dm-sans text-green-mid font-semibold text-[0.88rem] no-underline flex items-center gap-1.5 transition-all hover:gap-3"
                >
                  Learn more
                  <span>→</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maternal Wellness Section */}
      <section id="maternal-wellness" className="bg-[#FCFFF0] py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content - Details */}
            <div>
              <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
                Maternal Wellness
              </div>
              <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
                Complete care for<br/>your motherhood journey
              </h2>
              <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] mb-8">
                From pre-conception planning through postnatal recovery, our Pregnancy Wellness Packages deliver continuous, personalized support at every step — all from the comfort of your home.
              </p>

              {/* Packages */}
              <div className="space-y-4">
                <div 
                  className="bg-white rounded-[16px] p-6 border border-green-deep/8 cursor-pointer transition-all hover:shadow-lg hover:border-green-mid"
                  onClick={() => openModal(0)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Pre-Conception Package</h3>
                      <p className="font-dm-sans text-text-mid text-[0.9rem]">3 months</p>
                    </div>
                    <div className="text-right">
                      <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">₦295,000</div>
                      <div className="font-dm-sans text-text-mid text-[0.85rem]">$197</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-white rounded-[16px] p-6 border border-green-deep/8 cursor-pointer transition-all hover:shadow-lg hover:border-green-mid"
                  onClick={() => openModal(1)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Ante-Natal Package</h3>
                      <p className="font-dm-sans text-text-mid text-[0.9rem]">per trimester</p>
                    </div>
                    <div className="text-right">
                      <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">₦740,000</div>
                      <div className="font-dm-sans text-text-mid text-[0.85rem]">$527</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-white rounded-[16px] p-6 border border-green-deep/8 cursor-pointer transition-all hover:shadow-lg hover:border-green-mid"
                  onClick={() => openModal(2)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Post-Natal Recovery</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">₦395,000</div>
                      <div className="font-dm-sans text-text-mid text-[0.85rem]">$271</div>
                    </div>
                  </div>
                </div>

                <div 
                  className="bg-white rounded-[16px] p-6 border border-green-deep/8 cursor-pointer transition-all hover:shadow-lg hover:border-green-mid"
                  onClick={() => openModal(3)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-1">Fertility Breakthrough Program</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-dm-sans font-bold text-green-mid text-[1.2rem]">₦3,500,000</div>
                      <div className="font-dm-sans text-text-mid text-[0.85rem]">$2,450</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button onClick={() => setIsBookingOpen(true)} className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block text-center">
                  Book Maternal Consultation →
                </button>
                <a href="/maternal-wellness" className="font-dm-sans bg-transparent text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline border border-green-deep/40 transition-all hover:border-green-deep hover:bg-green-deep/8 inline-block text-center">
                  Learn More About Maternal Wellness
                </a>
              </div>
              </div>
            </div>

            {/* Right Content - Image */}
            <div className="order-first lg:order-last">
              <div className="relative rounded-[20px] overflow-hidden shadow-2xl min-h-[700px]">
                <Image
                  src="/black-pregnant-women-posing.jpg"
                  alt="Happy pregnant black woman at home"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-deep/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Maternal Wellness Modal */}
      <MaternalWellnessModal
        isOpen={isOpen}
        onClose={closeModal}
        selectedPackage={selectedPackage}
      />

      {/* Maternal Booking Modal */}
      <MaternalBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
    </>
  )
}
