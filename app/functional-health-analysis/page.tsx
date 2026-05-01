'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function FunctionalHealthAnalysis() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-deep via-green-mid to-gold py-40 px-[5%] overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('/team-young-nurses-learning-practice-from-doctor-expert-cabinet.jpg')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-deep/80 via-green-mid/70 to-gold/60"></div>
        <div className="relative max-w-7xl mx-auto mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            <div className="text-white">
              <div className="inline-block bg-white/20 backdrop-blur px-4 py-2 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-6">
                Advanced Health Diagnostics
              </div>
              <h1 className="font-dm-sans font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] mb-6">
                Discover Your Body's <span className="text-gold">Hidden Health Patterns</span>
              </h1>
              <p className="font-dm-sans text-[1.1rem] leading-[1.7] mb-8 text-white/90 max-w-[600px]">
                Our functional health analysis goes beyond symptoms to identify root causes, predict health risks, and create personalized wellness strategies tailored to your unique biology.
              </p>
              <div className="mt-8 flex items-center gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>100% Confidential</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Verified Health Risk Assessment</span>
                </div>
              </div>
            </div>
            
            <div className="relative flex flex-col justify-center">
              <div className="bg-white/10 backdrop-blur rounded-[24px] p-8 border border-white/20">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img src="/Dna 2.svg" alt="Genetic Markers" className="w-10 h-10 brightness-0 invert" />
                    <div>
                      <h3 className="font-dm-sans font-semibold text-gold text-lg">Genetic Markers</h3>
                      <p className="text-sm text-white/70">Analyze your genetic predispositions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <img src="/TestTube 3.svg" alt="Lab Analysis" className="w-10 h-10 brightness-0 invert" />
                    <div>
                      <h3 className="font-dm-sans font-semibold text-gold text-lg">Lab Analysis</h3>
                      <p className="text-sm text-white/70">Comprehensive blood work interpretation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <img src="/AsteriskSimple.svg" alt="Risk Assessment" className="w-10 h-10 brightness-0 invert" />
                    <div>
                      <h3 className="font-dm-sans font-semibold text-gold text-lg">Risk Assessment</h3>
                      <p className="text-sm text-white/70">Predict future health challenges</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <img src="/FirstAidKit 2.svg" alt="Personalized Plan" className="w-10 h-10 brightness-0 invert" />
                    <div>
                      <h3 className="font-dm-sans font-semibold text-gold text-lg">Personalized Plan</h3>
                      <p className="text-sm text-white/70">Custom wellness strategies</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/functional-health-analysis/form"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-green-deep rounded-[50px] font-dm-sans font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                >
                  Request Analysis
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <button className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-[50px] font-dm-sans font-semibold text-lg hover:bg-white/10 transition-all">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Analyze Section */}
      <section className="py-20 px-[5%] bg-[#FCFFF0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Comprehensive Analysis
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              We Analyze What Others Miss
            </h2>
            <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] max-w-[560px] mx-auto">
              Our advanced assessment evaluates multiple health systems to provide a complete picture of your wellbeing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <img src="/Brain.svg" alt="Cognitive Health" className="w-10 h-10" />
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Cognitive Health</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Brain function, memory, focus, and neurological patterns that impact daily performance.
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <img src="/Heartbeat.svg" alt="Heart & Metabolism" className="w-10 h-10" />
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Heart & Metabolism</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Cardiovascular health, metabolic efficiency, and energy production at cellular level.
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <img src="/lets-icons_chemistry.svg" alt="Hormonal Balance" className="w-10 h-10" />
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Hormonal Balance</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Endocrine system function, hormone levels, and reproductive health optimization.
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <img src="/ShieldCheckered.svg" alt="Immune Function" className="w-10 h-10" />
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Immune Function</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6]">
                Immune system strength, inflammation markers, and disease resistance capacity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Simple Process
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Get Your Analysis in 4 Simple Steps
            </h2>
            <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] max-w-[560px] mx-auto">
              Our streamlined process makes it easy to get comprehensive health insights without overwhelming complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-green-deep">
                1
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Request Analysis</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6] mb-4">
                Complete our comprehensive health questionnaire to begin your functional health journey.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-green-deep">
                2
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Do Lab Investigations</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6] mb-4">
                Complete recommended lab tests to provide detailed insights into your biological markers.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-green-deep">
                3
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Functional Health Assessment</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6] mb-4">
                Receive your comprehensive functional health analysis with personalized recommendations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-green-deep">
                4
              </div>
              <h3 className="font-dm-sans font-semibold text-green-deep text-xl mb-3">Subscribe to a Care Plan</h3>
              <p className="font-dm-sans text-text-mid leading-[1.6] mb-4">
                Choose a personalized care plan to maintain and optimize your health with ongoing support.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/functional-health-analysis/form"
              className="inline-flex items-center justify-center px-8 py-4 bg-green-deep text-white rounded-[50px] font-dm-sans font-bold text-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-xl"
            >
              Request Analysis
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-[5%] bg-gradient-to-br from-green-deep/5 to-gold/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            <div>
              <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
                Why Choose FXMed
              </div>
              <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-6">
                Beyond Traditional Healthcare
              </h2>
              <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] mb-8">
                Unlike conventional medicine that treats symptoms, our functional health analysis identifies 
                root causes and creates personalized strategies for optimal wellness.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Root Cause Analysis</h3>
                    <p className="font-dm-sans text-text-mid leading-[1.6]">
                      We identify underlying imbalances rather than just masking symptoms with medications.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Personalized Protocols</h3>
                    <p className="font-dm-sans text-text-mid leading-[1.6]">
                      Your health plan is tailored to your unique biology, lifestyle, and health goals.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Preventive Focus</h3>
                    <p className="font-dm-sans text-text-mid leading-[1.6]">
                      We predict and prevent health issues before they become chronic conditions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                  <div>
                    <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Scientific Approach</h3>
                    <p className="font-dm-sans text-text-mid leading-[1.6]">
                      Based on cutting-edge research and advanced diagnostic technologies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-8 shadow-xl">
              <img src="/fxmed-website-picture-1.jpg" alt="FXMed" className="w-full h-80 object-cover rounded-[20px] mb-6" />
              <div className="text-center mb-6">
                <h3 className="font-dm-sans font-bold text-green-deep text-2xl mb-2">
                  Ready to Transform Your Health?
                </h3>
                <p className="font-dm-sans text-text-mid">
                  Join others who have discovered their path to optimal wellness
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-green-deep/5 rounded-lg">
                  <div className="text-3xl font-bold text-green-deep mb-1">100 +</div>
                  <div className="text-sm text-text-mid">Analyses Completed</div>
                </div>
                <div className="text-center p-4 bg-gold/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-deep mb-1">95%</div>
                  <div className="text-sm text-text-mid">Satisfaction Rate</div>
                </div>
              </div>

              <Link 
                href="/functional-health-analysis/form"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gold text-green-deep rounded-[16px] font-dm-sans font-bold hover:bg-gold-light transition-all"
              >
                Request Analysis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-cream py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Patient Stories
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Real people, real results
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-[600px] mx-auto">
              Authentic experiences from patients who've transformed their health with FXMed's personalized care.
            </p>
          </div>

          {/* Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Norma R. Story */}
            <div className="bg-white rounded-[20px] p-8 border border-green-deep/10 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="flex items-center justify-center text-green-deep font-bold flex-shrink-0 mb-4"
                  style={{
                    width: '56px',
                    height: '56px',
                    aspectRatio: '1/1',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(251 191 36 / 0.2)',
                    minWidth: '56px',
                    maxWidth: '56px',
                    minHeight: '56px',
                    maxHeight: '56px',
                    display: 'flex'
                  }}
                >
                  N
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Norma R.
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "Dr. Kike was very thorough in analyzing my health profile and educating me on how certain factors contribute to my symptoms. She really took the time to sit and discuss with me in a personalized way that was easy to understand. You can tell she is passionate about what she does."
                  </p>
                </div>
              </div>
            </div>

            {/* Ife Folawiyo Story */}
            <div className="bg-white rounded-[20px] p-8 border border-green-deep/10 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="flex items-center justify-center text-green-deep font-bold flex-shrink-0 mb-4"
                  style={{
                    width: '56px',
                    height: '56px',
                    aspectRatio: '1/1',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(251 191 36 / 0.2)',
                    minWidth: '56px',
                    maxWidth: '56px',
                    minHeight: '56px',
                    maxHeight: '56px',
                    display: 'flex'
                  }}
                >
                  I
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Ife Folawiyo
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "As a mother of two, I find myself neglecting my body. With FXMed I am given the education I needed plans and the coaching. I always feel more motivated each time I talk with any of the staff."
                  </p>
                </div>
              </div>
            </div>

            {/* Adaeze M. Story */}
            <div className="bg-white rounded-[20px] p-8 border border-green-deep/10 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div 
                  className="flex items-center justify-center text-green-deep font-bold flex-shrink-0 mb-4"
                  style={{
                    width: '56px',
                    height: '56px',
                    aspectRatio: '1/1',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(251 191 36 / 0.2)',
                    minWidth: '56px',
                    maxWidth: '56px',
                    minHeight: '56px',
                    maxHeight: '56px',
                    display: 'flex'
                  }}
                >
                  A
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Adaeze M.
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "I had been going from doctor to doctor for years with no real answers. FXMed's functional approach finally identified the root cause of my fatigue. Within 3 months on the Adrenal Reset program, I felt like a completely different person. Life-changing doesn't begin to cover it."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 px-[5%] bg-gradient-to-br from-green-deep to-green-mid overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('/fxmed-website-picture.png')] bg-cover bg-bottom opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-deep/80 via-green-mid/70 to-green-deep/60"></div>
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <h2 className="font-dm-sans font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-6">
            Your Health Journey Starts Here
          </h2>
          <p className="font-dm-sans text-[1.1rem] leading-[1.7] mb-8 text-white/90">
            Take the first step towards optimal health with our comprehensive functional health analysis. 
            No obligation, just insights that can transform your life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/functional-health-analysis/form"
              className="inline-flex items-center justify-center px-8 py-4 bg-gold text-green-deep rounded-[50px] font-dm-sans font-bold text-lg hover:bg-gold-light transition-all transform hover:scale-105 shadow-xl"
            >
              Request Analysis
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Verified Health Risk Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Confidential & Secure</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
