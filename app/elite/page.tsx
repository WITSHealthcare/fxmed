import Image from 'next/image'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function Elite() {
  const benefits = [
    {
      icon: <Image src="/discreet.png" alt="Discreet Access" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "Discreet & Exclusive Access",
      description: "Healthcare beyond the public eye, designed for your lifestyle"
    },
    {
      icon: <Image src="/fxmed-website-picture-1.jpg" alt="Virtual Concierge" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "24/7 Virtual Concierge",
      description: "Direct access to specialists, coaches, and your health team"
    },
    {
      icon: <Image src="/fxmed-van/IMG_0300.jpeg" alt="At-Home Mini-Clinic" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "At-Home Mini-Clinic",
      description: "State-of-the-art mobile van visits for diagnostics and checkups"
    },
    {
      icon: <Image src="/dna-representation-concept.jpg" alt="Root Cause Medicine" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "Root Cause Medicine",
      description: "Functional & preventive care that looks deeper, not just treats symptoms"
    },
    {
      icon: <Image src="/Elderly.png" alt="Elite Support for Elderly" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "Elite Support for the Elderly",
      description: "Compassionate geriatric care tailored for home-based comfort"
    },
    {
      icon: <Image src="/Medication.png" alt="Medication Delivery" width={80} height={80} className="w-20 h-20 object-cover rounded-[12px]" />,
      title: "Medication Delivery",
      description: "Never miss a dose, with full coordination and tracking"
    }
  ]

  const services = [
    {
      icon: <Image src="/Virus.svg" alt="Virus" width={32} height={32} />,
      title: "Chronic Disease Management",
      description: "Hypertension, Diabetes, etc."
    },
    {
      icon: <Image src="/Spade.svg" alt="Spade" width={32} height={32} />,
      title: "Physiotherapy & Pain Management",
      description: "Comprehensive pain relief"
    },
    {
      icon: <Image src="/FirstAidKit.svg" alt="First Aid Kit" width={32} height={32} />,
      title: "Lifestyle Medicine",
      description: "Functional Wellness Assessments"
    },
    {
      icon: <Image src="/DeviceMobile.svg" alt="Device Mobile" width={32} height={32} />,
      title: "Same-Day Teleconsults",
      description: "Direct specialist access"
    },
    {
      icon: <Image src="/BowlFood 2.svg" alt="Bowl Food" width={32} height={32} />,
      title: "Nutrition Coaching",
      description: "Personalized meal plans"
    },
    {
      icon: <Image src="/TestTube 2.svg" alt="Test Tube" width={32} height={32} />,
      title: "Laboratory Testing",
      description: "At-home or via courier"
    },
    {
      icon: <Image src="/FlowerLotus.svg" alt="Flower Lotus" width={32} height={32} />,
      title: "Mental Wellness",
      description: "Psychological support"
    },
    {
      icon: <Image src="/Ambulance 2.svg" alt="Ambulance" width={32} height={32} />,
      title: "Mobile Clinic Access",
      description: "On-demand health visits"
    }
  ]

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] overflow-hidden flex items-center px-[5%] pt-[180px] pb-[100px]">
        {/* Background Image */}
        <div className="absolute inset-0 bg-cover bg-center brightness-[0.35]" 
             style={{backgroundImage: "url('/Hero Background.jpeg')"}}>
        </div>
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,36,25,0.92)] via-[rgba(26,61,46,0.7)] to-[rgba(30,74,53,0.4)]"></div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 text-gold-light px-[18px] py-2 rounded-[30px] text-[0.82rem] font-medium tracking-[0.08em] uppercase mb-6">
            <span className="text-[0.5rem] animate-pulse">●</span>
            PREMIUM HEALTHCARE · CONCIERGE CARE
          </div>
          <div className="mb-6">
            <h1 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2.5rem,5vw,4rem)] leading-[1.15] text-white">
              Concierge Care with
            </h1>
            <Image
              src="/FXMed Elite White.svg"
              alt="FXMed Elite"
              width={400}
              height={80}
              className="h-[clamp(3rem,6vw,5rem)] w-auto mt-2 mx-auto"
            />
          </div>
          <p className="font-dm-sans text-white/90 text-[1.1rem] leading-[1.7] max-w-3xl">
            Your health deserves more than a clinic waiting room. FXMed Elite is a premium healthcare service crafted for professionals, dignitaries, and distinguished seniors who value privacy, precision, and lifestyle-integrated care.
            We deliver world-class chronic and geriatric care directly to your home, office, or estate—via our fully equipped luxury mobile health units and advanced telemedicine platforms.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Why FXMed Elite
            </div>
            <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4 tracking-tight">
              Healthcare that <span className="italic bg-[#CADE68] px-2 rounded">fits your lifestyle</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex gap-5 items-start bg-[#FCFFF0] rounded-[16px] p-6 border border-green-deep/7 transition-all hover:translate-x-1.5 hover:border-green-light hover:shadow-custom"
              >
                <div className="w-20 h-20 rounded-[12px] bg-green-deep flex items-center justify-center text-[1.3rem] flex-shrink-0 overflow-hidden">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-2">{benefit.title}</h3>
                  <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-[#FCFFF0] py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Services
            </div>
            <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4 tracking-tight">
              Your <span className="italic bg-[#CADE68] px-2 rounded">Personalized Care Plan</span> May Include
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div 
                key={index}
                className="bg-white rounded-[16px] p-6 border border-green-deep/7 transition-all hover:translate-y-[-4px] hover:shadow-custom"
              >
                <div className="w-12 h-12 flex items-center justify-center text-[1.3rem] mb-4">
                  {service.icon}
                </div>
                <h3 className="font-dm-sans font-bold text-green-deep text-base mb-2">{service.title}</h3>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-[100px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Pricing
            </div>
            <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Choose Your Elite Plan
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.1rem] leading-[1.7] max-w-[600px] mx-auto">
              Premium concierge care tailored to your lifestyle. Transparent pricing, no surprise bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-[24px] p-8 border-2 border-gold shadow-custom-hover relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gold text-green-deep px-4 py-1 rounded-full text-[0.75rem] font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="mb-6 mt-2">
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">Gold</h3>
                <div className="mb-4">
                  <span className="font-dm-sans font-bold text-green-deep text-[3rem]">₦450,000</span>
                </div>
                <div className="mb-4">
                  <span className="font-dm-sans text-text-mid text-[0.9rem]">per month · up to 3 family members</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Monthly house call (vitals + physical)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">4 tele-consults per month</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Basic labs (CBC, Lipid, KFT, LFT, HbA1c)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">1 massage or premium facial</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">1 IV therapy infusion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Priority booking · 10% off add-ons</span>
                </li>
              </ul>
              
              <button className="w-full font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[30px] font-semibold text-[0.95rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px]">
                Get Started
              </button>
            </div>

            <div className="bg-white rounded-[24px] p-8 border border-green-deep/10 shadow-custom hover:shadow-custom-hover transition-all">
              <div className="mb-6">
                <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">Platinum</h3>
                <div className="mb-4">
                  <span className="font-dm-sans font-bold text-green-deep text-[3rem]">₦700,000</span>
                </div>
                <div className="mb-4">
                  <span className="font-dm-sans text-text-mid text-[0.9rem]">per month · up to 5 family members</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Monthly house call</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">6 tele-consults per month</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Comprehensive labs + ECG + Ultrasound</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">2 massage sessions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">2 IV drip therapy sessions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-mid mr-3 mt-1">✓</span>
                  <span className="font-dm-sans text-text-mid text-[0.95rem]">Priority specialist access · 15% off</span>
                </li>
              </ul>
              
              <button className="w-full font-dm-sans bg-green-deep text-cream px-6 py-3 rounded-[30px] font-semibold text-[0.95rem] transition-all hover:bg-green-mid hover:transform hover:translate-y-[-2px]">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-cream py-[90px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Elite Testimonials
            </div>
            <h2 className="font-dm-sans font-extrabold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              What Our Elite Clients Say
            </h2>
            <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-[600px] mx-auto">
              Authentic experiences from distinguished clients who've transformed their health with FXMed Elite concierge care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  C
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Chief B.
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "The discreet nature of FXMed Elite is exactly what I needed. As a public figure, privacy is paramount. Their team handles everything with absolute professionalism and confidentiality."
                  </p>
                </div>
              </div>
            </div>

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
                  M
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Mrs. A.
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "The care my elderly mother receives through FXMed Elite is exceptional. Having the mobile clinic come to her home eliminates the stress of hospital visits. The team treats her like family."
                  </p>
                </div>
              </div>
            </div>

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
                  D
                </div>
                <div>
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.3rem] mb-3">
                    Dr. O.
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-xl">★</span>
                    ))}
                  </div>
                  <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] italic">
                    "As a busy executive, I don't have time for waiting rooms. FXMed Elite's 24/7 concierge service and priority specialist access have transformed how I manage my health. Worth every naira."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-[90px] px-[5%] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-cover bg-top brightness-[0.5]"
             style={{backgroundImage: "url('/fxmed-website-picture.png')"}}>
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-deep/80 to-green-mid/80"></div>

        {/* Content */}
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-dm-sans font-extrabold text-white text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
            Ready to Experience Elite Care?
          </h2>
          <p className="font-dm-sans text-white/90 text-[1.1rem] mb-8 max-w-2xl mx-auto">
            Take the first step toward a life free from chronic illness, fatigue, and guesswork. Our team is ready to build your personalized wellness plan.
          </p>
          <button className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg hover:bg-gold-light transition-all transform hover:scale-105 shadow-xl">
            Book an Appointment
          </button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
