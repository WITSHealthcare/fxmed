'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import { useState } from 'react'

export default function AdrenalReset() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Adrenal Reset
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Learn how to increase energy, reduce stress, improve sleep and shift your mindset.
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
              Say goodbye to chronic fatigue for good
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Did you know healthy adrenals are the key to hormonal balance and immune function? 
              With this program, you will get a specific week-by-week strategy to help stabilize your body, 
              regain your energy and transform you into the best version of yourself.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              This is the beginning of your journey to optimal health. We have laid out the foundations 
              for you to live the best life you can live. Without the hassle. Just results.
              A healthier, more energetic, glowing, stronger you is waiting right around the corner!
            </p>
          </div>

          {/* Program Details */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Join the Nutri-Shift<sup>TM</sup> Adrenal Reset Program
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              This is a life-changing journey where you will discover how to listen to your body and 
              uncover ways to heal your adrenals and reverse burn out of you hypothamo-pitiutary axis (HPA).
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              We take a deep dive into the root causes of your adrenal issues starting from your sleep routine, 
              hormone dysregulation, stress, and food intolerances using advanced testing and cutting-edge 
              therapeutic foods and botanicals to enhance your performance and energy levels.
            </p>
            <div className="bg-gold/20 border-l-4 border-gold p-6 rounded-lg">
              <p className="font-dm-sans text-lg text-green-deep font-semibold">
                PLUS you get 1 BONUS 30-Minute Strategy Sessions with our Functional Medicine expert- Dr Kike, 
                when you sign up now.
              </p>
            </div>
          </div>

          {/* What You'll Receive */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              You'll receive all these life-changing goodies as part of your program:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">1</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Adrenal Stress Reversal Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Adrenal stress reversal guide loaded with all the info you need to begin laying the 
                  foundations for a healthier you, filled with energy and longevity.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">2</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Comprehensive Immune Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive guide packed with life-changing information about adrenal health, 
                  understanding how your gut health may be contributing to your symptoms and how to 
                  find remission using targeted nutraceuticals and therapeutic foods.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">3</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Recipe Guides
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  1 Month Meal plan with recipes included and grocery list. Get a taste of healthy living, 
                  one delicious bite at a time. Each recipe will taste irresistibly good.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">4</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Food Diary
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Track your progress and identify patterns with our comprehensive food diary system.
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
                  This is a life-changing journey where you will discover how to listen to your body 
                  and uncover ways to heal your adrenals and reverse burn out.
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
                  This is the beginning of your journey to optimal health. We have laid out the foundations 
                  for you to live the best life you can live. No hassle, just results.
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
                  We take a deep dive into the root causes of your adrenal issues using advanced testing 
                  and cutting-edge therapeutic foods and botanicals.
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

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-2xl p-12 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-6">
              Ready to Reset Your Adrenals?
            </h2>
            <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards renewed energy and optimal health today.
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
