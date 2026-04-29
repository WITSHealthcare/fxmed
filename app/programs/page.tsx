'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import Link from 'next/link'
import { useState } from 'react'

export default function Programs() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  const programs = [
    {
      title: "Adrenal Reset",
      description: "Learn how to increase energy, reduce stress, improve sleep and shift your mindset.",
      icon: " adrenal fatigue",
      duration: "8-12 weeks",
      link: "/programs/adrenal-reset",
      features: ["Adrenal Stress Reversal Guide", "Comprehensive Immune Guide", "Recipe Guides", "Food Diary"],
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Gut Repair",
      description: "Drill down to the basics of healthy nutrition for healing your body and repairing a leaky gut.",
      icon: " digestive health",
      duration: "12 weeks",
      link: "/programs/gut-repair",
      features: ["Nutrition Plans", "Advanced Testing", "Detox Lifestyle Guide", "Natural Supplements"],
      color: "from-green-500 to-green-600"
    },
    {
      title: "Hormone Balance",
      description: "Rebalance your hormones with this 6 month program focused on results.",
      icon: " hormonal harmony",
      duration: "6 months",
      link: "/programs/hormone-balance",
      features: ["Hormonal Health Guide", "Personalized Nutrition", "Advanced Testing", "Ongoing Support"],
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "Thyroid Recovery",
      description: "Dig deep and uncover the underlying root cause of thyroid symptoms.",
      icon: " thyroid health",
      duration: "4-6 months",
      link: "/programs/thyroid-recovery",
      features: ["Comprehensive Testing", "Root Cause Analysis", "Personalized Nutrition", "Targeted Support"],
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Immune Support",
      description: "Improve your immune system while increasing your micronutrient levels.",
      icon: " immune system",
      duration: "8-12 weeks",
      link: "/programs/immune-support",
      features: ["Immune Nutrition Guide", "24 Recipes", "Micronutrient Assessment", "Lifestyle Guide"],
      color: "from-orange-500 to-orange-600"
    }
  ]

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Nutri-Shift<sup>TM</sup> Programs
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Transform your health with our science-based functional medicine programs
          </p>
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Get Started Today
          </button>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-20 px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Choose Your Health Journey
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] max-w-3xl mx-auto">
              Each program is carefully designed to address specific health concerns using evidence-based 
              functional medicine approaches. No prescription drugs, just real food and lifestyle changes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className={`h-2 bg-gradient-to-r ${program.color}`}></div>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-dm-sans font-bold text-2xl text-green-deep">
                      {program.title}
                    </h3>
                    <span className="text-sm font-medium text-gold bg-gold/10 px-3 py-1 rounded-full">
                      {program.duration}
                    </span>
                  </div>
                  
                  <p className="font-dm-sans text-text-mid leading-[1.6] mb-6">
                    {program.description}
                  </p>

                  <div className="mb-6">
                    <h4 className="font-dm-sans font-semibold text-green-deep mb-3">What's Included:</h4>
                    <ul className="space-y-2">
                      {program.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="font-dm-sans text-sm text-text-mid">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link 
                    href={program.link}
                    className="block w-full text-center font-dm-sans bg-gradient-to-r from-green-deep to-green-mid text-white px-6 py-3 rounded-[50px] font-semibold transition-all hover:from-green-700 hover:to-green-600 hover:transform hover:translate-y-[-1px] hover:shadow-lg"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Features */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-dm-sans font-bold text-3xl text-green-deep text-center mb-16">
            Why Choose Our Programs?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Focus on You</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Personalized programs tailored to your specific health needs and goals.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Result Driven</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Evidence-based approaches that deliver real, measurable results.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Get the Best</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Advanced testing and cutting-edge therapeutic protocols for optimal outcomes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">No Prescription Drugs</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Natural approaches using food, lifestyle, and targeted supplements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-[5%]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
            Not Sure Which Program is Right for You?
          </h2>
          <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
            Schedule a consultation with our functional medicine experts to get personalized recommendations 
            based on your health concerns and goals.
          </p>
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Book Free Consultation
          </button>
        </div>
      </section>

      <Footer />
      
      {showAppointmentModal && (
        <AppointmentModal isOpen={showAppointmentModal} onClose={() => setShowAppointmentModal(false)} />
      )}
    </main>
  )
}
