import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'
import CompensationModel from '@/components/ambassadors/CompensationModel'

const clientServices = [
  { icon: '/AmbulanceIcon.svg', iconBackground: 'bg-[#FFD2E2]', title: 'Concierge care', text: 'Fully equipped luxury medical vans, tele-consultations, and personalized in-home care.' },
  { icon: '/Dna.svg', iconColor: '#2D6A4F', title: 'Functional medicine', text: 'Root-cause, lifestyle-oriented healthcare focused on prevention and chronic-condition management.' },
  { icon: '/ShieldCheckered.svg', iconBackground: 'bg-[#FFEAE3]', title: 'Privacy and convenience', text: 'A discreet, accessible healthcare experience designed around each member.' },
  { icon: '/SealCheck.svg', iconColor: '#874EAA', iconBackground: 'bg-[#E5E4FF]', title: 'Exclusive membership tiers', text: 'Membership plans ranging from ₦65,000 to ₦700,000 per month, with tier-specific benefits.' },
  { icon: '/Sparkle.svg', iconBackground: 'bg-[#EAF2FE]', title: 'Wellness add-ons', text: 'Enhanced services including IV drips, massages, detox chef sessions, fitness coaching, and more.' },
]

const benefits = [
  { icon: '/RevenueCommission.png', title: 'Revenue-share commission', text: 'Earn an agreed percentage of the membership fee for every successful referral.' },
  { icon: '/Integrate.png', title: 'An exclusive network', text: 'Become part of a carefully selected network of FXMed Elite Ambassadors.' },
  { icon: '/Calendar.png', title: 'Wellness and networking events', text: 'Receive invitations to selected FXMed Elite wellness and networking experiences.' },
  { icon: '/ClientValue.png', title: 'Greater client value', text: 'Enhance your offering by connecting clients and friends with prestigious healthcare services.' },
]

const steps = [
  ['01', 'Join', 'Apply to register as an FXMed Elite Ambassador.'],
  ['02', 'Onboard', 'Complete the onboarding process and sign the required documents.'],
  ['03', 'Refer', 'Introduce suitable individuals and organizations to FXMed Elite.'],
  ['04', 'Earn', 'Receive your agreed commission after a successful client signup.'],
]

export default function AmbassadorsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navigation />

      <section className="relative flex min-h-[820px] items-center overflow-hidden bg-black px-[5%] pb-24 pt-48 text-white">
        <Image
          src="/Ambassadors.png"
          alt="Two FXMed Elite ambassadors in conversation"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <div className="absolute -right-12 top-16 h-[260px] w-[260px] rounded-full bg-gold/10 blur-2xl" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-gold/40"
          viewBox="0 0 1440 640"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="1">
            <line x1="60" y1="40" x2="180" y2="90" />
            <line x1="180" y1="90" x2="230" y2="60" />
            <line x1="60" y1="40" x2="90" y2="180" />
            <line x1="90" y1="180" x2="140" y2="190" />
            <line x1="180" y1="90" x2="140" y2="190" />
            <line x1="140" y1="190" x2="100" y2="600" strokeOpacity="0.35" />
            <line x1="1200" y1="460" x2="1340" y2="420" />
            <line x1="1340" y1="420" x2="1400" y2="540" />
            <line x1="1200" y1="460" x2="1260" y2="560" />
            <line x1="1260" y1="560" x2="1380" y2="610" />
            <line x1="1400" y1="540" x2="1380" y2="610" />
            <line x1="1340" y1="420" x2="1260" y2="560" />
            <line x1="1320" y1="140" x2="1260" y2="460" strokeOpacity="0.25" />
          </g>
          <g fill="currentColor">
            <circle cx="60" cy="40" r="3" />
            <circle cx="180" cy="90" r="4" className="animate-pulse" />
            <circle cx="230" cy="60" r="2.5" />
            <circle cx="90" cy="180" r="2.5" />
            <circle cx="140" cy="190" r="3" />
            <circle cx="1200" cy="460" r="3" />
            <circle cx="1340" cy="420" r="4" className="animate-pulse" style={{ animationDelay: '1s' }} />
            <circle cx="1400" cy="540" r="2.5" />
            <circle cx="1260" cy="560" r="2.5" />
            <circle cx="1380" cy="610" r="3" />
          </g>
          <g fill="currentColor" opacity="0.5">
            <circle cx="330" cy="50" r="1.5" />
            <circle cx="1170" cy="100" r="1.5" />
            <circle cx="60" cy="600" r="1.5" />
            <circle cx="1400" cy="70" r="1.5" />
          </g>
        </svg>
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-[670px] text-left">
            <p className="mb-6 inline-flex rounded-full border border-gold/30 bg-gold/10 px-5 py-2 font-dm-sans text-xs font-bold uppercase tracking-[0.18em] text-gold">
              FXMed Elite Ambassador Program
            </p>
            <h1 className="font-dm-sans text-[clamp(2.7rem,6vw,5rem)] font-bold leading-[1.03] tracking-[-0.04em]">
              Connect your<br />network with<br /><span className="text-gold">world-class healthcare.</span>
            </h1>
            <p className="mb-9 mt-7 max-w-xl font-dm-sans text-lg leading-8 text-cream/85">
              An exclusive opportunity for carefully selected partners and individuals to introduce their networks to concierge functional medicine, mobile luxury clinics, and personalized wellness services.
            </p>
            <Link href="/ambassadors/apply" className="inline-flex rounded-full bg-gold px-8 py-4 font-dm-sans font-bold text-green-deep no-underline shadow-lg transition hover:-translate-y-0.5 hover:bg-gold-light">
              Become an FXMed Elite Ambassador
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-[5%] pb-0 pt-[90px]">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">About the program</p>
            <h2 className="font-dm-sans text-[clamp(2rem,4vw,3.2rem)] font-bold leading-tight text-green-deep">A trusted partnership built around excellence and care.</h2>
          </div>
          <div className="space-y-5 font-dm-sans text-lg leading-8 text-text-mid">
            <p>FXMed Elite is redefining healthcare for individuals, families, and executives seeking convenient, personalized care through concierge functional medicine, mobile luxury clinics, and tailored wellness services.</p>
            <p>Our Ambassador Program enables trusted professionals and individuals to connect suitable people and organizations in their networks with this elevated healthcare experience.</p>
            <p>Ambassadors are selected for their alignment with our values of <strong className="text-green-deep">discretion, excellence, and care</strong>.</p>
          </div>
        </div>
      </section>

      <section
        className="relative -mt-10 overflow-hidden px-[5%] sm:-mt-14"
        aria-label="FXMed mobile healthcare equipment"
        style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #ffffff 48%, #FCFFF0 48%, #FCFFF0 100%)' }}
      >
        <div className="mx-auto max-w-2xl">
          <Image
            src="/Equipment-transparent.png"
            alt="FXMed diagnostic equipment arranged around an FXMed laptop"
            width={1412}
            height={760}
            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 1100px"
            className="block h-auto w-full"
          />
        </div>
      </section>

      <section className="bg-[#FCFFF0] px-[5%] pb-[90px] pt-0">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">The client experience</p>
            <h2 className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold text-green-deep">What FXMed Elite provides</h2>
            <p className="mt-4 font-dm-sans text-text-mid">A discreet healthcare membership combining personalized clinical support, convenience, and premium wellness services.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {clientServices.map((service) => (
              <article key={service.title} className="rounded-[20px] border border-green-deep/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-custom-hover">
                <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[12px] ${service.iconBackground || 'bg-gold/30'}`}>
                  {service.iconColor ? (
                    <span
                      aria-hidden="true"
                      className="h-7 w-7"
                      style={{
                        backgroundColor: service.iconColor,
                        WebkitMaskImage: `url(${service.icon})`,
                        maskImage: `url(${service.icon})`,
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                      }}
                    />
                  ) : (
                    <Image src={service.icon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                  )}
                </span>
                <h3 className="mb-3 font-dm-sans text-lg font-bold text-green-deep">{service.title}</h3>
                <p className="font-dm-sans text-sm leading-6 text-text-mid">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-[5%] py-[90px]">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">Ambassador benefits</p>
            <h2 className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold text-green-deep">Build value through trusted introductions</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-[20px] border border-green-deep/10 bg-[#FCFFF0] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-custom-hover">
                <div className="mb-5 flex h-28 items-center justify-center">
                  <Image src={benefit.icon} alt="" width={128} height={128} className="h-28 w-28 object-contain" />
                </div>
                <h3 className="mb-3 font-dm-sans text-xl font-bold text-green-deep">{benefit.title}</h3>
                <p className="font-dm-sans leading-7 text-text-mid">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-green-deep px-[5%] pb-0 pt-[90px] text-white">
        <div className="mx-auto grid max-w-7xl items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:gap-14">
          <div className="pb-[90px]">
            <div className="mb-10 max-w-2xl">
              <p className="mb-4 inline-block rounded-[20px] border border-gold/30 bg-gold/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold">How it works</p>
              <h2 className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold">From application to successful referral</h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {steps.map(([number, title, text]) => (
                <li key={number} className="relative min-h-[220px] rounded-[20px] border border-white/15 bg-white/5 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/40 hover:bg-white/10">
                  <span className="font-dm-sans text-3xl font-bold text-gold">{number}</span>
                  <h3 className="mb-2 mt-8 font-dm-sans text-xl font-bold">{title}</h3>
                  <p className="font-dm-sans text-sm leading-6 text-cream/70">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative min-h-[620px] self-stretch">
            <div className="pointer-events-none absolute inset-x-[12%] bottom-0 h-2/3 rounded-full bg-gold/10 blur-3xl" />
            <Image
              src="/AmbassadorPointing.png"
              alt="FXMed ambassador wearing a black FXMed T-shirt"
              fill
              sizes="(min-width: 1024px) 38vw, 90vw"
              className="object-contain object-bottom"
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-[5%] py-[90px]">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-green-deep/10 bg-cream shadow-custom lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">Who can become an ambassador?</p>
            <h2 className="font-dm-sans text-3xl font-bold text-green-deep">Trusted people with access to the right networks.</h2>
            <p className="mt-4 font-dm-sans leading-7 text-text-mid">Selection is based on alignment with FXMed Elite’s values of discretion, excellence, and care.</p>
          </div>
          <div className="space-y-7 bg-white p-8 sm:p-12">
            <div><h3 className="font-dm-sans text-lg font-bold text-green-deep">Professionals</h3><p className="mt-2 font-dm-sans leading-7 text-text-mid">Healthcare providers, insurance brokers, lifestyle consultants, beauty experts, and fitness trainers.</p></div>
            <div className="border-t border-gray-100 pt-7"><h3 className="font-dm-sans text-lg font-bold text-green-deep">Individuals</h3><p className="mt-2 font-dm-sans leading-7 text-text-mid">Trusted community leaders, influencers, or anyone connected to people seeking personalized, premium healthcare.</p></div>
          </div>
        </div>
      </section>

      <section className="bg-[#FCFFF0] px-[5%] py-[90px]">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">Compensation model</p>
            <h2 className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold text-green-deep">Revenue share for successful referrals</h2>
            <p className="mt-4 font-dm-sans leading-7 text-text-mid">Commission percentages are tailored to partnership level, agreed in writing, and disbursed within 30 days of a client subscription.</p>
          </div>

          <CompensationModel />
        </div>
      </section>

      <section className="bg-white px-[5%] py-[90px]">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl"><p className="mb-4 inline-block rounded-[20px] bg-green-mid/10 px-4 py-1.5 font-dm-sans text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-green-mid">Ambassador terms</p><h2 className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold text-green-deep">A clear, professional partnership</h2></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Independent partner', 'Ambassadors participate as independent partners, not FXMed employees.'],
              ['Compensation', 'Payment is a share of the membership fee, with percentages agreed in writing.'],
              ['Confidentiality', 'Ambassadors must protect FXMed information and the privacy of every prospective or existing client.'],
              ['Termination', 'Either party may end the agreement with notice, subject to the full contract.'],
            ].map(([title, text]) => <article key={title} className="rounded-[20px] border border-green-deep/10 bg-[#FCFFF0] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-custom"><h3 className="font-dm-sans text-lg font-bold text-green-deep">{title}</h3><p className="mt-3 font-dm-sans text-sm leading-6 text-text-mid">{text}</p></article>)}
          </div>
          <p className="mt-5 font-dm-sans text-sm italic text-gray-500">The full Ambassador Agreement is provided during onboarding.</p>
        </div>
      </section>

      <section className="bg-gold px-[5%] py-20 text-center">
        <h2 className="font-dm-sans text-[clamp(2rem,5vw,3.5rem)] font-bold text-green-deep">Ready to join the network?</h2>
        <p className="mx-auto mb-8 mt-4 max-w-2xl font-dm-sans text-lg leading-7 text-green-deep/75">Tell us about your professional background, network, and interest in representing FXMed Elite.</p>
        <Link href="/ambassadors/apply" className="inline-flex rounded-full bg-green-deep px-8 py-4 font-dm-sans font-bold text-white no-underline transition hover:-translate-y-0.5 hover:bg-green-mid">
          Apply to Become an Ambassador
        </Link>
      </section>

      <Footer />
    </main>
  )
}
