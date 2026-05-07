'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import { useState } from 'react'

export default function ThyroidRecovery() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-52 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Thyroid Recovery
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Dig deep and uncover the underlying root cause of thyroid symptoms.
          </p>
          <button 
            onClick={() => setShowAppointmentModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 px-[5%]">
        <div className="max-w-4xl mx-auto">
          
          {/* Introduction */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Get back control of your health.
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Do doctors say: "TSH is normal and lab tests are normal too..." But, nothing feels normal.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              A quick five-minute visit and the standard TSH test won't cut it. That's why so many still 
              have symptoms even with "normal" labs and even while on medication.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              There is hope and there are answers. The key is to find the WHY. Dig deep and uncover the 
              underlying, root cause of thyroid symptoms. Once that happens everything shifts.
              A healthier, more energetic, glowing, stronger you is waiting right around the corner!
            </p>
          </div>

          {/* Program Details */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Join the Nutri-Shift<sup>TM</sup> Thyroid Recovery Program
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Thyroid hormone impacts EVERY cell in the body. It takes time to figure out what's working, 
              what's not, where the disconnects are and what the underlying cause of EACH symptom really is.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Here at WITS Functional Medicine, we help people with chronic complex diseases slow down 
              and reverse the progression of their symptoms using science based simple lifestyle and dietary 
              interventions. Our practice helps complicated and unresolved thyroid issues.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              We work very closely with patients to develop a custom plan of care that resolves symptoms 
              and regains health, utilizing the most cutting-edge functional medicine and functional 
              nutrition protocols.
            </p>
          </div>

          {/* What You'll Receive */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              So, what is the Nutri-Shift Thyroid Recovery program all about?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">1</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Comprehensive Thyroid Testing
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Advanced thyroid panel including TSH, Free T3, Free T4, Reverse T3, and thyroid antibodies.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">2</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Root Cause Analysis
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Identify underlying factors affecting thyroid function including gut health, stress, and nutrient deficiencies.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">3</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Personalized Nutrition Plan
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Customized meal plans and recipes designed to support thyroid function and overall wellness.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">4</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Targeted Supplementation
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Medical-grade supplements to support thyroid hormone production and conversion.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">5</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Lifestyle Optimization
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Stress management, sleep optimization, and exercise recommendations for thyroid health.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">6</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Ongoing Monitoring
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Regular follow-ups and adjustments to ensure optimal thyroid function and symptom resolution.
                </p>
              </div>
            </div>
          </div>

          {/* Program Features */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              Program Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Focus on You</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  This program is unlike any others. Your thyroid health is the foundation for optimal 
                  metabolism and overall wellness.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Result Driven</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  We have laid out the foundations for you to live a symptom-free life. 
                  Without the hassle. No hassle, just results.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Get the Best</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  We take a deep dive into your thyroid health using advanced testing and cutting-edge 
                  therapeutic foods and botanicals to enhance thyroid function.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">No Prescription Drugs</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  There are absolutely no prescription drugs with side effects. You will make life changing 
                  adjustments to your food choices, eliminate stress and improve your sleep.
                </p>
              </div>
            </div>
          </div>

          {/* Symptoms Addressed */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              Common Thyroid Symptoms We Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Fatigue and low energy</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Weight gain or difficulty losing weight</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Hair loss</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Cold intolerance</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Brain fog and memory issues</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Depression and anxiety</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Constipation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Dry skin and brittle nails</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gold rounded-full"></div>
                <span className="font-dm-sans text-text-mid">Muscle weakness and joint pain</span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-2xl p-12 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-6">
              Ready to Recover Your Thyroid Health?
            </h2>
            <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards optimal thyroid function and renewed vitality today.
            </p>
            <button 
              onClick={() => setShowAppointmentModal(true)}
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
            >
              Book Consultation
            </button>
          </div>
        </div>
      </section>

      <Footer />
      
      {showAppointmentModal && (
        <AppointmentModal isOpen={showAppointmentModal} onClose={() => setShowAppointmentModal(false)} />
      )}
    </main>
  )
}
