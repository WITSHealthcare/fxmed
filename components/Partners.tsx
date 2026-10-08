import Image from 'next/image'

// Logo files live in public/partners. A partner without a `logo` is shown by
// name instead.
const partners: Array<{ name: string; logo?: string }> = [
  { name: 'Mecure', logo: '/partners/mecure.svg' },
  { name: 'Healthtracka', logo: '/partners/healthtracka.svg' },
  { name: 'Grandville Medical Center', logo: '/partners/grandville.png' },
]

// The track slides left by half its width and restarts, so each half must be
// identical and at least as wide as the screen for the loop to be seamless.
// Six copies of three logos per half covers screens up to 4K wide.
const COPIES = 12

export default function Partners() {
  return (
    <section aria-labelledby="partners-heading" className="bg-cream py-12 overflow-hidden">
      <h2 id="partners-heading" className="font-dm-sans text-green-mid text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-6 px-[5%] text-center">
        Proudly working with
      </h2>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        {Array.from({ length: COPIES }, (_, copy) => (
          <ul key={copy} aria-hidden={copy > 0 || undefined} className="flex shrink-0 items-center">
            {partners.map((partner) => (
              // Spacing is padding rather than a gap so every copy is exactly
              // the same width.
              <li key={partner.name} className="px-4 md:px-7">
                {partner.logo ? (
                  <div className="relative h-10 w-32 md:h-12 md:w-40">
                    {/* Eager, so a copy that starts off screen is not still loading as it slides in. */}
                    <Image src={partner.logo} alt={partner.name} fill sizes="160px" loading="eager" className="object-contain grayscale opacity-70" />
                  </div>
                ) : (
                  <span className="font-dm-sans font-bold text-green-deep text-[1.25rem] md:text-[1.5rem] tracking-tight whitespace-nowrap">
                    {partner.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}
