'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import { useState } from 'react'

export default function HormoneBalance() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Hormone Balance
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Rebalance your hormones with this 6 month program focused on results
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
              Stabilize your body and regain your energy
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Wouldn't you love to start seeing results, feeling better, losing the extra pounds, 
              being able to fit in your favorite skinny jeans, and have glowing skin?
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              There are tons of people out there right now facing the overwhelming task of getting 
              back their health: taking pills, drinking smoothies, following the latest fad diet. 
              And in the end, they are burnt out. You don't have to be another one of those.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              We've got your back! Let's give you the tools you need to retune your hormones!
            </p>
          </div>

          {/* Program Details */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Join the Nutri-Shift<sup>TM</sup> Hormone Balance Program
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              This is a life-changing journey where you will discover how to listen to your body 
              and bring about hormonal harmony back into your life. Even your partner will see the difference in you.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Loaded with all the info you need to begin and lay the foundations for a healthier you, 
              filled with energy and longevity. Six months packed with life-changing information about 
              hormonal balance, from understanding how they work in your body, to your menstrual cycles 
              and even increasing your libido. You will be with me six months working this program out!
            </p>
            <div className="bg-gold/20 border-l-4 border-gold p-6 rounded-lg">
              <p className="font-dm-sans text-lg text-green-deep font-semibold">
                PLUS you get 3 BONUS 30-Minute Strategy Sessions with our Functional Medicine expert- Dr Kike, 
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
                  Hormonal Health Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive guide packed with life-changing information about hormonal balance, 
                  from understanding how they work in your body to your menstrual cycles.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">2</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Personalized Nutrition Plans
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Customized meal plans and recipes designed to support hormonal balance and overall wellness.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">3</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Advanced Hormone Testing
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive hormone panel testing to identify imbalances and create targeted treatment plans.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">4</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Lifestyle Optimization
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Stress management techniques, sleep optimization, and exercise recommendations for hormonal health.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">5</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Natural Supplements
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Medical-grade supplements to support hormonal balance and overall wellness.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">6</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Ongoing Support
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Six months of continuous support and guidance to ensure your success and optimal results.
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
                  and bring about hormonal harmony back into your life.
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
                  We take a deep dive into your hormonal system using advanced testing and cutting-edge 
                  therapeutic foods and botanicals to enhance your daily intake.
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

          {/* Timeline */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              6-Month Transformation Journey
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-deep font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Months 1-2: Foundation</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Establish baseline, comprehensive testing, and begin foundational dietary changes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-deep font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Months 3-4: Optimization</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Fine-tune nutrition, introduce targeted supplements, and implement lifestyle modifications.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-deep font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Months 5-6: Maintenance</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Solidify habits, ensure long-term success, and prepare for sustained hormonal balance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-2xl p-12 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-6">
              Ready to Balance Your Hormones?
            </h2>
            <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards hormonal harmony and optimal wellness today.
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
