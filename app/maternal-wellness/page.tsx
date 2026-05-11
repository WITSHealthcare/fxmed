'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MaternalBookingModal from '@/components/MaternalBookingModal'

const packages = [
  {
    title: "Pre-Conception Health Package",
    price: "₦295,000",
    priceUSD: "$197",
    duration: "3 Months",
    icon: "🌱",
    tagline: "Prepare your body for a healthy pregnancy",
    color: "from-green-deep to-green-mid",
    sections: [
      {
        title: "Initial Consultation",
        items: ["GP Home Visit", "Essential Health Analysis"]
      },
      {
        title: "Lab Tests",
        items: ["Full Blood Count", "Liver Function Test (AST/ALT)", "Kidney Function Test", "Fasting Blood Sugar (FBS) + HbA1C", "Lipid Profile", "Urinalysis"]
      },
      {
        title: "Nutrition and Lifestyle Guidance",
        items: ["Nutrition Assessment", "4-Week Meal Plan and Recipes"]
      },
      {
        title: "Wellness and Relaxation",
        items: ["Aromatherapy Massage"]
      }
    ]
  },
  {
    title: "Ante-natal Wellness Package",
    price: "₦740,000",
    priceUSD: "$527",
    duration: "Per Trimester",
    icon: "🤰",
    tagline: "Comprehensive care through every trimester",
    color: "from-green-mid to-green-light",
    sections: [
      {
        title: "Regular Health Monitoring",
        items: ["Monthly Home Visit", "24/7 Care support team access", "Urgent care support"]
      },
      {
        title: "Labor and Delivery",
        items: ["Hospital transportation", "Labor room Concierge support"]
      },
      {
        title: "Labs and Diagnostics",
        items: ["All tests from the Essential Health Analysis", "Thyroid Function Test (Free T3, Free T4, TSH)", "Ultrasound Scan"]
      },
      {
        title: "Nutrition and Lifestyle Support",
        items: ["Body Composition and Fitness Assessment", "Dietetic Consultation", "Prenatal Vitamins (Monthly supply)", "IV Therapy for Vitality", "Aqua Boost"]
      },
      {
        title: "Relaxing Treatments",
        items: ["Shiatsu Foot Massage"]
      }
    ]
  },
  {
    title: "Postnatal Care Package",
    price: "₦395,000",
    priceUSD: "$271",
    duration: "Postpartum",
    icon: "👶",
    tagline: "Recovery, rejuvenation and newborn support",
    color: "from-gold to-gold-light",
    sections: [
      {
        title: "Postpartum Health Assessment",
        items: ["GP Home Visit", "Postpartum depression and Mental Health Screening", "Newborn Health Assessment"]
      },
      {
        title: "Postnatal Nutrition and Recovery",
        items: ["Lactation Support", "Nutrition Assessment", "Pantry Overhaul and Makeover"]
      },
      {
        title: "Body and Skin Rejuvenation",
        items: ["Deep-Cleansing Facial", "Microdermabrasion"]
      },
      {
        title: "IV Therapy for Recovery",
        items: ["Vitality Shots: Vitamin C Zing"]
      },
      {
        title: "Relaxation and Stress Relief",
        items: ["Therapeutic/Deep-tissue Massage (60 mins)"]
      }
    ]
  },
  {
    title: "Fertility Breakthrough Program",
    price: "₦3,500,000",
    priceUSD: "$2,450",
    duration: "Ongoing",
    icon: "✨",
    tagline: "Advanced support for your fertility journey",
    color: "from-purple-600 to-purple-400",
    sections: [
      {
        title: "Comprehensive Initial Consultation",
        items: ["GP Home Visit", "Fertility Specialist Teleconsultation (UK and US)"]
      },
      {
        title: "Advanced Health and Fertility Analysis",
        items: ["Full Blood Count", "Hormonal Profile (FSH, LH, Estrogen, Progesterone)", "Liver and Kidney Function Tests", "Fasting Blood Sugar (FBS) + HbA1C", "Lipid Profile", "Thyroid Function Test (Free T3, Free T4, TSH)", "Semen Analysis (for partners)", "Urinalysis"]
      },
      {
        title: "Personalized Nutrition and Lifestyle Plan",
        items: ["Comprehensive Nutrition Assessment", "6-Week Meal Plan with Fertility-Boosting Recipes", "Personalized Exercise Plan"]
      },
      {
        title: "Mind-Body Wellness and Relaxation",
        items: ["Monthly Aromatherapy Massage", "Guided Meditation Sessions (Digital Access)", "Hormone Reset Fertility Classes"]
      },
      {
        title: "Innovative Fertility Support",
        items: ["Red Light Sessions (2 per month)", "Herbal Supplement Starter Kit"]
      },
      {
        title: "Exclusive Online Resources and Community",
        items: ["Access to Fertility Workshops and Webinars", "Membership to a Supportive Online Community Forum"]
      }
    ]
  }
]

export default function MaternalWellnessPage() {
  const [activePackage, setActivePackage] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-52 pb-24 px-[5%] overflow-hidden bg-gradient-to-br from-green-deep to-green-mid">
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.35]"
          style={{ backgroundImage: "url('/black-pregnant-women-posing.jpg')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.92)] via-[rgba(26,61,46,0.7)] to-[rgba(30,74,53,0.4)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <div className="inline-block text-gold bg-gold/20 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-6">
            Maternal Wellness
          </div>
          <h1 className="font-dm-sans font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] mb-6">
            Complete Care for Your<br/>Motherhood Journey
          </h1>
          <p className="font-dm-sans text-cream/80 text-[1.15rem] leading-[1.7] max-w-2xl mx-auto mb-8">
            From pre-conception planning through postnatal recovery, our Pregnancy Wellness Packages deliver continuous, personalised support at every step — all from the comfort of your home.
          </p>
          <button
            onClick={() => setShowBookingModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block"
          >
            Book a Consultation →
          </button>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Why FXMed Maternal
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.15] mb-4">
              Healthcare That Comes to You
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-[560px] mx-auto">
              Every package is delivered to your home, so you can focus on what matters most.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🏠", title: "Home Delivery", desc: "All consultations, tests, and treatments come to you — no clinic trips needed." },
              { icon: "👩‍⚕️", title: "Expert Team", desc: "Our functional medicine physicians and nutritionists specialise in women's health." },
              { icon: "🔬", title: "Advanced Testing", desc: "Comprehensive lab work interpreted through a functional medicine lens." },
              { icon: "💛", title: "Continuous Support", desc: "24/7 care team access ensures you're never alone through your journey." },
            ].map((item, i) => (
              <div key={i} className="bg-[#FCFFF0] rounded-[20px] p-7 border border-green-deep/8 text-center transition-all hover:shadow-lg hover:transform hover:translate-y-[-4px]">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">{item.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-20 px-[5%] bg-[#FCFFF0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Our Packages
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.15]">
              Choose Your Wellness Package
            </h2>
          </div>

          {/* Package Tabs */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {packages.map((pkg, i) => (
              <button
                key={i}
                onClick={() => setActivePackage(i)}
                className={`font-dm-sans px-5 py-2.5 rounded-[50px] text-[0.9rem] font-medium transition-all ${
                  activePackage === i
                    ? 'bg-green-deep text-cream shadow-md'
                    : 'bg-white text-green-deep border border-green-deep/20 hover:border-green-deep'
                }`}
              >
                {pkg.icon} {i === 3 ? 'Fertility' : pkg.title.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Active Package Detail */}
          <div className="bg-white rounded-[24px] shadow-lg overflow-hidden">
            {/* Package Header */}
            <div className={`bg-gradient-to-r ${packages[activePackage].color} p-8 text-white`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-dm-sans text-white/70 text-sm mb-1">{packages[activePackage].tagline}</p>
                  <h3 className="font-dm-sans font-bold text-[1.8rem]">{packages[activePackage].title}</h3>
                </div>
                <div className="text-right">
                  <div className="font-dm-sans font-bold text-[2.2rem] leading-none">{packages[activePackage].price}</div>
                  <div className="font-dm-sans text-white/70 text-sm mt-1">
                    {packages[activePackage].priceUSD} · {packages[activePackage].duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Package Content */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages[activePackage].sections.map((section, si) => (
                  <div key={si} className="bg-[#FCFFF0] rounded-[16px] p-6 border border-green-deep/8">
                    <h4 className="font-dm-sans font-semibold text-green-deep text-[1rem] mb-4">{section.title}</h4>
                    <ul className="space-y-2">
                      {section.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
                          <span className="font-dm-sans text-text-mid text-[0.9rem] leading-[1.6]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg text-center"
                >
                  Book This Package →
                </button>
                <a
                  href="/#contact"
                  className="font-dm-sans bg-transparent text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline border border-green-deep/40 transition-all hover:border-green-deep hover:bg-green-deep/5 text-center"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>

          {/* All Package Cards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {packages.map((pkg, i) => (
              <div
                key={i}
                onClick={() => setActivePackage(i)}
                className={`bg-white rounded-[20px] p-6 border cursor-pointer transition-all hover:shadow-lg hover:transform hover:translate-y-[-4px] ${
                  activePackage === i ? 'border-green-deep shadow-md' : 'border-green-deep/8'
                }`}
              >
                <div className="text-3xl mb-3">{pkg.icon}</div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1rem] mb-1">{pkg.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.85rem] mb-4">{pkg.tagline}</p>
                <div className="font-dm-sans font-bold text-green-mid text-[1.3rem]">{pkg.price}</div>
                {pkg.priceUSD && <div className="font-dm-sans text-text-mid text-[0.85rem]">{pkg.priceUSD} · {pkg.duration}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-[5%] bg-green-deep text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-dm-sans font-bold text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.15] mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="font-dm-sans text-cream/80 text-[1.1rem] leading-[1.7] mb-8 max-w-2xl mx-auto">
            Our team is ready to support you at every stage of your motherhood journey. Book a consultation today and let us come to you.
          </p>
          <button
            onClick={() => setShowBookingModal(true)}
            className="font-dm-sans bg-gold text-green-deep px-10 py-4 rounded-[50px] font-semibold text-[1.05rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Book a Consultation →
          </button>
        </div>
      </section>

      <Footer />

      <MaternalBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        initialPackage={activePackage}
      />
    </main>
  )
}
