import { FestiveBookButton } from '@/components/FestiveBooking'
import FestiveFlyer from '@/components/FestiveFlyer'
import { festiveBookingUrl, festiveOffer, festiveOfferPhase, wellnessPackages } from '@/lib/festive-offer'

export default function FestivePackages() {
  if (festiveOfferPhase() !== 'live') return null

  return (
    <section id={festiveOffer.sectionId} aria-labelledby="festive-heading" className="scroll-mt-28 overflow-hidden bg-[#f3f6e9] px-[5%] py-16 font-dm-sans md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div>
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              The festive wellness collection
            </div>
            <h2 id="festive-heading" className="font-dm-sans text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.15] tracking-tight text-green-deep">
              Give something<br />that matters.<br />
              <span className="text-green-mid">Give health.</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-mid">
              A gift of care, wellness and thoughtfulness. Celebrate parents, partners, mentors, clients and loved ones with an FXMed Health-Hamper wellness package.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium text-green-deep">
              {['Care at home', 'Thoughtful gifting', 'For the people you value'].map((label) => (
                <span key={label} className="rounded-full bg-[#e3edc6] px-4 py-2">{label}</span>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#wellness-package-options" className="primary px-7 py-4">Explore the packages</a>
              <a href={festiveBookingUrl()} target="_blank" rel="noopener noreferrer" className="secondary px-6 py-4">Enquire on WhatsApp</a>
            </div>
            <p className="mt-5 text-sm text-text-mid">Essential ₦150,000 <span aria-hidden="true" className="mx-2">·</span> Premium ₦300,000</p>
          </div>
          <FestiveFlyer />
        </div>

        <div id="wellness-package-options" className="mt-16 scroll-mt-28 md:mt-20">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-mid">Choose your gift of care</p>
            <h3 className="mt-2 font-dm-sans text-2xl font-bold leading-[1.15] text-green-deep md:text-3xl">Two ways to give wellness.</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {wellnessPackages.map((pkg) => (
              <article key={pkg.name} className={`flex flex-col rounded-[28px] border p-7 md:p-9 ${pkg.premium ? 'border-green-deep bg-green-deep text-white' : 'border-green-deep/10 bg-white text-green-deep'}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${pkg.premium ? 'text-gold' : 'text-green-mid'}`}>{pkg.premium ? 'Care, comfort & a special gift' : 'The essentials, thoughtfully covered'}</p>
                <h4 className="mt-3 text-2xl font-bold">{pkg.name}</h4>
                <p className="mt-4 text-4xl font-bold tracking-tight">{pkg.price}</p>
                <p className={`mt-3 text-sm leading-relaxed ${pkg.premium ? 'text-white/75' : 'text-text-mid'}`}>{pkg.description}</p>
                <ul className={`my-7 space-y-3 border-t pt-7 ${pkg.premium ? 'border-white/15' : 'border-green-deep/10'}`}>
                  {pkg.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-3 text-sm leading-6">
                      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${pkg.premium ? 'bg-gold text-green-deep' : 'bg-[#e3edc6] text-green-deep'}`}>✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <details className={`mb-7 rounded-xl p-4 text-sm ${pkg.premium ? 'bg-white/10' : 'bg-[#f3f6e9]'}`}>
                  <summary className="cursor-pointer font-semibold">What’s included in the laboratory assessment?</summary>
                  <p className="mt-3 leading-relaxed">{pkg.laboratory}</p>
                </details>
                <FestiveBookButton packageName={pkg.name} className={`mt-auto flex items-center justify-center gap-2 rounded-full px-6 py-4 text-center font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${pkg.premium ? 'bg-gold text-green-deep hover:bg-gold-light' : 'bg-green-deep text-white hover:bg-green-mid'}`}>
                  Book {pkg.name}
                </FestiveBookButton>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-text-mid">Booking for loved ones, your team or a community? <a href={festiveBookingUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-mid underline underline-offset-4">Talk to FXMed on WhatsApp.</a></p>
        </div>
      </div>
    </section>
  )
}
