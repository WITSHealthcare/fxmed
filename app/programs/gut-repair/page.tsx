'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import { useState } from 'react'

export default function GutRepair() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="font-dm-sans font-bold text-4xl md:text-5xl mb-6">
            Gut Repair
          </h1>
          <p className="font-dm-sans text-xl md:text-2xl mb-8 text-cream/90">
            Drill down to the basics of healthy nutrition for healing your body and repairing a leaky gut.
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
              Fad diets don't fix leaky guts!
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Did you know 70-75% of your immune system lives in your gut? Healing a leaky gut 
              requires a lifestyle, not a quick fix.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              With this program, you will learn how to reverse chronic symptoms using nutrient-packed 
              foods chock full of vitamins, minerals, healthy fats, proteins and carbs with low glycemic index.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              Get all the tools you need to succeed for the long term and even beyond the length of 
              this program. A healthier, more energetic, glowing, stronger you, is waiting right around the corner!
            </p>
          </div>

          {/* Program Details */}
          <div className="mb-16">
            <h2 className="font-dm-sans font-bold text-3xl text-green-deep mb-6">
              Join the Nutri-Shift<sup>TM</sup> Gut Repair Program
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Wouldn't you love to start seeing results, feeling better, losing the extra pounds, being able 
              to fit in your favorite skinny jeans, and have a healthy digestive system?
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-8">
              Our Gut Repair Program will help you gain an understanding of your digestive system and how 
              it affects other parts of your body. You will gain insights on how to eat, what to eat and how 
              to regulate digestion and eliminate toxins for optimal health and immunity.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              You will also learn how to become an advocate for yourself when you go to the doctor's office. 
              There's nothing more effective than knowledge in the journey to a healthy life. You will also 
              find some very interesting information on using certain herbs and botanicals to stimulate digestion 
              and bind toxins in your gut for easy elimination.
            </p>
          </div>

          {/* What You'll Receive */}
          <div className="mb-16">
            <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-8">
              So, what is the Nutri-Shift GUT REPAIR program all about?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">1</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Nutrition Plans
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Weekly guide, Recipes, Meal plan and Shopping list to support your gut healing journey.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">2</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Advanced Testing
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Zonulin profile, food inflammation test (132 foods) to identify specific triggers.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">3</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Detox Lifestyle Guide
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Detox lifestyle guide, daily journal and much more to support your healing process.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">4</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Functional Health Analysis
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Comprehensive analysis of your health markers and personalized recommendations.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">5</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  All-Natural Supplements
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Get access to all-natural medical-grade food supplements free from GMO's, fillers and binders.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-deep/10">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-4">
                  <span className="text-green-deep font-bold text-xl">6</span>
                </div>
                <h4 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  Mindset Makeover
                </h4>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  Improve your relationship with food and develop healthy eating habits for life.
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
                  This program is unlike any others. Your gut health is the foundation for optimal health 
                  and defense against chronic diseases.
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
                  We have laid out the foundations for you to live a chronic disease-free life. 
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
                  We take a deep dive into your hormonal system starting from your adrenals, to your 
                  thyroid and sex hormones using advanced testing and cutting-edge therapeutic foods.
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
              Ready to Heal Your Gut?
            </h2>
            <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards optimal digestive health and overall wellness today.
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
