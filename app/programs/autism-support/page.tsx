'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AppointmentModal from '@/components/AppointmentModal'
import Image from 'next/image'
import {
  AutismAtAGlance,
  FamilyJourney,
  GutBrainConnection,
  HealthCycle,
  Icon,
  MythsAndFacts,
  NutrientsWeCheck,
  SectionHeading,
  SignsToWatch,
  type IconName,
} from '@/components/AutismSupportInfographics'
import { useState } from 'react'

const receives = [
  {
    title: 'Whole-Child Assessment',
    icon: 'clipboard' as IconName,
    description: 'A detailed review of your child’s health history, diet, digestion, sleep and daily routine with our functional medicine team.',
  },
  {
    title: 'Gut Health Testing',
    icon: 'flask' as IconName,
    description: 'Stool analysis to look for imbalances, inflammation and digestive issues behind tummy pain, constipation or loose stools.',
  },
  {
    title: 'Nutrient Assessment',
    icon: 'droplet' as IconName,
    description: 'Lab tests for iron, vitamin D, B12, zinc and other nutrients that are often low in children with restricted diets.',
  },
  {
    title: 'Picky Eating Nutrition Plan',
    icon: 'utensils' as IconName,
    description: 'A practical plan that works with your child’s food preferences and sensory needs to widen their diet step by step.',
  },
  {
    title: 'Sleep Support Plan',
    icon: 'moon' as IconName,
    description: 'Routines and nutrition strategies to help with trouble falling asleep, night waking and early rising.',
  },
  {
    title: 'Ongoing Family Support',
    icon: 'chat' as IconName,
    description: 'Regular check-ins to track progress, adjust the plan and answer your questions along the way.',
  },
]

const features = [
  {
    title: 'Child-Centred',
    description: 'Every plan is built around your child’s needs, sensory preferences and pace.',
    icon: 'heart' as IconName,
  },
  {
    title: 'Evidence-Informed',
    description: 'We use lab testing and current research to guide every recommendation.',
    icon: 'shield' as IconName,
  },
  {
    title: 'Family Focused',
    description: 'Practical guidance that fits real family life, with support for parents and carers.',
    icon: 'users' as IconName,
  },
  {
    title: 'Works With Your Team',
    description: 'We complement therapy and medical care your child already receives.',
    icon: 'link' as IconName,
  },
]

const benefits = [
  { title: 'More Comfortable Digestion', icon: 'gut' as IconName, description: 'Less tummy pain, constipation and digestive upset.' },
  { title: 'Better Sleep', icon: 'moon' as IconName, description: 'More restful nights for your child and the whole family.' },
  { title: 'A Wider Diet', icon: 'utensils' as IconName, description: 'Gradual progress towards a more varied, nourishing diet.' },
  { title: 'Clear Answers', icon: 'clipboard' as IconName, description: 'Test results that explain what is happening and a plan for what to do next.' },
]

export default function AutismSupport() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-green-deep md:min-h-[88vh] md:flex md:items-center">
        {/* On mobile the photo sits above the text so the faces stay visible; from md up it fills the hero */}
        <div className="relative h-[44vh] md:absolute md:inset-0 md:h-auto">
          <Image
            src="/autism-support-hero.webp"
            alt="A smiling mother sits beside her son as he draws a tree with coloured pencils at home"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[90%_center] md:object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(15,36,25,0.75)] via-transparent to-green-deep md:bg-gradient-to-r md:from-[rgba(15,36,25,0.92)] md:via-[rgba(26,61,46,0.6)] md:to-transparent"></div>
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-[5%] pt-4 pb-14 md:pt-52 md:pb-20 text-white">
          <div className="max-w-xl">
            <div className="inline-block text-gold bg-gold/15 border border-gold/30 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-6">
              Functional Medicine for Families
            </div>
            <h1 className="font-dm-sans font-bold text-4xl md:text-6xl leading-[1.1] mb-6">
              Autism <span className="text-gold">Support</span>
            </h1>
            <p className="font-dm-sans text-lg md:text-xl mb-10 text-cream/90 leading-[1.6]">
              Helping autistic children feel their best through gut health, nutrition and sleep
              support, with a care plan built around your child and your family.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
              >
                Book a Consultation
              </button>
              <a
                href="#whats-included"
                className="font-dm-sans text-center border border-cream/50 text-cream px-8 py-4 rounded-[50px] font-semibold text-lg no-underline transition-all hover:bg-cream/10 hover:border-cream"
              >
                What’s Included
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              About the program
            </div>
            <h2 className="font-dm-sans font-bold text-3xl md:text-4xl text-green-deep mb-6">
              Supporting the whole child
            </h2>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7] mb-6">
              Many autistic children also live with digestive problems, very selective eating,
              poor sleep or nutrient gaps. These can leave a child uncomfortable, tired and
              unsettled, and they are often overlooked.
            </p>
            <p className="font-dm-sans text-lg text-text-mid leading-[1.7]">
              Our Autism Support program looks for these underlying health issues and builds a
              practical plan to address them, so your child can feel more comfortable and get
              more out of every day.
            </p>
          </div>
          <div className="lg:col-span-2 bg-green-deep rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/15" aria-hidden="true" />
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gold text-green-deep flex items-center justify-center mb-5">
                <Icon name="heart" className="w-6 h-6" />
              </div>
              <h3 className="font-dm-sans font-semibold text-xl mb-3">Our promise to families</h3>
              <p className="font-dm-sans text-cream/85 leading-[1.65]">
                This program supports your child’s physical health. It does not aim to cure or
                change autism, and it works alongside, not in place of, your child’s paediatrician,
                therapists and other care.
              </p>
            </div>
          </div>
        </div>
      </section>

      <AutismAtAGlance />
      <GutBrainConnection />
      <HealthCycle />
      <SignsToWatch onBook={() => setShowAppointmentModal(true)} />

      {/* What You'll Receive */}
      <section id="whats-included" className="py-20 px-[5%] bg-[#FCFFF0] scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="What’s included"
            title="Join the Autism Support Program"
            intro="We combine functional testing, child-friendly nutrition and ongoing guidance for parents to address the health issues that most often affect autistic children."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receives.map((item, index) => (
              <div key={item.title} className="relative bg-white p-7 rounded-2xl shadow-lg border border-green-deep/10 transition-all hover:-translate-y-1 hover:shadow-xl">
                <span className="absolute top-6 right-6 font-dm-sans font-bold text-4xl text-green-deep/10">{String(index + 1).padStart(2, '0')}</span>
                <div className="w-12 h-12 bg-gold rounded-xl text-green-deep flex items-center justify-center mb-5">
                  <Icon name={item.icon} className="w-6 h-6" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">
                  {item.title}
                </h3>
                <p className="font-dm-sans text-text-mid leading-[1.6]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <NutrientsWeCheck />
      <FamilyJourney />

      {/* Program Features */}
      <section className="py-20 px-[5%] bg-[#FCFFF0]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Our approach" title="Program features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-16 h-16 bg-green-light/25 text-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name={feature.icon} className="w-8 h-8" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">{feature.title}</h3>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MythsAndFacts />

      {/* Benefits and CTA */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Results" title="What families can expect" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-2xl p-6 border border-green-deep/10 shadow-sm">
                <div className="w-11 h-11 bg-gold rounded-full text-green-deep flex items-center justify-center mb-4">
                  <Icon name={benefit.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">{benefit.title}</h3>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          <div className="relative bg-gradient-to-r from-green-deep to-green-mid rounded-3xl p-10 md:p-14 text-center overflow-hidden">
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gold/10" aria-hidden="true" />
            <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-white/5" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-dm-sans font-bold text-3xl md:text-4xl text-white mb-6">
                Ready to Support Your Child’s Health?
              </h2>
              <p className="font-dm-sans text-xl text-cream/90 mb-8 max-w-2xl mx-auto">
                Book a consultation and we will talk through your child’s needs and how we can help.
              </p>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
              >
                Book Consultation
              </button>
            </div>
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
