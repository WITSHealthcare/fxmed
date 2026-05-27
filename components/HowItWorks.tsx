'use client'

import { useState } from 'react'
import Image from 'next/image'
import AppointmentModal from '@/components/AppointmentModal'

export default function HowItWorks() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const steps = [
    {
      number: 1,
      title: 'Book a Consultation',
      description: 'Schedule your initial consultation with our expert team to discuss your health goals and concerns.',
      icon: '/Calendar.png'
    },
    {
      number: 2,
      title: 'Get a Functional Health Assessment',
      description: 'Complete our comprehensive functional health assessment to identify root causes of your health issues.',
      icon: '/HealthAssessment.png'
    },
    {
      number: 3,
      title: 'Get on a Care Plan',
      description: 'Receive a personalized care plan tailored to your unique health needs and start your journey to optimal wellness.',
      icon: '/CarePlan.png'
    }
  ]

  return (
    <section className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-[5%]">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-dm-sans font-bold text-green-deep mb-4">
            How It Works
          </h2>
          <p className="font-dm-sans text-text-mid text-lg max-w-2xl mx-auto">
            Your journey to optimal health is simple with our three-step process designed to give you the care you deserve.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-[24px] p-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Step Number */}
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-green-deep">
                  {step.number}
                </span>
              </div>

              {/* Icon */}
              <div className="text-5xl mb-4">
                {step.icon.startsWith('/') ? (
                  <Image src={step.icon} alt={step.title} width={48} height={48} />
                ) : (
                  step.icon
                )}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-dm-sans font-bold text-green-deep mb-3">
                {step.title}
              </h3>

              {/* Description */}
              <p className="font-dm-sans text-text-mid leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-green-deep text-gold px-8 py-4 rounded-[50px] font-dm-sans font-bold text-lg transition-all hover:bg-green-mid hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Start Your Journey Today
          </button>
          <button 
            onClick={() => window.location.href = '/functional-health-analysis'}
            className="bg-cream border-2 border-green-deep text-green-deep px-8 py-4 rounded-[50px] font-dm-sans font-bold text-lg transition-all hover:bg-green-deep/10 hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Take Functional Health Assessment
          </button>
        </div>
      </div>

      <AppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  )
}
