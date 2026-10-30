'use client'

import { useRef, useState } from 'react'
import { Icon, SectionHeading, type IconName } from '@/components/AutismSupportInfographics'

// Lab Testing tab of the Autism Support page. Content follows the WITS FXMED Pediatric
// Functional Medicine Lab Guide (Patient Edition). Testing never diagnoses autism; it
// looks for co-occurring conditions and nutritional problems.

type Sample = 'Blood' | 'Urine' | 'Stool' | 'Breath'

const sampleIcons: Record<Sample, IconName> = { Blood: 'droplet', Urine: 'flask', Stool: 'gut', Breath: 'cloud' }

type Tier = {
  title: string
  reach: string
  when: string
  samples: Sample[]
  caution?: string
  groups: { name: string; note?: string; tests: [string, string][] }[]
}

const tiers: Tier[] = [
  {
    title: 'First-line essential tests',
    reach: 'Considered for most children',
    when: 'Strong clinical value for most autistic children, especially with feeding difficulties, picky eating or digestive symptoms.',
    samples: ['Blood'],
    groups: [
      {
        name: 'Basic metabolic and nutritional panel',
        tests: [
          ['Full blood count (CBC) with differential', 'Screens for anaemia and immune issues'],
          ['Comprehensive metabolic panel (CMP)', 'Kidney, liver, electrolytes and glucose'],
          ['Vitamin D (25-hydroxyvitamin D)', 'Often low with restricted diets or little outdoor play'],
          ['Iron panel (ferritin, iron, TIBC, saturation)', 'Iron is critical for brain development'],
          ['Blood lead level', 'Especially important if a child mouths or eats non-food items (pica)'],
        ],
      },
      {
        name: 'Thyroid function',
        tests: [
          ['TSH', 'Thyroid stimulating hormone'],
          ['Free T4', 'If TSH is abnormal or there is clinical suspicion'],
          ['Thyroid antibodies', 'If there is a family history of autoimmune thyroid disease'],
        ],
      },
      {
        name: 'Coeliac screening',
        note: 'Your child must be eating gluten for accurate results.',
        tests: [
          ['Tissue transglutaminase IgA (tTG-IgA)', 'Screens for coeliac disease'],
          ['Total IgA', 'Rules out IgA deficiency, which can cause false negatives'],
        ],
      },
    ],
  },
  {
    title: 'Common nutrient deficiencies',
    reach: 'Restricted diets or abnormal Tier 1 results',
    when: 'If Tier 1 results are abnormal, or a child has significant dietary restrictions, feeding difficulties or growth concerns.',
    samples: ['Blood'],
    groups: [
      {
        name: 'Additional nutritional assessment',
        tests: [
          ['Vitamin B12', 'Especially with a plant-based diet'],
          ['Folate (serum or red cell)', 'Needed for growth and red blood cells'],
          ['Zinc', 'Supports immunity; often low in picky eaters'],
          ['Magnesium (red cell preferred)', 'More accurate than a standard serum test'],
          ['Essential fatty acids', 'Omega-3 index and omega-6 to omega-3 ratio'],
          ['Vitamin A (retinol)', 'If the diet is very restricted'],
          ['Vitamin E', 'If poor fat absorption is suspected'],
        ],
      },
    ],
  },
  {
    title: 'Gut and digestive assessment',
    reach: 'Ongoing digestive symptoms',
    when: 'Strongly considered with chronic diarrhoea, constipation, tummy pain, bloating or behaviour changes around eating.',
    samples: ['Stool', 'Urine', 'Breath'],
    groups: [
      {
        name: 'Stool testing (non-invasive)',
        tests: [
          ['Comprehensive stool analysis with parasitology', 'A broad look at digestion and infection'],
          ['Calprotectin', 'Marker of gut inflammation'],
          ['Secretory IgA', 'Immune activity in the gut'],
          ['Microbiome analysis (DNA stool test)', 'Bacterial balance and diversity'],
          ['Pancreatic elastase', 'Whether digestive enzymes are adequate'],
          ['Ova and parasites', 'If there has been travel or exposure'],
        ],
      },
      {
        name: 'Gut barrier and function',
        tests: [
          ['Zonulin', 'Intestinal barrier marker'],
          ['Lactulose/mannitol test', 'Your child drinks a solution, then urine is collected'],
          ['SIBO breath test', 'For selected symptoms of bacterial overgrowth; needs preparation'],
        ],
      },
    ],
  },
  {
    title: 'Metabolic and mitochondrial assessment',
    reach: 'Regression, fatigue or weakness',
    when: 'If a child has lost skills, is unusually tired or weak, or has abnormal results on the basic metabolic panel.',
    samples: ['Blood', 'Urine'],
    groups: [
      {
        name: 'Metabolic tests',
        tests: [
          ['Lactate and pyruvate', 'Must be drawn carefully, while fasting'],
          ['Carnitine and acylcarnitine profile', 'Energy production from fats'],
          ['Organic acids test (urine)', 'A broad, non-invasive metabolic snapshot'],
          ['Plasma amino acids', 'Screens for inherited metabolic conditions'],
          ['Ammonia', 'Must be processed immediately after the draw'],
          ['Creatine kinase (CK)', 'Muscle and mitochondrial health'],
          ['Coenzyme Q10', 'If mitochondrial support is being considered'],
        ],
      },
    ],
  },
  {
    title: 'Immune function and inflammation',
    reach: 'Frequent infections or inflammation',
    when: 'With recurrent infections, a family history of autoimmune conditions, or signs of chronic inflammation.',
    samples: ['Blood'],
    groups: [
      {
        name: 'Inflammation and immunity',
        tests: [
          ['hs-CRP and ESR', 'General markers of inflammation'],
          ['Immunoglobulins (IgG, IgA, IgM, IgE)', 'With subclasses if indicated'],
          ['Total and specific IgE', 'If allergies are suspected'],
        ],
      },
      {
        name: 'PANDAS/PANS screening',
        note: 'Only if symptoms or regression began suddenly after an infection.',
        tests: [
          ['ASO titre and anti-DNase B', 'Evidence of recent strep infection'],
          ['Mycoplasma pneumoniae antibodies', 'Evidence of recent mycoplasma infection'],
          ['Antineuronal antibodies', 'Specialised testing'],
        ],
      },
    ],
  },
  {
    title: 'Genetic and chromosomal testing',
    reach: 'For diagnostic clarity',
    when: 'Recommended to look for an underlying genetic explanation and identify treatable genetic conditions.',
    samples: ['Blood'],
    groups: [
      {
        name: 'Genetic tests',
        tests: [
          ['Chromosomal microarray (CMA)', 'The first-line genetic test for autism'],
          ['Fragile X testing (FMR1)', 'Especially for boys with intellectual disability'],
          ['Whole exome sequencing or autism gene panel', 'If microarray is normal and suspicion remains'],
          ['MECP2 testing', 'For girls with regression or features of Rett syndrome'],
          ['MTHFR genotyping', 'Used in functional medicine; evidence is limited'],
        ],
      },
    ],
  },
  {
    title: 'Advanced functional testing',
    reach: 'Specific indications only',
    when: 'Only after basic assessments are complete and there is a specific clinical reason. Many of these tests are not covered by insurance.',
    samples: ['Blood', 'Urine'],
    caution: 'Some tests at this level are debated. Your clinician will explain what a result can and cannot tell you before ordering.',
    groups: [
      {
        name: 'Methylation and oxidative stress',
        tests: [
          ['Homocysteine', 'Linked to B12 and folate status'],
          ['Methylmalonic acid (MMA)', 'A sensitive marker of B12 status'],
          ['Glutathione ratio', 'Antioxidant balance'],
        ],
      },
      {
        name: 'Heavy metals (use caution)',
        note: 'Unprovoked testing only. Provoked “chelation challenge” testing is controversial and potentially harmful in children.',
        tests: [
          ['Mercury (blood or urine)', 'Unprovoked samples only'],
          ['Arsenic (urine)', 'If exposure is suspected'],
        ],
      },
      {
        name: 'Food reactions',
        note: 'IgG food panels are debated and have a high false-positive rate. A supervised elimination trial is often better.',
        tests: [
          ['IgE food allergy testing', 'If true allergic reactions are suspected'],
          ['IgG food panel', 'Controversial; never remove foods on this result alone'],
        ],
      },
    ],
  },
]

const notRecommended = [
  ['Urine neurotransmitter tests', 'Poorly reflect brain levels; not validated in children'],
  ['Provoked heavy-metal tests', 'Can be harmful; not recommended by the AAP'],
  ['Hair analysis for nutrition', 'Unreliable and highly variable'],
  ['Urine peptide tests', 'Casomorphin and gliadorphin tests lack validation'],
  ['Secretin stimulation tests', 'No proven benefit'],
]

const situations: { title: string; icon: IconName; items: string[] }[] = [
  { title: 'If your child has lost skills', icon: 'activity', items: ['Metabolic and mitochondrial assessment comes first', 'An EEG if there are seizure-like episodes', 'PANDAS/PANS screening if it followed an infection'] },
  { title: 'Severe feeding problems or poor growth', icon: 'utensils', items: ['A comprehensive vitamin and mineral panel', 'Gut workup, including coeliac and inflammation markers', 'A swallow study if there is a risk of choking or aspiration'] },
  { title: 'Severe sleep problems', icon: 'moon', items: ['An iron panel, as low iron is linked to restless sleep', 'Ferritin above 50 ng/mL is often the target for sleep', 'A sleep study if sleep apnoea is suspected'] },
]

const considerations: { title: string; text: string; icon: IconName }[] = [
  { title: 'Small blood volumes', text: 'Children have less blood, so total draws stay within 1–5% of blood volume. A 10 kg child has about 800 mL.', icon: 'droplet' },
  { title: 'Non-invasive first', text: 'Urine, stool and saliva tests are preferred where they answer the same question.', icon: 'shield' },
  { title: 'Child-specific ranges', text: 'Results are read against paediatric reference ranges, which differ a lot from adult ranges.', icon: 'clipboard' },
  { title: 'Fewer procedures', text: 'Tests with the most value come first, and tests are combined to reduce separate draws.', icon: 'heart' },
]

const panels = [
  ['GI-MAP; GI Effects Comprehensive Profile', 'Tier 3', 'For persistent digestive symptoms. Stool collection.'],
  ['Genova SIBO breath test (3-hour)', 'Tier 3', 'Selected symptoms of bacterial overgrowth. Needs preparation; age suitability checked.'],
  ['Mosaic Organic Acids (OAT); DUTCH OATs', 'Tier 4', 'A defined metabolic question. Urine. Not a substitute for specialist metabolic testing.'],
  ['NutrEval; Genova Metabolomix+', 'Tier 2 / 4', 'Selected nutritional or metabolic questions after clinical review. Urine and/or blood.'],
  ['SpectraCell; Cellular Micronutrient Assay', 'Tier 2', 'A specific nutritional question. Direct nutrient tests may be more appropriate.'],
  ['ZRT Blood Spot Thyroids', 'Tier 1', 'When thyroid assessment is indicated. Finger-prick bloodspot.'],
  ['IgG food panels (Alletess, Food Explorer, Food MAP)', 'Tier 7, with caution', 'Not validated to diagnose food sensitivity or allergy.'],
  ['Hair element profiles (Doctor’s Data, Mosaic)', 'Not recommended', 'Not a reliable nutritional assessment or diagnosis of metal poisoning.'],
  ['DUTCH Complete; DUTCH Plus', 'Outside routine tiers', 'Hormone and cortisol panels are not routine autism tests.'],
  ['3X4 Genetics', 'Not diagnostic', 'Does not replace microarray, Fragile X or clinical sequencing.'],
]

const collection: { title: string; icon: IconName; tips: string[] }[] = [
  { title: 'Blood draws', icon: 'droplet', tips: ['Paediatric phlebotomists where possible', 'Numbing cream 30–60 minutes before', 'Morning appointments, when your child is less tired', 'Comfort items and distractions', 'Tests combined into one draw'] },
  { title: 'Urine', icon: 'flask', tips: ['First-morning urine for many tests', 'Collection bags if not toilet-trained', 'Potty-chair inserts for toddlers'] },
  { title: 'Stool', icon: 'gut', tips: ['Kits come with preservatives', 'Nappy collection works for most tests', 'Follow timing instructions for microbiome tests'] },
]

const shipping: [string, string][] = [
  ['Arrange before collecting', 'We confirm the laboratory accepts samples from Nigeria and the kit suits your child.'],
  ['Receive your kit', 'Keep it sealed, store it as instructed, and check the expiry date and contents.'],
  ['Collect and return', 'Follow the exact labelling, packing and storage steps, and book the courier first.'],
  ['Results consultation', 'Once the lab accepts the sample, we explain every result and what it means for care.'],
]

const reminders = [
  'More testing is not always better. We focus on tests that will actually change your child’s care.',
  'Many functional tests are not covered by insurance. Ask for a written quote covering tests, collection, shipping and the results consultation.',
  'Results are always read with your child’s history, examination and development, using paediatric ranges.',
  'Abnormal results do not cause autism, but they can reveal treatable conditions that affect how your child feels.',
  'Testing is coordinated with your paediatrician, developmental specialist, gastroenterologist and dietitian, so nothing is duplicated.',
]

export default function AutismLabTesting({ onBook }: { onBook: () => void }) {
  const [selected, setSelected] = useState(0)
  const tier = tiers[selected]
  const detailRef = useRef<HTMLDivElement>(null)

  // On narrow screens the details sit below the tier list, so bring them into view
  const chooseTier = (i: number) => {
    setSelected(i)
    if (window.innerWidth >= 1024 || !detailRef.current) return
    const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 100
    const top = detailRef.current.getBoundingClientRect().top + window.scrollY - navHeight - 12
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <>
      {/* Introduction */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Lab testing"
            title="What lab tests can tell us"
            intro="Autism is diagnosed through developmental and behavioural assessment, not lab tests. Testing helps us find co-occurring medical conditions and nutritional gaps that affect how your child feels, grows and develops."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {considerations.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-green-deep/10 p-6 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-green-deep text-gold flex items-center justify-center mb-4 [&_img]:brightness-0 [&_img]:invert">
                  <Icon name={item.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-2">{item.title}</h3>
                <p className="font-dm-sans text-sm text-text-mid leading-[1.6]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier explorer */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="The testing tiers"
            title="Start simple, go further only when needed"
            intro="Tiers describe areas of assessment, not stages of autism or a schedule every child must follow. Your clinician selects tests based on symptoms, growth, diet and examination."
          />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Tiers narrow as they go: most children need only the first */}
            <div className="lg:col-span-2 space-y-2" role="tablist" aria-label="Testing tiers">
              {tiers.map((t, i) => (
                <button
                  key={t.title}
                  role="tab"
                  aria-selected={selected === i}
                  onClick={() => chooseTier(i)}
                  className={`group w-full flex items-center gap-3 text-left rounded-2xl px-4 py-3 border-2 transition-all ${selected === i ? 'bg-green-deep border-green-deep text-white shadow-lg' : 'bg-[#FCFFF0] border-transparent hover:border-gold'}`}
                  style={{ width: `${100 - i * 5}%` }}
                >
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${selected === i ? 'bg-gold text-green-deep' : 'bg-green-deep text-gold'}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className={`block font-dm-sans font-semibold leading-tight ${selected === i ? 'text-white' : 'text-green-deep'}`}>{t.title}</span>
                    <span className={`block font-dm-sans text-xs mt-0.5 ${selected === i ? 'text-cream/75' : 'text-text-mid'}`}>{t.reach}</span>
                  </span>
                </button>
              ))}
              <p className="font-dm-sans text-xs text-text-mid pt-2">Most children only need Tier 1. Later tiers are for specific concerns.</p>
            </div>

            <div ref={detailRef} className="lg:col-span-3 bg-[#FCFFF0] rounded-3xl border border-green-deep/10 p-6 md:p-8" role="tabpanel" aria-live="polite">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-dm-sans text-xs font-bold tracking-[0.14em] uppercase bg-gold text-green-deep px-3 py-1 rounded-full">Tier {selected + 1}</span>
                {tier.samples.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 font-dm-sans text-xs font-semibold text-green-deep bg-white border border-green-deep/15 px-2.5 py-1 rounded-full">
                    <Icon name={sampleIcons[s]} className="w-3.5 h-3.5" />
                    {s}
                  </span>
                ))}
              </div>
              <h3 className="font-dm-sans font-bold text-2xl text-green-deep mb-2">{tier.title}</h3>
              <p className="font-dm-sans text-text-mid leading-[1.65] mb-6"><strong className="text-text-dark">When it’s considered: </strong>{tier.when}</p>
              {tier.caution && (
                <div className="bg-[#fff4ea] border-l-4 border-[#e8833a] rounded-lg p-4 mb-6 font-dm-sans text-sm text-[#7a3a0c]">{tier.caution}</div>
              )}
              <div className="space-y-6">
                {tier.groups.map((group) => (
                  <div key={group.name}>
                    <h4 className="font-dm-sans font-semibold text-green-deep mb-1">{group.name}</h4>
                    {group.note && <p className="font-dm-sans text-sm italic text-text-mid mb-2">{group.note}</p>}
                    <ul className="divide-y divide-green-deep/10 bg-white rounded-2xl border border-green-deep/10">
                      {group.tests.map(([name, what]) => (
                        <li key={name} className="px-4 py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-6">
                          <span className="block font-dm-sans font-semibold text-sm text-text-dark">{name}</span>
                          <span className="block font-dm-sans text-sm text-text-mid sm:text-right sm:max-w-[55%]">{what}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-8 font-dm-sans text-sm font-semibold">
                <button onClick={() => setSelected(Math.max(0, selected - 1))} disabled={selected === 0} className="text-green-mid disabled:opacity-30 hover:underline">← Previous tier</button>
                <button onClick={() => setSelected(Math.min(tiers.length - 1, selected + 1))} disabled={selected === tiers.length - 1} className="text-green-mid disabled:opacity-30 hover:underline">Next tier →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special situations */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Special situations" title="When testing priorities change" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {situations.map((s) => (
              <div key={s.title} className="bg-white rounded-2xl border border-green-deep/10 p-6 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-gold text-green-deep flex items-center justify-center mb-4">
                  <Icon name={s.icon} className="w-6 h-6" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg text-green-deep mb-3">{s.title}</h3>
                <ul className="space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex gap-2 font-dm-sans text-sm text-text-mid leading-[1.55]">
                      <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-mid" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not recommended */}
      <section className="py-20 px-[5%] bg-green-deep relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-green-mid/40 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto">
          <SectionHeading
            light
            eyebrow="Use caution"
            title="Tests we don’t recommend for young children"
            intro="These tests have limited evidence, safety concerns, or are not validated in children."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {notRecommended.map(([name, why]) => (
              <div key={name} className="bg-white/5 border border-cream/15 rounded-2xl p-5">
                <span className="w-8 h-8 rounded-full bg-[#e8833a]/20 text-[#f4a36a] flex items-center justify-center mb-3">
                  <Icon name="x" className="w-4 h-4" />
                </span>
                <h3 className="font-dm-sans font-semibold text-white mb-1.5">{name}</h3>
                <p className="font-dm-sans text-sm text-cream/75 leading-[1.5]">{why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branded panels */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Specialist panels"
            title="Panels you may hear about"
            intro="Where well-known commercial panels fit in this guide, and where they don’t. These are not a required package: we only suggest a test that answers a clear question."
          />
          <div className="overflow-x-auto rounded-2xl border border-green-deep/10">
            <table className="w-full min-w-[640px] font-dm-sans text-sm">
              <thead>
                <tr className="bg-green-deep text-gold text-left text-xs uppercase tracking-[0.08em]">
                  <th scope="col" className="px-4 py-3">Test or panel</th>
                  <th scope="col" className="px-4 py-3">Where it fits</th>
                  <th scope="col" className="px-4 py-3">What families should know</th>
                </tr>
              </thead>
              <tbody>
                {panels.map(([name, fit, know]) => {
                  const caution = /caution|Not recommended|Not diagnostic|Outside/.test(fit)
                  return (
                    <tr key={name} className="border-t border-green-deep/10 even:bg-[#FCFFF0]">
                      <td className="px-4 py-3 font-semibold text-green-deep">{name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${caution ? 'bg-[#fff4ea] text-[#a14b0e]' : 'bg-green-light/15 text-green-mid'}`}>{fit}</span>
                      </td>
                      <td className="px-4 py-3 text-text-mid">{know}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Collection and shipping */}
      <section className="py-20 px-[5%]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="On the day" title="Making sample collection easier" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {collection.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-green-deep/10 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-11 h-11 rounded-xl bg-gold/40 text-green-deep flex items-center justify-center"><Icon name={c.icon} className="w-5 h-5" /></span>
                  <h3 className="font-dm-sans font-semibold text-lg text-green-deep">{c.title}</h3>
                </div>
                <ul className="space-y-2">
                  {c.tips.map((tip) => (
                    <li key={tip} className="flex gap-2 font-dm-sans text-sm text-text-mid"><span className="text-green-mid font-bold">→</span>{tip}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="font-dm-sans font-bold text-2xl text-green-deep text-center mb-8">Testing from Nigeria: how kits work</h3>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {shipping.map(([title, text], i) => (
              <li key={title} className="relative bg-green-deep rounded-2xl p-6 text-white">
                <span className="absolute top-5 right-5 font-dm-sans font-bold text-3xl text-gold/30">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-dm-sans font-semibold text-gold mb-2">{title}</p>
                <p className="font-dm-sans text-sm text-cream/85 leading-[1.6]">{text}</p>
              </li>
            ))}
          </ol>
          <p className="font-dm-sans text-sm text-text-mid text-center mt-6 max-w-3xl mx-auto">
            Shipping time and laboratory processing time are separate. A listed test does not guarantee a laboratory accepts samples from Nigeria, so we confirm this before you collect.
          </p>
        </div>
      </section>

      {/* Reminders and CTA */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-5xl mx-auto">
          <SectionHeading eyebrow="Good to know" title="Our approach to testing" />
          <div className="bg-[#FCFFF0] rounded-3xl border border-green-deep/10 p-6 md:p-8 mb-12">
            <ul className="space-y-4">
              {reminders.map((r, i) => (
                <li key={r} className="flex gap-4 font-dm-sans text-text-dark leading-[1.6]">
                  <span className="w-8 h-8 rounded-full bg-green-deep text-gold font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-r from-green-deep to-green-mid rounded-3xl p-10 text-center">
            <h2 className="font-dm-sans font-bold text-3xl text-white mb-4">Not sure which tests your child needs?</h2>
            <p className="font-dm-sans text-lg text-cream/90 mb-8 max-w-2xl mx-auto">We start with your child’s story and only suggest tests that will change their care, with a written quote first.</p>
            <button onClick={onBook} className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-lg transition-all hover:bg-gold-light hover:-translate-y-0.5">
              Book a consultation
            </button>
          </div>
          <p className="font-dm-sans text-xs text-text-mid text-center mt-8 leading-[1.6]">
            For educational purposes only. Testing is individualised and guided by a licensed paediatric clinician. Based on the WITS FXMED Paediatric Functional Medicine Lab Guide.
          </p>
        </div>
      </section>
    </>
  )
}
