'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'

const services = [
  {
    icon: '/Laptop.svg',
    title: 'Virtual Consult',
    shortDesc: 'Expert medical advice, follow-ups, and prescription refills from anywhere via secure video or chat.',
    fullDesc: 'Access world-class functional medicine expertise from anywhere in the world. Our Virtual Consult service uses secure, HIPAA-compliant video and messaging platforms to deliver expert care directly to you. Perfect for follow-ups, prescription management, lab result reviews, and ongoing health coaching without the need to travel.',
    features: [
      'Secure video consultations',
      'WhatsApp and Google Meet integration',
      'Digital prescription management',
      'Lab result reviews and interpretation',
      'Remote health monitoring',
      'Digital health coaching',
      '24/7 messaging support'
    ],
    pricing: '₦25,000 per consultation',
    bestFor: 'Busy professionals, travelers, and those preferring remote care'
  },
  {
    icon: '/Hospital.svg',
    title: 'Concierge Medicine',
    shortDesc: 'Priority access to a dedicated physician, extended consultations, and home visits tailored to your schedule.',
    fullDesc: 'Our Concierge Medicine service provides you with priority access to a dedicated functional medicine physician who knows your health history and goals. Enjoy extended consultation times, same-day or next-day appointments, direct messaging access, and the convenience of home or office visits. This premium service ensures you receive unhurried, personalized care that addresses the root causes of your health concerns.',
    features: [
      'Dedicated personal physician',
      'Extended consultation times (60-90 minutes)',
      'Same-day or next-day appointments',
      'Home and office visits',
      'Direct physician messaging',
      'Comprehensive health coordination',
      'Priority specialist referrals'
    ],
    pricing: 'Starting at ₦85,000/visit',
    bestFor: 'Individuals and families seeking comprehensive, relationship-based healthcare'
  },
  {
    icon: '/TestTube.svg',
    title: 'Lab Investigations',
    shortDesc: 'Routine to advanced panels. Fast sample collection, accurate results, and physician-led interpretation.',
    fullDesc: 'We offer comprehensive laboratory testing from routine wellness panels to advanced functional medicine tests. Our services include convenient home sample collection, partnerships with accredited laboratories for accurate results, and detailed physician-led interpretation. We go beyond standard ranges to identify optimal values and root causes of health issues.',
    features: [
      'Home sample collection available',
      'Routine wellness panels',
      'Advanced functional testing',
      'Hormone panels and analysis',
      'Comprehensive stool analysis',
      'Food sensitivity testing',
      'Genetic testing and interpretation',
      'Detailed physician-led review'
    ],
    pricing: 'Starting at ₦15,000',
    bestFor: 'Anyone needing diagnostic clarity or monitoring health markers'
  },
  {
    icon: '/BowlFood.svg',
    title: 'Nutrition Counselling',
    shortDesc: 'Evidence-based, personalized dietary plans for weight management, chronic disease prevention, and wellness.',
    fullDesc: 'Our nutrition counseling goes beyond generic diet plans. We create personalized, evidence-based nutrition protocols based on your unique biochemistry, health goals, and lifestyle. Whether you need support for weight management, managing chronic conditions, optimizing energy, or healing digestive issues, our functional nutrition approach addresses the root causes.',
    features: [
      'Personalized meal planning',
      'Functional nutrition assessment',
      'Food sensitivity guidance',
      'Weight management protocols',
      'Digestive health optimization',
      'Supplement recommendations',
      'Grocery shopping guidance',
      'Recipe development and modification'
    ],
    pricing: 'Starting at ₦15,000',
    bestFor: 'Those seeking sustainable dietary changes and optimal nutrition'
  },
  {
    icon: '/Pill.svg',
    title: 'Supplement Dispensary',
    shortDesc: 'Clinically curated vitamins, nutraceuticals, and prescription medications with expert guidance on usage.',
    fullDesc: 'Access our professionally curated dispensary of high-quality vitamins, nutraceuticals, and prescription medications. We partner with trusted pharmaceutical and nutraceutical companies to provide you with therapeutic-grade supplements. Every recommendation is personalized based on your lab results and health goals, ensuring you only take what you truly need.',
    features: [
      'Therapeutic-grade supplements',
      'Professional-grade nutraceuticals',
      'Personalized supplement protocols',
      'Prescription medication management',
      'Quality-tested products',
      'Home delivery available',
      'Dosage optimization',
      'Interaction checking'
    ],
    pricing: 'Product costs vary',
    bestFor: 'Anyone needing targeted nutritional support or medication management'
  },
  {
    icon: '/Stethoscope.svg',
    title: 'Specialist Consultation',
    shortDesc: 'Access certified specialists in cardiology, endocrinology, dermatology, neurology, and more.',
    fullDesc: 'When specialized care is needed, we coordinate access to a network of certified specialists across multiple disciplines. From cardiology and endocrinology to dermatology and neurology, we ensure seamless referrals, shared medical records, and coordinated care plans. Our functional medicine approach means we work collaboratively with specialists to address root causes, not just symptoms.',
    features: [
      'Multi-specialty network access',
      'Priority specialist appointments',
      'Coordinated care planning',
      'Shared medical records',
      'Root-cause focused referrals',
      'Integrated treatment approaches',
      'Second opinion services',
      'Ongoing case management'
    ],
    pricing: 'Specialist fees vary',
    bestFor: 'Complex health conditions requiring specialized expertise'
  },
  {
    icon: '/Ambulance.svg',
    title: 'Medical Outreach',
    shortDesc: 'On-site consultations, screenings, and health education for organizations, NGOs, and communities.',
    fullDesc: 'Our Medical Outreach program brings quality healthcare to underserved communities, corporate organizations, and NGOs. We provide on-site health screenings, consultations, health education workshops, and wellness programs. This service helps bridge healthcare gaps while promoting preventive health and early detection of diseases.',
    features: [
      'Corporate wellness programs',
      'Community health screenings',
      'On-site medical consultations',
      'Health education workshops',
      'Preventive care initiatives',
      'NGO partnership programs',
      'School health programs',
      'Church and community outreach'
    ],
    pricing: 'Custom quotes based on scope',
    bestFor: 'Organizations, NGOs, schools, and communities'
  },
  {
    icon: '/streamline-ultimate_pregnancy-pregnant-bold.svg',
    title: 'Pregnancy Wellness',
    shortDesc: 'Comprehensive maternal care from pre-conception through postnatal recovery, delivered to your home.',
    fullDesc: 'Our Pregnancy Wellness program provides comprehensive care throughout your motherhood journey. From pre-conception planning and fertility optimization through pregnancy, delivery support, and postnatal recovery, we offer personalized care that addresses the unique needs of expectant and new mothers. All services can be delivered to your home for maximum comfort and convenience.',
    features: [
      'Pre-conception health optimization',
      'Ante-natal care and monitoring',
      'Nutritional guidance for pregnancy',
      'Labor and delivery preparation',
      'Postnatal recovery support',
      'Lactation consulting',
      'Newborn care guidance',
      'Mental health support'
    ],
    pricing: 'Packages from ₦295,000',
    bestFor: 'Expectant mothers and families planning pregnancy'
  }
]

export default function ServicesPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-deep to-green-mid text-white pt-52 pb-20 px-[5%] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-left bg-no-repeat brightness-[0.4]"
          style={{ backgroundImage: "url('/Equipment.jpg')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.3)] via-[rgba(15,36,25,0.7)] to-[rgba(15,36,25,0.97)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block text-gold bg-gold/20 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-6">
            Our Services
          </div>
          <h1 className="font-dm-sans font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] mb-6">
            Comprehensive Healthcare,<br/>Delivered to You
          </h1>
          <p className="font-dm-sans text-cream/80 text-[1.2rem] leading-[1.7] max-w-2xl mx-auto mb-8">
            From concierge medicine to virtual consultations, lab investigations to nutrition counseling — 
            we provide everything you need for optimal health, delivered directly to your home, office, or community.
          </p>
          <Link 
            href="#services-list"
            className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] inline-block"
          >
            Explore Our Services →
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#FCFFF0] py-[80px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
              Why Choose FXMed Services?
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
              We combine the convenience of modern healthcare delivery with the depth of functional medicine
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Root Cause Focus',
                desc: 'We don\'t just treat symptoms — we identify and address the underlying causes of your health concerns.',
                icon: '/Focus.png'
              },
              {
                title: 'Personalized Care',
                desc: 'Every protocol is tailored to your unique biochemistry, lifestyle, and health goals.',
                icon: '/HealthAssessment.png'
              },
              {
                title: 'Convenience First',
                desc: 'Home visits, virtual consultations, and digital health tools make healthcare fit your life.',
                icon: '/HomeVisit.png'
              },
              {
                title: 'Evidence-Based',
                desc: 'Our approaches are grounded in the latest functional medicine research and clinical evidence.',
                icon: '/Science.png'
              },
              {
                title: 'Integrated Approach',
                desc: 'We coordinate care across specialists, labs, nutrition, and lifestyle for holistic health.',
                icon: '/Integrate.png'
              },
              {
                title: 'Continuous Support',
                desc: 'Ongoing monitoring, regular check-ins, and accessible messaging keep you supported.',
                icon: '/Telemedicine.png'
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-[20px] p-8 border border-green-deep/8 shadow-sm">
                <div className="text-4xl mb-4">
                  {item.icon.startsWith('/') ? (
                    <Image src={item.icon} alt={item.title} width={48} height={48} />
                  ) : (
                    item.icon
                  )}
                </div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.2rem] mb-3">{item.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services List */}
      <section id="services-list" className="bg-white py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
              Detailed Services
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Everything You Need for Optimal Health
            </h2>
          </div>

          <div className="space-y-12">
            {services.map((service, index) => (
              <div 
                key={index}
                className="bg-[#FCFFF0] rounded-[24px] p-8 lg:p-10 border border-green-deep/8 hover:shadow-xl transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left - Icon & Basic Info */}
                  <div className="lg:col-span-1">
                    <div className="w-16 h-16 mb-6 relative">
                      <Image
                        src={service.icon}
                        alt={service.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="font-dm-sans font-bold text-green-deep text-[1.5rem] mb-3">{service.title}</h3>
                    <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] mb-4">{service.shortDesc}</p>
                    <div className="bg-gold/20 rounded-[12px] p-4 mb-4">
                      <div className="font-dm-sans font-semibold text-green-deep text-[0.9rem] mb-1">Pricing</div>
                      <div className="font-dm-sans text-green-mid font-bold">{service.pricing}</div>
                    </div>
                    <div className="bg-green-mid/10 rounded-[12px] p-4">
                      <div className="font-dm-sans font-semibold text-green-deep text-[0.9rem] mb-1">Best For</div>
                      <div className="font-dm-sans text-text-mid text-[0.85rem]">{service.bestFor}</div>
                    </div>
                  </div>

                  {/* Right - Full Description & Features */}
                  <div className="lg:col-span-2">
                    <p className="font-dm-sans text-text-mid text-[1rem] leading-[1.7] mb-6">{service.fullDesc}</p>
                    
                    <div className="mb-6">
                      <h4 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-4">What's Included:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {service.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-start gap-2">
                            <span className="text-green-mid mt-0.5">✓</span>
                            <span className="font-dm-sans text-text-mid text-[0.9rem]">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link 
                      href="/#contact"
                      className="font-dm-sans bg-green-deep text-cream px-6 py-3 rounded-[30px] font-semibold text-[0.95rem] no-underline transition-all hover:bg-green-mid inline-block"
                    >
                      Book This Service →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-green-deep/5 to-gold/5 py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
              How to Access Our Services
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
              Getting started with FXMed is simple and straightforward
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Choose Your Service',
                desc: 'Browse our services and select what you need'
              },
              {
                step: '02',
                title: 'Book Consultation',
                desc: 'Schedule a virtual or in-person consultation'
              },
              {
                step: '03',
                title: 'Assessment',
                desc: 'We conduct thorough health evaluation'
              },
              {
                step: '04',
                title: 'Begin Care',
                desc: 'Start your personalized health journey'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-dm-sans font-bold text-green-deep text-[1.3rem]">{item.step}</span>
                </div>
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">{item.title}</h3>
                <p className="font-dm-sans text-text-mid text-[0.9rem]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-deep py-[80px] px-[5%]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-dm-sans font-bold text-white text-[clamp(2rem,4vw,2.5rem)] leading-[1.15] mb-4">
            Ready to Get Started?
          </h2>
          <p className="font-dm-sans text-cream/80 text-[1.1rem] leading-[1.7] mb-8">
            Book a consultation today and discover how our services can transform your health journey
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/#contact"
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] inline-block"
            >
              Book Consultation →
            </Link>
            <Link 
              href="/#pricing"
              className="font-dm-sans bg-transparent text-cream px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline border-2 border-cream/30 transition-all hover:border-cream hover:bg-cream/10 inline-block"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
