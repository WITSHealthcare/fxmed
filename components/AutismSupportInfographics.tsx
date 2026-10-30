import Image from 'next/image'

// Educational graphics for the Autism Support program page. Figures carry their
// source so clinicians can check them before they change.

const iconPaths = {
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3',
  leaf: 'M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4',
  chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  utensils: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  droplet: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
  cloud: 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
}

const imageIcons = {
  gut: '/healthicons_intestine.svg',
  brain: '/Brain.svg',
}

export type IconName = keyof typeof iconPaths | keyof typeof imageIcons

export function Icon({ name, className = 'w-6 h-6' }: { name: IconName; className?: string }) {
  if (name in imageIcons) {
    return (
      <span className={`relative inline-block ${className}`}>
        <Image src={imageIcons[name as keyof typeof imageIcons]} alt="" fill sizes="48px" />
      </span>
    )
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={iconPaths[name as keyof typeof iconPaths]} />
    </svg>
  )
}

export function SectionHeading({ eyebrow, title, intro, light = false }: { eyebrow: string; title: string; intro?: string; light?: boolean }) {
  return (
    <div className="text-center mb-14 max-w-3xl mx-auto">
      <div className={`inline-block px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4 ${light ? 'text-gold bg-gold/15' : 'text-green-mid bg-green-mid/10'}`}>
        {eyebrow}
      </div>
      <h2 className={`font-dm-sans font-bold text-3xl md:text-4xl mb-5 ${light ? 'text-white' : 'text-green-deep'}`}>{title}</h2>
      {intro && <p className={`font-dm-sans text-lg leading-[1.7] ${light ? 'text-cream/85' : 'text-text-mid'}`}>{intro}</p>}
    </div>
  )
}

/* ---------- Autism at a glance ---------- */

function DotGrid() {
  return (
    <div className="grid grid-cols-10 gap-[3px] w-[110px] mx-auto" aria-hidden="true">
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className={`block w-[8px] h-[8px] rounded-full ${i === 44 ? 'bg-gold scale-125' : 'bg-cream/25'}`} />
      ))}
    </div>
  )
}

function CompareBars({ times }: { times: number }) {
  return (
    <div className="flex items-end justify-center gap-5 h-[110px]" aria-hidden="true">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-9 rounded-t-md bg-cream/30" style={{ height: `${100 / times}px` }} />
        <span className="text-[0.65rem] text-cream/70 uppercase tracking-wider">Others</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-9 rounded-t-md bg-gold" style={{ height: '100px' }} />
        <span className="text-[0.65rem] text-cream/70 uppercase tracking-wider">Autistic</span>
      </div>
    </div>
  )
}

function RangeRing() {
  const circumference = 2 * Math.PI * 42
  return (
    <svg viewBox="0 0 110 110" className="w-[110px] h-[110px] mx-auto -rotate-90" aria-hidden="true">
      <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(248,243,234,0.18)" strokeWidth="12" />
      <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(201,226,101,0.45)" strokeWidth="12" strokeDasharray={`${circumference * 0.8} ${circumference}`} />
      <circle cx="55" cy="55" r="42" fill="none" stroke="#C9E265" strokeWidth="12" strokeDasharray={`${circumference * 0.5} ${circumference}`} />
    </svg>
  )
}

const glanceStats = [
  { graphic: <DotGrid />, value: '1 in 100', label: 'children worldwide are autistic', source: 'World Health Organization, 2023' },
  { graphic: <CompareBars times={4} />, value: '4×', label: 'more likely to have digestive problems such as constipation and tummy pain', source: 'McElhanon et al., Pediatrics, 2014' },
  { graphic: <CompareBars times={5} />, value: '5×', label: 'more likely to have feeding challenges, including very selective eating', source: 'Sharp et al., J Autism Dev Disord, 2013' },
  { graphic: <RangeRing />, value: '50–80%', label: 'of autistic children have difficulty falling or staying asleep', source: 'Cortesi et al., Sleep Med Rev, 2010' },
]

export function AutismAtAGlance() {
  return (
    <section className="relative py-20 px-[5%] bg-green-deep overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-green-mid/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          light
          eyebrow="Autism at a Glance"
          title="Common, and often missed"
          intro="Autistic children are much more likely than other children to live with physical health problems that can go unnoticed, especially when a child finds it hard to say what hurts."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {glanceStats.map((stat) => (
            <div key={stat.value} className="bg-white/5 border border-cream/15 rounded-2xl p-7 text-center backdrop-blur-sm">
              <div className="h-[120px] flex items-center justify-center mb-5">{stat.graphic}</div>
              <div className="font-dm-sans font-bold text-4xl text-gold mb-2">{stat.value}</div>
              <p className="font-dm-sans text-cream/90 leading-[1.5] mb-4">{stat.label}</p>
              <p className="font-dm-sans text-[0.7rem] text-cream/50 uppercase tracking-wider">{stat.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Gut–brain connection ---------- */

const gutBrainPathways = [
  { title: 'The vagus nerve', description: 'A direct line of nerves runs between the gut and the brain, carrying signals both ways, including feelings of discomfort and pain.', colour: 'bg-green-mid' },
  { title: 'Immune signals', description: 'Inflammation in the gut releases chemical messengers that travel through the blood and can affect how the brain and body feel.', colour: 'bg-green-light' },
  { title: 'Gut bacteria', description: 'Trillions of bacteria in the gut help digest food and make substances the body uses. Diet strongly shapes which bacteria thrive.', colour: 'bg-[#9fb83a]' },
]

export function GutBrainConnection() {
  return (
    <section className="py-20 px-[5%] bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Learn"
          title="The gut–brain connection"
          intro="The gut and brain are in constant conversation. When the gut is uncomfortable, it can show up as poor sleep, irritability or harder days."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="bg-[#FCFFF0] rounded-3xl p-6 border border-green-deep/10">
            <svg viewBox="0 0 320 420" className="w-full max-w-[340px] mx-auto" role="img" aria-label="Diagram showing the brain and gut connected by three pathways: the vagus nerve, immune signals and gut bacteria">
              <style>{`.gb-flow{stroke-dasharray:6 7;animation:gb-flow 1.4s linear infinite}@keyframes gb-flow{to{stroke-dashoffset:-26}}@media (prefers-reduced-motion:reduce){.gb-flow{animation:none}}`}</style>
              <defs>
                <marker id="gb-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="#1a3d2e" />
                </marker>
              </defs>
              <path d="M118 108 C 50 175, 50 245, 118 312" fill="none" stroke="#52b788" strokeWidth="4" strokeLinecap="round" className="gb-flow" markerStart="url(#gb-arrow)" markerEnd="url(#gb-arrow)" />
              <path d="M160 132 L160 288" fill="none" stroke="#2d6a4f" strokeWidth="4" strokeLinecap="round" className="gb-flow" markerStart="url(#gb-arrow)" markerEnd="url(#gb-arrow)" />
              <path d="M202 108 C 270 175, 270 245, 202 312" fill="none" stroke="#9fb83a" strokeWidth="4" strokeLinecap="round" className="gb-flow" markerStart="url(#gb-arrow)" markerEnd="url(#gb-arrow)" />

              <circle cx="160" cy="70" r="58" fill="#f8f3ea" stroke="#C9E265" strokeWidth="4" />
              <image href="/Brain.svg" x="124" y="34" width="72" height="72" />
              <circle cx="160" cy="350" r="58" fill="#f8f3ea" stroke="#C9E265" strokeWidth="4" />
              <image href="/healthicons_intestine.svg" x="124" y="314" width="72" height="72" />

              {[
                { x: 160, y: 210, n: 1, fill: '#2d6a4f' },
                { x: 67, y: 210, n: 2, fill: '#52b788' },
                { x: 253, y: 210, n: 3, fill: '#9fb83a' },
              ].map((badge) => (
                <g key={badge.n}>
                  <circle cx={badge.x} cy={badge.y} r="16" fill={badge.fill} stroke="#fff" strokeWidth="3" />
                  <text x={badge.x} y={badge.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="sans-serif">{badge.n}</text>
                </g>
              ))}
              <text x="226" y="40" fontSize="15" fontWeight="700" fill="#1a3d2e" fontFamily="sans-serif">Brain</text>
              <text x="226" y="398" fontSize="15" fontWeight="700" fill="#1a3d2e" fontFamily="sans-serif">Gut</text>
            </svg>
          </div>

          <div className="space-y-6">
            {gutBrainPathways.map((pathway, index) => (
              <div key={pathway.title} className="flex gap-5">
                <div className={`w-11 h-11 rounded-full ${pathway.colour} text-white font-bold flex items-center justify-center flex-shrink-0 shadow-md`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-dm-sans font-semibold text-xl text-green-deep mb-1.5">{pathway.title}</h3>
                  <p className="font-dm-sans text-text-mid leading-[1.65]">{pathway.description}</p>
                </div>
              </div>
            ))}
            <div className="bg-gold/20 border-l-4 border-gold p-5 rounded-lg">
              <p className="font-dm-sans text-green-deep leading-[1.6]">
                <strong>Why it matters:</strong> research into the gut–brain connection is still growing, but one thing is clear.
                A child in discomfort cannot feel or do their best, so easing digestive problems is always worth it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- The cycle ---------- */

const cycleSteps: { title: string; description: string; icon: IconName }[] = [
  { title: 'Tummy discomfort', description: 'Constipation or pain that is hard to put into words', icon: 'gut' },
  { title: 'Poor sleep', description: 'Discomfort and restlessness disturb sleep', icon: 'moon' },
  { title: 'Harder days', description: 'Tiredness lowers patience and makes coping harder', icon: 'cloud' },
  { title: 'Fewer foods', description: 'Stress narrows the foods a child will accept', icon: 'utensils' },
  { title: 'Nutrient gaps', description: 'A limited diet leaves gaps in fibre, iron and more', icon: 'droplet' },
]

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return { x: 200 + radius * Math.cos(rad), y: 200 + radius * Math.sin(rad) }
}

export function HealthCycle() {
  const nodeAngles = cycleSteps.map((_, i) => -90 + i * 72)
  const arcs = nodeAngles.map((angle) => {
    const start = polar(angle + 22, 160)
    const end = polar(angle + 50, 160)
    return `M${start.x.toFixed(1)} ${start.y.toFixed(1)} A160 160 0 0 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  })

  return (
    <section className="py-20 px-[5%] bg-[#FCFFF0]">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Learn"
          title="How small problems feed each other"
          intro="Physical health issues rarely travel alone. Each one can make the next one worse, so we look at the whole picture instead of one symptom at a time."
        />

        {/* Circular diagram from md up */}
        <div className="hidden md:block relative w-full max-w-[620px] aspect-square mx-auto">
          <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <defs>
              <marker id="cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0L10 5L0 10z" fill="#2d6a4f" />
              </marker>
            </defs>
            <circle cx="200" cy="200" r="160" fill="none" stroke="#1a3d2e" strokeOpacity="0.08" strokeWidth="26" />
            {arcs.map((d) => (
              <path key={d} d={d} fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#cycle-arrow)" />
            ))}
          </svg>
          <div className="absolute inset-[30%] rounded-full bg-green-deep text-center flex flex-col items-center justify-center p-6 shadow-xl">
            <Icon name="refresh" className="w-7 h-7 text-gold mb-2" />
            <p className="font-dm-sans font-semibold text-white leading-[1.35]">Breaking the cycle</p>
            <p className="font-dm-sans text-xs text-cream/75 mt-1 leading-[1.4]">We work on every link at the same time</p>
          </div>
          {cycleSteps.map((step, i) => {
            const { x, y } = polar(nodeAngles[i], 160)
            return (
              <div
                key={step.title}
                className="absolute w-40 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-lg border border-green-deep/10 p-3 text-center"
                style={{ left: `${(x / 400) * 100}%`, top: `${(y / 400) * 100}%` }}
              >
                <div className="w-10 h-10 rounded-full bg-gold/30 text-green-deep flex items-center justify-center mx-auto mb-1.5">
                  <Icon name={step.icon} className="w-5 h-5" />
                </div>
                <p className="font-dm-sans font-semibold text-sm text-green-deep">{step.title}</p>
                <p className="font-dm-sans text-[0.72rem] text-text-mid leading-[1.35] mt-0.5">{step.description}</p>
              </div>
            )
          })}
        </div>

        {/* Stacked version on mobile */}
        <ol className="md:hidden space-y-3">
          {cycleSteps.map((step, i) => (
            <li key={step.title}>
              <div className="flex items-center gap-4 bg-white rounded-2xl shadow-md border border-green-deep/10 p-4">
                <div className="w-11 h-11 rounded-full bg-gold/30 text-green-deep flex items-center justify-center flex-shrink-0">
                  <Icon name={step.icon} className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-dm-sans font-semibold text-green-deep">{step.title}</p>
                  <p className="font-dm-sans text-sm text-text-mid leading-[1.4]">{step.description}</p>
                </div>
              </div>
              <div className="text-center text-green-mid text-lg leading-none py-1" aria-hidden="true">{i === cycleSteps.length - 1 ? '↺' : '↓'}</div>
            </li>
          ))}
          <li className="bg-green-deep rounded-2xl p-5 text-center">
            <p className="font-dm-sans font-semibold text-white">Breaking the cycle</p>
            <p className="font-dm-sans text-sm text-cream/75">We work on every link at the same time</p>
          </li>
        </ol>
      </div>
    </section>
  )
}

/* ---------- Signs to look out for ---------- */

const signs: { title: string; description: string; icon: IconName }[] = [
  { title: 'Pressing or holding the tummy', description: 'Leaning the belly against furniture or holding it can be a sign of pain.', icon: 'gut' },
  { title: 'Changes in stools', description: 'Hard, painful, infrequent or very loose stools.', icon: 'droplet' },
  { title: 'A very short list of foods', description: 'Accepting only a handful of foods, or dropping foods they used to eat.', icon: 'utensils' },
  { title: 'Restless nights', description: 'Trouble falling asleep, frequent night waking or very early rising.', icon: 'moon' },
  { title: 'Sudden behaviour changes', description: 'New distress, aggression or self-injury, especially around meals or the toilet.', icon: 'activity' },
  { title: 'Often tired or unwell', description: 'Low energy, pale skin or frequent infections.', icon: 'zap' },
]

export function SignsToWatch({ onBook }: { onBook: () => void }) {
  return (
    <section className="py-20 px-[5%] bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Signs to look out for"
          title="When behaviour may be saying “something hurts”"
          intro="Many autistic children show pain or discomfort through behaviour rather than words. These signs don’t always mean a physical problem, but they are worth checking."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {signs.map((sign) => (
            <div key={sign.title} className="group flex gap-4 p-6 rounded-2xl border border-green-deep/10 bg-[#FCFFF0] transition-all hover:-translate-y-1 hover:shadow-lg hover:border-gold">
              <div className="w-12 h-12 rounded-xl bg-green-deep text-gold flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 [&_img]:brightness-0 [&_img]:invert">
                <Icon name={sign.icon} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-1">{sign.title}</h3>
                <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">{sign.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <p className="font-dm-sans text-text-mid">Recognise some of these in your child?</p>
          <button
            onClick={onBook}
            className="font-dm-sans bg-green-deep text-white px-6 py-3 rounded-[50px] font-semibold transition-all hover:bg-green-mid"
          >
            Talk to our team
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------- Nutrients we check ---------- */

const nutrients = [
  { symbol: 'Fe', name: 'Iron', role: 'Energy, focus and restful sleep', watch: 'Often low with limited diets; low iron is linked to restless sleep' },
  { symbol: 'D', name: 'Vitamin D', role: 'Bones, muscles and immunity', watch: 'Low with little time outdoors or few fortified foods' },
  { symbol: 'B12', name: 'Vitamin B12', role: 'Nerves, energy and red blood cells', watch: 'Low when a child eats little meat, eggs or dairy' },
  { symbol: 'Zn', name: 'Zinc', role: 'Appetite, taste and immunity', watch: 'Low zinc can dull appetite and narrow the diet further' },
  { symbol: 'Ω3', name: 'Omega-3', role: 'Brain and eye health', watch: 'Found in oily fish, which many children refuse' },
  { symbol: 'Ca', name: 'Calcium', role: 'Strong bones and teeth', watch: 'Often low on dairy-free or very limited diets' },
]

export function NutrientsWeCheck() {
  return (
    <section className="py-20 px-[5%] bg-[#FCFFF0]">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Nutrition"
          title="Nutrients we check"
          intro="Selective eating can quietly leave gaps. A simple blood test shows what your child needs, so we only supplement what is actually low."
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {nutrients.map((nutrient) => (
            <div key={nutrient.symbol} className="bg-white rounded-2xl border border-green-deep/10 overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="bg-gradient-to-br from-green-deep to-green-mid p-5 flex items-end justify-between">
                <span className="font-dm-sans font-bold text-4xl md:text-5xl text-gold leading-none">{nutrient.symbol}</span>
                <Icon name="leaf" className="w-6 h-6 text-cream/40" />
              </div>
              <div className="p-5">
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep">{nutrient.name}</h3>
                <p className="font-dm-sans text-sm font-medium text-green-mid mb-3">{nutrient.role}</p>
                <p className="font-dm-sans text-[0.8rem] text-text-mid leading-[1.55] hidden sm:block">{nutrient.watch}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Family journey ---------- */

const journey: { title: string; description: string; icon: IconName }[] = [
  { title: 'Consultation', description: 'Share your child’s story, health history and your main concerns.', icon: 'chat' },
  { title: 'Testing', description: 'Gut and nutrient tests, with home sample collection where possible.', icon: 'flask' },
  { title: 'Your plan', description: 'A personal plan for food, sleep and supplements where needed.', icon: 'clipboard' },
  { title: 'Ongoing support', description: 'Regular check-ins to adjust the plan as your child progresses.', icon: 'users' },
  { title: 'Review', description: 'We repeat key tests and look at progress together.', icon: 'refresh' },
]

export function FamilyJourney() {
  return (
    <section className="py-20 px-[5%] bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="How it works"
          title="Your family’s journey"
          intro="Clear steps, at a pace that suits your child."
        />
        <ol className="relative grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4">
          <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-[3px] bg-gradient-to-r from-gold via-green-light to-green-mid rounded-full" aria-hidden="true" />
          <div className="md:hidden absolute top-0 bottom-0 left-8 w-[3px] bg-gradient-to-b from-gold via-green-light to-green-mid rounded-full" aria-hidden="true" />
          {journey.map((step, index) => (
            <li key={step.title} className="relative flex md:flex-col md:items-center md:text-center gap-5 md:gap-0">
              <div className="relative z-10 w-16 h-16 rounded-full bg-green-deep text-gold flex items-center justify-center shadow-lg ring-8 ring-white flex-shrink-0 md:mb-5">
                <Icon name={step.icon} className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-green-deep text-xs font-bold flex items-center justify-center">{index + 1}</span>
              </div>
              <div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-1.5">{step.title}</h3>
                <p className="font-dm-sans text-sm text-text-mid leading-[1.6]">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- Myths and facts ---------- */

// A `concern` card answers a worry many parents genuinely hold, so it is framed as
// a question to explore rather than a myth to dismiss.
const myths: { myth: string; fact: string; concern?: boolean }[] = [
  { myth: 'Autism is caused by parenting.', fact: 'Autism is a lifelong developmental difference with strong genetic roots. It is not caused by anything a parent did.' },
  {
    concern: true,
    myth: '“My child changed after their vaccines.”',
    fact: 'Many parents first notice signs of autism between 12 and 18 months, the same age children get several routine vaccines, so the timing can feel like more than coincidence. What you saw is real, and any change in your child deserves a doctor’s attention. Studies following millions of children have found autism is just as common in children who were not vaccinated, which tells us vaccines are not the cause.',
  },
  { myth: 'A special diet can cure autism.', fact: 'No diet cures autism. Good nutrition can ease tummy problems, sleep and energy, which helps a child feel better.' },
  { myth: 'Autistic children don’t feel pain.', fact: 'Many feel pain but show it differently, often through changes in behaviour rather than words.' },
]

export function MythsAndFacts() {
  return (
    <section className="py-20 px-[5%] bg-cream">
      <div className="max-w-5xl mx-auto">
        <SectionHeading eyebrow="Myths & facts" title="Common myths and concerns" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myths.map((item) => (
            <div key={item.myth} className="bg-white rounded-2xl shadow-md overflow-hidden border border-green-deep/10">
              {item.concern ? (
                <div className="flex items-start gap-3 p-5 bg-gold/20 border-b border-gold/40">
                  <span className="w-7 h-7 rounded-full bg-gold text-green-deep flex items-center justify-center flex-shrink-0">
                    <Icon name="chat" className="w-4 h-4" />
                  </span>
                  <p className="font-dm-sans text-text-dark"><span className="font-semibold text-green-deep">A common concern: </span>{item.myth}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-5 bg-red-50 border-b border-red-100">
                  <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="x" className="w-4 h-4" />
                  </span>
                  <p className="font-dm-sans text-text-dark"><span className="font-semibold text-red-700">Myth: </span>{item.myth}</p>
                </div>
              )}
              <div className="flex items-start gap-3 p-5">
                <span className="w-7 h-7 rounded-full bg-green-light/20 text-green-mid flex items-center justify-center flex-shrink-0">
                  <Icon name={item.concern ? 'heart' : 'check'} className="w-4 h-4" />
                </span>
                <p className="font-dm-sans text-text-mid leading-[1.6]"><span className="font-semibold text-green-deep">{item.concern ? 'What we know: ' : 'Fact: '}</span>{item.fact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
