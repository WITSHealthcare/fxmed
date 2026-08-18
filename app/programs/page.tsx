'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import JsonLd from '@/components/JsonLd'
import { createBreadcrumbJsonLd } from '@/lib/seo'


const breadcrumbJsonLd = createBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Programs', path: '/programs' }])

export default function Programs() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  const programs = [
    {
      title: "Adrenal Reset",
      description: "Learn how to increase energy, reduce stress, improve sleep and shift your mindset.",
      icon: "/adrenal_icon.svg?v=3",
      duration: "8-12 weeks",
      link: "/programs/adrenal-reset",
      features: ["Adrenal Stress Reversal Guide", "Comprehensive Immune Guide", "Recipe Guides", "Food Diary"],
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Gut Repair",
      description: "Drill down to the basics of healthy nutrition for healing your body and repairing a leaky gut.",
      icon: "/healthicons_intestine.svg",
      duration: "12 weeks",
      link: "/programs/gut-repair",
      features: ["Nutrition Plans", "Advanced Testing", "Detox Lifestyle Guide", "Natural Supplements"],
      color: "from-green-500 to-green-600"
    },
    {
      title: "Gut Analysis",
      description: "Not sure what's causing your gut issues? Our deep diagnostic gut analysis identifies pathogens, dysbiosis, and inflammation markers so we can build the right protocol.",
      icon: "/healthicons_intestine.svg",
      duration: "Diagnostic",
      link: "/functional-health-analysis",
      features: ["Comprehensive Stool Analysis", "Pathogen Detection", "Dysbiosis Markers", "Inflammation Assessment"],
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "Hormone Balance",
      description: "Rebalance your hormones with this 6 month program focused on results.",
      icon: "/lets-icons_chemistry.svg",
      duration: "6 months",
      link: "/programs/hormone-balance",
      features: ["Hormonal Health Guide", "Personalized Nutrition", "Advanced Testing", "Ongoing Support"],
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "Thyroid Recovery",
      description: "Dig deep and uncover the underlying root cause of thyroid symptoms.",
      icon: "/healthicons_thyroid-24px.svg",
      duration: "4-6 months",
      link: "/programs/thyroid-recovery",
      features: ["Comprehensive Testing", "Root Cause Analysis", "Personalized Nutrition", "Targeted Support"],
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Immune Support",
      description: "Improve your immune system while increasing your micronutrient levels.",
      icon: "/healthicons_autoimmune-disease-outline-24px.svg",
      duration: "8-12 weeks",
      link: "/programs/immune-support",
      features: ["Immune Nutrition Guide", "24 Recipes", "Micronutrient Assessment", "Lifestyle Guide"],
      color: "from-orange-500 to-orange-600"
    }
  ]

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <JsonLd data={breadcrumbJsonLd} />
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-52 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-cover bg-center brightness-[0.35]"
          style={{ backgroundImage: "url('/3d-medical-background-with-virus-cells-dna-strand.jpg')" }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.92)] via-[rgba(26,61,46,0.7)] to-[rgba(30,74,53,0.4)]"></div>
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
              <div
                key={index}
                className="bg-white rounded-[20px] p-9 px-7 border border-green-deep/8 transition-all duration-[0.35s] relative overflow-hidden hover:transform hover:translate-y-[-6px] hover:shadow-custom-hover group flex flex-col"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-mid to-green-light transform scale-x-0 group-hover:scale-x-100 transition-transform duration-[0.35s] origin-left"></div>
                <div className="mb-[18px]">
                  <Image src={program.icon} alt={program.title} width={32} height={32} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-dm-sans font-semibold text-green-deep text-[1.3rem]">
                    {program.title}
                  </h3>
                  <span className="text-sm font-medium text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                    {program.duration}
                  </span>
                </div>

                <p className="font-dm-sans text-text-mid text-[0.92rem] leading-[1.65] mb-5">
                  {program.description}
                </p>

                <div className="mb-5 flex-1">
                  <h4 className="font-dm-sans font-semibold text-green-deep text-[0.88rem] mb-3">What's Included:</h4>
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
                  className="font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.9rem] no-underline block text-center transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
                >
                  Learn More
                </Link>
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
              <div className="w-16 h-16 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-white" style={{
                  WebkitMask: 'url("/UserCheck.svg") center / contain no-repeat',
                  mask: 'url("/UserCheck.svg") center / contain no-repeat',
                }} />
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Focus on You</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Personalized programs tailored to your specific health needs and goals.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-white" style={{
                  WebkitMask: 'url("/SealCheck.svg") center / contain no-repeat',
                  mask: 'url("/SealCheck.svg") center / contain no-repeat',
                }} />
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Result Driven</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Evidence-based approaches that deliver real, measurable results.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-white" style={{
                  WebkitMask: 'url("/Sparkle.svg") center / contain no-repeat',
                  mask: 'url("/Sparkle.svg") center / contain no-repeat',
                }} />
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Get the Best</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Advanced testing and cutting-edge therapeutic protocols for optimal outcomes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-white" style={{
                  WebkitMask: 'url("/Plant.svg") center / contain no-repeat',
                  mask: 'url("/Plant.svg") center / contain no-repeat',
                }} />
              </div>
              <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-3">Natural Health</h3>
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
