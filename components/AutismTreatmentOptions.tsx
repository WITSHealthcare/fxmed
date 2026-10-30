'use client'

import { useState } from 'react'
import { Icon, SectionHeading, type IconName } from '@/components/AutismSupportInfographics'

// Treatment Options tab of the Autism Support page. "Treatment" here means support:
// autism itself is not an illness to cure, so the tab covers therapies, care for
// co-occurring conditions, where functional medicine fits, and what to avoid.

const pillars: { title: string; text: string; icon: IconName }[] = [
  { title: 'Communication and development', text: 'Speech, play, learning and social connection, built on your child’s strengths.', icon: 'chat' },
  { title: 'Daily living and senses', text: 'Sensory needs, motor skills, feeding and everyday independence.', icon: 'heart' },
  { title: 'Physical health', text: 'Digestion, sleep, nutrition and conditions such as epilepsy or ADHD.', icon: 'activity' },
  { title: 'Family and school', text: 'Coaching for parents, support for carers, and the right help in the classroom.', icon: 'users' },
]

type Therapy = { name: string; icon: IconName; what: string; helps: string[]; note?: string }

const therapies: Therapy[] = [
  { name: 'Speech and language therapy', icon: 'chat', what: 'Builds understanding and communication in every form: speech, gestures, pictures and communication devices (AAC).', helps: ['Requests and choices', 'Back-and-forth interaction', 'Understanding instructions'] },
  { name: 'Occupational therapy', icon: 'heart', what: 'Helps with sensory processing, fine motor skills and everyday tasks such as dressing, toileting and eating.', helps: ['Sensory overload', 'Handwriting and play skills', 'Self-care routines'] },
  { name: 'Play-based developmental approaches', icon: 'users', what: 'Programmes such as the Early Start Denver Model and JASPER use play and daily routines to build communication. Parents are coached to use them at home.', helps: ['Shared attention', 'Play and imitation', 'Early language'] },
  { name: 'Behavioural approaches (ABA)', icon: 'clipboard', what: 'Widely used, but programmes vary a great deal. Look for ones that are play-based, follow your child’s interests and set goals that matter to your child.', helps: ['Learning new skills', 'Reducing distress', 'Daily routines'], note: 'Some autistic adults have raised concerns about older, rigid styles. A good programme puts your child’s wellbeing first.' },
  { name: 'Feeding therapy', icon: 'utensils', what: 'Gentle, step-by-step support for very selective eating, often with a dietitian.', helps: ['Accepting new foods', 'Mealtime stress', 'Nutrition gaps'] },
  { name: 'Educational support', icon: 'leaf', what: 'An individual learning plan, visual schedules and classroom adjustments that help your child learn.', helps: ['Learning and attention', 'Transitions', 'Friendships at school'] },
  { name: 'Emotional and social support', icon: 'shield', what: 'Adapted cognitive behavioural therapy (CBT) has good evidence for anxiety in autistic children. Social groups can build confidence.', helps: ['Anxiety and worry', 'Managing big feelings', 'Making friends'] },
]

const medical: [string, IconName, string][] = [
  ['Constipation and tummy pain', 'gut', 'Fibre, fluids and routines first; sometimes gentle medicines. Pain is a common, treatable cause of distress.'],
  ['Sleep problems', 'moon', 'Consistent routines and checking iron levels first. Melatonin can help with falling asleep, under a doctor’s guidance.'],
  ['Anxiety', 'cloud', 'Adapted CBT and predictable routines. Medication is sometimes added for persistent anxiety.'],
  ['ADHD', 'zap', 'Classroom and home strategies. ADHD medicines can also help autistic children with attention and impulsivity.'],
  ['Epilepsy', 'activity', 'More common in autism. Staring spells or sudden changes need a neurologist’s review and treatment.'],
  ['Severe irritability', 'heart', 'Behaviour support and looking for causes such as pain. For some children, doctors prescribe medicine with close monitoring.'],
]

const evidence: { level: string; tone: string; label: string; items: string[] }[] = [
  { level: 'Well supported', tone: 'border-[#52b788]', label: 'text-green-mid', items: ['Speech and language therapy, including AAC', 'Occupational therapy', 'Play-based developmental programmes', 'Parent coaching', 'Adapted CBT for anxiety', 'Treating co-occurring conditions'] },
  { level: 'Helpful for some', tone: 'border-[#C9E265]', label: 'text-[#6f8a12]', items: ['Melatonin for falling asleep', 'Correcting proven nutrient deficiencies', 'Feeding therapy for selective eating', 'Medicines for ADHD, anxiety or severe irritability'] },
  { level: 'Still being studied', tone: 'border-[#e9b949]', label: 'text-[#9a6a00]', items: ['Probiotics and the gut microbiome', 'Omega-3 and vitamin D supplements', 'Gluten-free, casein-free diets (unless coeliac or allergic)'] },
  { level: 'Avoid', tone: 'border-[#b42318]', label: 'text-[#b42318]', items: ['Chelation therapy', 'Chlorine dioxide (MMS) or other “bleach” products', 'Unproven stem cell injections', 'Hyperbaric oxygen marketed for autism', 'Any product promising a cure'] },
]

const fxmedSteps: [string, string][] = [
  ['Listen', 'A detailed consultation about your child’s health, diet, sleep, digestion and development.'],
  ['Test wisely', 'Targeted lab tests only where they will change care, starting with the basics.'],
  ['Personal plan', 'Food-first nutrition, gut support, sleep strategies and supplements only for proven gaps.'],
  ['Work together', 'We coordinate with your paediatrician, therapists and school so care fits together.'],
  ['Review', 'Regular check-ins and repeat tests to track progress and adjust the plan.'],
]

const questions = [
  'What specific goal will this help my child reach?',
  'What is the evidence that it works for children like mine?',
  'How will we measure progress, and when will we review it?',
  'What are the risks, side effects and full costs?',
  'Will my child enjoy it, and how will you respect their wellbeing?',
  'How will you work with my child’s other doctors and therapists?',
]

export default function AutismTreatmentOptions({ onBook, onShowLabs }: { onBook: () => void; onShowLabs: () => void }) {
  const [open, setOpen] = useState(0)

  return (
    <>
      {/* Introduction */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Treatment options"
            title="Support that helps your child thrive"
            intro="Autism is not an illness to be cured. Treatment means support: helping your child communicate, learn, feel well and take part in family life. The best plans combine several approaches, matched to your child."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((p, i) => (
              <div key={p.title} className="relative bg-white rounded-2xl border border-green-deep/10 p-6 shadow-sm overflow-hidden">
                <span className="absolute -top-3 -right-1 font-dm-sans font-bold text-7xl text-green-deep/5" aria-hidden="true">{i + 1}</span>
                <div className="w-12 h-12 rounded-xl bg-gold text-green-deep flex items-center justify-center mb-4">
                  <Icon name={p.icon} className="w-6 h-6" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">{p.title}</h3>
                <p className="font-dm-sans text-sm text-text-mid leading-[1.6]">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Therapies accordion */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="Therapies"
            title="Therapies that build skills"
            intro="Most children benefit from a combination. Early support makes the biggest difference, and it can start before a formal diagnosis."
          />
          <div className="space-y-3">
            {therapies.map((t, i) => {
              const isOpen = open === i
              return (
                <div key={t.name} className={`rounded-2xl border transition-all ${isOpen ? 'border-gold bg-[#FCFFF0] shadow-md' : 'border-green-deep/10 bg-white'}`}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 text-left px-5 py-4"
                  >
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-green-deep text-gold' : 'bg-gold/30 text-green-deep'}`}>
                      <Icon name={t.icon} className="w-5 h-5" />
                    </span>
                    <span className="flex-1 font-dm-sans font-semibold text-lg text-green-deep">{t.name}</span>
                    <span className={`font-dm-sans text-2xl text-green-mid transition-transform ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 sm:pl-[4.75rem]">
                      <p className="font-dm-sans text-text-mid leading-[1.65] mb-4">{t.what}</p>
                      <div className="flex flex-wrap gap-2">
                        {t.helps.map((h) => (
                          <span key={h} className="font-dm-sans text-sm font-semibold text-green-deep bg-white border border-green-deep/15 px-3 py-1.5 rounded-full">{h}</span>
                        ))}
                      </div>
                      {t.note && <p className="font-dm-sans text-sm text-[#7a3a0c] bg-[#fff4ea] rounded-lg px-4 py-3 mt-4">{t.note}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Medical care */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Medical care"
            title="Treating what makes life harder"
            intro="No medicine treats autism itself, but many co-occurring conditions are treatable. Addressing them often brings the biggest improvements in comfort, mood and learning."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {medical.map(([title, icon, text]) => (
              <div key={title} className="flex gap-4 bg-white rounded-2xl border border-green-deep/10 p-6 shadow-sm">
                <span className="w-12 h-12 rounded-xl bg-green-deep text-gold flex items-center justify-center flex-shrink-0 [&_img]:brightness-0 [&_img]:invert">
                  <Icon name={icon} className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-dm-sans font-semibold text-green-deep mb-1.5">{title}</h3>
                  <p className="font-dm-sans text-sm text-text-mid leading-[1.6]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FXMed approach */}
      <section className="py-20 px-[5%] bg-green-deep relative overflow-hidden">
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto">
          <SectionHeading
            light
            eyebrow="Where FXMed fits"
            title="Functional medicine alongside your child’s care"
            intro="We focus on physical health: digestion, nutrition, sleep and energy. We work with your child’s doctors and therapists, never in place of them."
          />
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {fxmedSteps.map(([title, text], i) => (
              <li key={title} className="bg-white/5 border border-cream/15 rounded-2xl p-5">
                <span className="w-9 h-9 rounded-full bg-gold text-green-deep font-bold flex items-center justify-center mb-3">{i + 1}</span>
                <p className="font-dm-sans font-semibold text-white mb-1.5">{title}</p>
                <p className="font-dm-sans text-sm text-cream/80 leading-[1.55]">{text}</p>
              </li>
            ))}
          </ol>
          <div className="text-center mt-10">
            <button onClick={onShowLabs} className="font-dm-sans text-gold font-semibold hover:underline">
              See how we approach lab testing →
            </button>
          </div>
        </div>
      </section>

      {/* Evidence guide */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Evidence guide"
            title="What the evidence says"
            intro="Families are offered many treatments. This guide shows where common options stand today."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {evidence.map((e) => (
              <div key={e.level} className={`bg-white rounded-2xl border-t-[6px] ${e.tone} shadow-md p-6 ${e.level === 'Avoid' ? 'bg-[#fff1f0]' : ''}`}>
                <p className={`font-dm-sans text-xs font-bold tracking-[0.14em] uppercase mb-4 ${e.label}`}>{e.level}</p>
                <ul className="space-y-2.5">
                  {e.items.map((item) => (
                    <li key={item} className="flex gap-2 font-dm-sans text-sm text-text-dark leading-[1.5]">
                      <Icon name={e.level === 'Avoid' ? 'x' : 'check'} className={`w-4 h-4 mt-0.5 flex-shrink-0 ${e.label}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Questions and CTA */}
      <section className="py-20 px-[5%]">
        <div className="max-w-5xl mx-auto">
          <SectionHeading eyebrow="Choosing well" title="Questions to ask any provider" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {questions.map((q) => (
              <div key={q} className="flex gap-3 items-start bg-white rounded-2xl border border-green-deep/10 p-5">
                <span className="w-8 h-8 rounded-full bg-gold/40 text-green-deep font-bold flex items-center justify-center flex-shrink-0">?</span>
                <p className="font-dm-sans text-text-dark leading-[1.55]">{q}</p>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-3xl p-10 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-4">Build a plan around your child</h2>
            <p className="font-dm-sans text-lg text-cream/90 mb-8 max-w-2xl mx-auto">Talk to our team about your child’s health, and how we can work alongside the care they already receive.</p>
            <button onClick={onBook} className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:-translate-y-0.5">
              Book a consultation
            </button>
          </div>
          <p className="font-dm-sans text-xs text-text-mid text-center mt-8 leading-[1.6]">
            For general education only. Treatment decisions should be made with your child’s doctors and therapists.
          </p>
        </div>
      </section>
    </>
  )
}
