'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import { useState } from 'react'

export default function ImmuneSupport() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Immune Support
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Improve your immune system while increasing your micronutrient levels.
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
              Eating to support your immunity
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Get access to our immune support nutrition guide and 24 recipes, a comprehensive guide 
              to building immune resilience for all ages.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              We encourage you to download and take it shopping with you on your next trip to the 
              grocery store and remember every time you eat is an opportunity to heal.
            </p>
            <div className="bg-gold/20 border-l-4 border-gold p-6 rounded-lg">
              <p className="font-dm-sans text-xl text-green-deep font italic">
                "Let food be your medicine, and your medicine be food" - Hippocrates
              </p>
            </div>
          </div>

          {/* Program Details */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Join Nutri-Shift<sup>TM</sup> Immune Support Program
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Looking to optimize your health and build resistance against infectious diseases? 
              This package is exactly what you have been waiting for.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              Our comprehensive immune support program is designed to strengthen your body's natural 
              defense mechanisms through targeted nutrition, lifestyle modifications, and evidence-based 
              supplementation strategies.
            </p>
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
                  Immune Nutrition Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive guide packed with life-changing information about immune-boosting foods 
                  and nutrients.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">2</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  24 Immune-Boosting Recipes
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Delicious, easy-to-make recipes specifically designed to support immune function.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">3</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Micronutrient Assessment
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive testing to identify key vitamin and mineral deficiencies affecting immunity.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">4</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Personalized Supplement Plan
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Targeted supplementation protocol based on your specific needs and deficiencies.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">5</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Lifestyle Optimization Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Sleep, stress management, and exercise strategies to enhance immune function.
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
                  Regular check-ins and adjustments to ensure optimal immune system function.
                </p>
              </div>
            </div>
          </div>

          {/* Key Immune Nutrients */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              Key Immune-Boosting Nutrients We Focus On
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">C</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Vitamin C</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Powerful antioxidant that supports various cellular functions of the immune system.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">D</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Vitamin D</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Modulates innate and adaptive immune responses and deficiency is associated with increased susceptibility to infection.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">Z</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Zinc</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Essential for immune cell development and communication, plays a role in inflammatory response.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">A</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Vitamin A</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Enhances immune function and helps maintain the integrity of mucosal surfaces.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">E</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Vitamin E</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Powerful antioxidant that helps protect cell membranes from damage and supports immune function.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-lg">Se</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">Selenium</h4>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  Plays a crucial role in antioxidant defense and thyroid hormone metabolism, both important for immune health.
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
                  This program is personalized to your specific immune needs and health goals.
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
                  We have laid out the foundations for you to build strong immune resilience. 
                  No hassle, just results.
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
                  We take a deep dive into your immune system using advanced testing and cutting-edge 
                  nutritional protocols.
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
                  adjustments using natural approaches.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              Benefits of Strong Immune Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-green-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Reduced Infections</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Fewer colds, flu, and other infections throughout the year.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-green-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Faster Recovery</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Quicker recovery times when you do get sick.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-green-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">More Energy</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Better overall energy levels and vitality.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-green-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">Better Overall Health</h4>
                  <p className="font-dm-sans text-text-mid leading-[1.6]">
                    Improved resistance to chronic diseases and better overall wellness.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-2xl p-12 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-6">
              Ready to Boost Your Immunity?
            </h2>
            <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards optimal immune health and disease resistance today.
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
