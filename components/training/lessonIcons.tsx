'use client'

import type { ReactNode } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  AmbulanceIcon, ArrowsClockwiseIcon, AtomIcon, BabyIcon, BandaidsIcon, BarbellIcon, BedIcon, BoneIcon,  BreadIcon, BriefcaseIcon,
  BugIcon, CalendarCheckIcon, CameraIcon, CarrotIcon, ChartLineUpIcon, ChatCircleIcon, CheckCircleIcon, CigaretteIcon, ClipboardTextIcon,
  ClockIcon, CoffeeIcon, CurrencyNgnIcon, DnaIcon, DropIcon, EggIcon, EnvelopeIcon, EyeIcon, FireIcon, FirstAidKitIcon, FishIcon, FlaskIcon,
  FlowerIcon, ForkKnifeIcon, FunnelIcon, GaugeIcon, GearIcon, GenderFemaleIcon, GenderMaleIcon, HandshakeIcon,  HeartbeatIcon,
  HospitalIcon, HourglassIcon, HouseIcon, IdentificationCardIcon, KeyIcon, LeafIcon, LightbulbIcon, LightningIcon, LockIcon, MagnifyingGlassIcon,
  MegaphoneIcon, MicroscopeIcon, MoneyIcon, MoonStarsIcon, PersonSimpleRunIcon, PhoneIcon, PillIcon, PlantIcon, PrescriptionIcon, RecycleIcon,
  ScalesIcon, ShieldCheckIcon, SirenIcon, SmileySadIcon, SmileyIcon, SparkleIcon, StethoscopeIcon, SunIcon, SyringeIcon, TargetIcon,
  TestTubeIcon, ThermometerIcon, TimerIcon, ToothIcon, TrophyIcon, UserCircleIcon, UsersThreeIcon, VirusIcon, WarningCircleIcon, WindIcon,
  WineIcon, XCircleIcon,
} from '@phosphor-icons/react'

// Icons and small drawn illustrations for lesson visuals. Every visual item
// gets one: either named in the lesson ("icon": "liver") or chosen from the
// item's own words, so existing visuals gain pictures without being rewritten.

type IconProps = { size?: number; className?: string }

// ---------------------------------------------------------------------------
// Drawn organ illustrations (two-tone, on a 48 × 48 grid). Phosphor has no
// organs, so these are FXMed's own.

const ink = '#1a3d2e'
function Organ({ size = 28, className, children }: IconProps & { children: ReactNode }) {
  return <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}
const GutIcon = (p: IconProps) => <Organ {...p}>
  <path d="M10 40 V14 Q10 8 16 8 H32 Q38 8 38 14 V34" fill="#f2c8b4" />
  <path d="M38 34 Q38 40 32 40 H22" fill="none" />
  <path d="M16 16 Q16 13 20 13 H28 Q32 13 32 17 Q32 21 28 21 H20 Q16 21 16 25 Q16 29 20 29 H28 Q32 29 32 33" fill="none" stroke="#c2694a" />
</Organ>
const ThyroidIcon = (p: IconProps) => <Organ {...p}>
  <path d="M24 20 Q20 10 13 12 Q6 15 8 27 Q10 37 18 35 Q22 33 24 28 Q26 33 30 35 Q38 37 40 27 Q42 15 35 12 Q28 10 24 20 Z" fill="#d98a7a" />
  <path d="M24 4 V44" stroke="#9fb3a8" strokeDasharray="3 3" />
</Organ>
const PancreasIcon = (p: IconProps) => <Organ {...p}>
  <path d="M6 28 Q6 18 16 20 Q26 22 34 18 Q42 15 43 21 Q44 26 36 27 Q26 29 18 33 Q6 38 6 28 Z" fill="#f0c27a" />
</Organ>
const GallbladderIcon = (p: IconProps) => <Organ {...p}>
  <path d="M30 6 Q34 12 30 18 Q36 26 32 36 Q27 44 19 40 Q12 35 17 26 Q21 18 28 14 Q28 10 30 6 Z" fill="#9cc56a" />
</Organ>
const CellIcon = (p: IconProps) => <Organ {...p}>
  <circle cx={24} cy={24} r={18} fill="#cfe7d8" />
  <circle cx={27} cy={21} r={7} fill="#2d6a4f" fillOpacity={0.35} />
  <circle cx={15} cy={30} r={2} fill={ink} /><circle cx={32} cy={33} r={1.5} fill={ink} /><circle cx={14} cy={18} r={1.5} fill={ink} />
</Organ>
const MoleculeIcon = (p: IconProps) => <Organ {...p}>
  <path d="M24 8 L37 15.5 V30.5 L24 38 L11 30.5 V15.5 Z" fill="#e6efd0" />
  {[[24, 8], [37, 15.5], [37, 30.5], [24, 38], [11, 30.5], [11, 15.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.2} fill="#2d6a4f" stroke="none" />)}
  <path d="M37 30.5 L44 35" /><circle cx={44} cy={35} r={2.6} fill="#c9e265" />
</Organ>
const HormoneIcon = (p: IconProps) => <Organ {...p}>
  <circle cx={14} cy={16} r={6} fill="#c9e265" /><circle cx={34} cy={14} r={5} fill="#f0c27a" /><circle cx={30} cy={34} r={7} fill="#e9a08b" />
  <path d="M19 19 L25 29 M29 18 L30 27" />
</Organ>

// Organ illustrations (Servier Medical Art, CC BY 4.0, via the Pain OS body
// scan) for the organs that have one; the drawn icons above cover the rest.
function organArt(file: string, label: string) {
  const Art = ({ size = 28, className }: IconProps) => (
    // eslint-disable-next-line @next/next/no-img-element -- small static organ art from /public
    <img src={`/training/body/${file}.png`} alt="" aria-hidden width={size} height={size} loading="lazy" className={`object-contain ${className || ''}`} style={{ width: size, height: size }} />
  )
  Art.displayName = `${label}Art`
  return Art
}
const BrainArt = organArt('brain', 'Brain'), HeartArt = organArt('heart', 'Heart'), LungsArt = organArt('lungs', 'Lungs')
const LiverArt = organArt('liver', 'Liver'), StomachArt = organArt('stomach', 'Stomach'), KidneyArt = organArt('kidney', 'Kidney')

// ---------------------------------------------------------------------------
// Named icons. Authors can write any of these names in an "icon" field.

const phosphor = (C: PhosphorIcon) => {
  const Duotone = (p: IconProps) => <C size={p.size ?? 28} weight="duotone" className={p.className} />
  Duotone.displayName = `Lesson${C.displayName || 'Icon'}`
  return Duotone
}

export const lessonIcons: Record<string, (p: IconProps) => ReactNode> = {
  gut: GutIcon, intestine: GutIcon, liver: LiverArt, stomach: StomachArt, thyroid: ThyroidIcon, kidney: KidneyArt, lungs: LungsArt,
  pancreas: PancreasIcon, gallbladder: GallbladderIcon, cell: CellIcon, molecule: MoleculeIcon, hormone: HormoneIcon,
  brain: BrainArt, heart: HeartArt, heartbeat: phosphor(HeartbeatIcon), blood: phosphor(DropIcon), drop: phosphor(DropIcon),
  pill: phosphor(PillIcon), prescription: phosphor(PrescriptionIcon), syringe: phosphor(SyringeIcon), food: phosphor(ForkKnifeIcon),
  vegetable: phosphor(CarrotIcon), fish: phosphor(FishIcon), egg: phosphor(EggIcon), bread: phosphor(BreadIcon), plant: phosphor(PlantIcon),
  leaf: phosphor(LeafIcon), flower: phosphor(FlowerIcon), dna: phosphor(DnaIcon), virus: phosphor(VirusIcon), bug: phosphor(BugIcon),
  sleep: phosphor(MoonStarsIcon), bed: phosphor(BedIcon), energy: phosphor(LightningIcon), lab: phosphor(FlaskIcon), test: phosphor(TestTubeIcon),
  microscope: phosphor(MicroscopeIcon), exercise: phosphor(PersonSimpleRunIcon), strength: phosphor(BarbellIcon), baby: phosphor(BabyIcon),
  female: phosphor(GenderFemaleIcon), male: phosphor(GenderMaleIcon), people: phosphor(UsersThreeIcon), person: phosphor(UserCircleIcon),
  shield: phosphor(ShieldCheckIcon), immune: phosphor(ShieldCheckIcon), inflammation: phosphor(FireIcon), fire: phosphor(FireIcon),
  temperature: phosphor(ThermometerIcon), atom: phosphor(AtomIcon), bone: phosphor(BoneIcon), tooth: phosphor(ToothIcon), eye: phosphor(EyeIcon),
  stethoscope: phosphor(StethoscopeIcon), hospital: phosphor(HospitalIcon), emergency: phosphor(AmbulanceIcon), alarm: phosphor(SirenIcon),
  clipboard: phosphor(ClipboardTextIcon), chart: phosphor(ChartLineUpIcon), gauge: phosphor(GaugeIcon), warning: phosphor(WarningCircleIcon),
  check: phosphor(CheckCircleIcon), cross: phosphor(XCircleIcon), clock: phosphor(ClockIcon), timer: phosphor(TimerIcon), hourglass: phosphor(HourglassIcon),
  calendar: phosphor(CalendarCheckIcon), sun: phosphor(SunIcon), coffee: phosphor(CoffeeIcon), alcohol: phosphor(WineIcon), smoking: phosphor(CigaretteIcon),
  firstaid: phosphor(FirstAidKitIcon), bandage: phosphor(BandaidsIcon), stress: phosphor(SmileySadIcon), mood: phosphor(SmileyIcon), toxin: phosphor(WindIcon),
  cycle: phosphor(ArrowsClockwiseIcon), recycle: phosphor(RecycleIcon), target: phosphor(TargetIcon), idea: phosphor(LightbulbIcon), search: phosphor(MagnifyingGlassIcon),
  chat: phosphor(ChatCircleIcon), phone: phosphor(PhoneIcon), email: phosphor(EnvelopeIcon), money: phosphor(MoneyIcon), price: phosphor(CurrencyNgnIcon),
  handshake: phosphor(HandshakeIcon), megaphone: phosphor(MegaphoneIcon), camera: phosphor(CameraIcon), lock: phosphor(LockIcon), key: phosphor(KeyIcon),
  id: phosphor(IdentificationCardIcon), home: phosphor(HouseIcon), work: phosphor(BriefcaseIcon), funnel: phosphor(FunnelIcon), settings: phosphor(GearIcon),
  scales: phosphor(ScalesIcon), weight: phosphor(ScalesIcon), trophy: phosphor(TrophyIcon), sparkle: phosphor(SparkleIcon),
}
export const lessonIconNames = Object.keys(lessonIcons)

// Word → icon, first match wins. Ordered from specific to general.
const keywordIcons: [RegExp, string][] = [
  [/\b(red flag|emergenc|urgent|same[- ]day|999|112|refer(ral)? now|alarm)/i, 'alarm'],
  [/\b(ambulance|a&e|hospital admission)/i, 'emergency'],
  [/\b(gut|bowel|intestin|colon|microbio|dysbiosis|leaky|stool|sibo|probiotic|ibs|constipat|diarrh)/i, 'gut'],
  [/\b(liver|hepat|fatty liver|nafld|masld|alt\b|ast\b|ggt|biotransform|detox|phase [12])/i, 'liver'],
  [/\b(stomach|gastric|(stomach|low|gastric) acid|acid[- ]suppress|hcl|hypochlorhydria|pepsin|ppi|reflux|heartburn|h\.? pylori|antacid|digest|enzyme)/i, 'stomach'],
  [/\b(thyroid|tsh|t3|t4|hashimoto|iodine|deiodinase)/i, 'thyroid'],
  [/\b(kidney|renal|creatinine|egfr|urine)/i, 'kidney'],
  [/\b(lung|breath|apnoea|apnea|stop-bang|airway|asthma)/i, 'lungs'],
  [/\b(pancrea|elastase|insulin|c-peptide)/i, 'pancreas'],
  [/\b(gallbladder|bile|gallstone|bilirubin)/i, 'gallbladder'],
  [/\b(glucose|sugar|hba1c|diabet|metabolic|glycaem|glp-1|semaglutide|tirzepatide)/i, 'gauge'],
  [/\b(hormon|oestrogen|estrogen|progesterone|testosterone|cortisol|adrenal|menopaus|perimenopaus|androgen)/i, 'hormone'],
  [/\b(methyl|homocysteine|mthfr|folate|b12|b vitamin|choline|sam-?e)/i, 'molecule'],
  [/\b(gene|dna|epigenet|histone|snp|variant)/i, 'dna'],
  [/\b(brain|mood|anxi|depress|cognit|memory|fog|neuro|vagus|nerv|serotonin|dopamine)/i, 'brain'],
  [/\b(heart|cardio|blood pressure|hypertens|cholesterol|ldl|hdl|triglycer|stroke|vascular)/i, 'heart'],
  [/\b(iron|ferritin|haemoglobin|hemoglobin|anaemi|anemi|blood|transferrin|tsat)/i, 'blood'],
  [/\b(immune|autoimmun|antibod|lymph|defen|ige|allerg)/i, 'shield'],
  [/\b(inflamm|crp|esr|lps|endotoxin|histamine)/i, 'inflammation'],
  [/\b(infect|virus|viral|parasit|pathogen|bacteri)/i, 'virus'],
  [/\b(cell|mitochond|membrane)/i, 'cell'],
  [/\b(toxin|toxic|mould|mold|pollut|chemical|plastic|bpa|heavy metal|lead (poisoning|exposure)|mercury|carbon monoxide)/i, 'toxin'],
  [/\b(exhaust|fatigue|tired|low energy|energy)/i, 'energy'],
  [/\b(sleep|insomnia|melatonin|night|bedtime|circadian)/i, 'sleep'],
  [/\b(stress|cortisol|burnout|trauma|fight or flight|sympathetic)/i, 'stress'],
  [/\b(relax|calm|rest and digest|parasympathetic|breathing exercise|meditat)/i, 'leaf'],
  [/\b(exercise|movement|walk|activity|fitness|muscle)/i, 'exercise'],
  [/\b(weight|bmi|obes|waist|body fat)/i, 'scales'],
  [/\b(alcohol|wine|beer)/i, 'alcohol'], [/\b(smok|tobacco|cigarette)/i, 'smoking'], [/\b(coffee|caffeine)/i, 'coffee'],
  [/\b(fibre|fiber|vegetable|plant|polyphenol|prebiotic)/i, 'vegetable'],
  [/\b(protein|meat|egg)/i, 'egg'], [/\b(fish|omega)/i, 'fish'],
  [/\b(food|diet|meal|eat|nutrition|plate|snack|craving|fast(ing)?\b)/i, 'food'],
  [/\b(supplement|vitamin|mineral|zinc|magnesium|selenium|dose|capsule|berberine|inositol)/i, 'pill'],
  [/\b(medic|drug|prescri|metformin|statin|nsaid|steroid|antibiotic|levothyroxine|painkiller)/i, 'prescription'],
  [/\b(inject|syringe|vaccin)/i, 'syringe'],
  [/\b(pregnan|baby|infant|child|paediatric|pediatric|preconception|fertil)/i, 'baby'],
  [/\b(women|woman|female|menstru|period)/i, 'female'], [/\b(men\b|male)/i, 'male'],
  [/\b(lab|test|panel|marker|result|range|blood draw|investigation)/i, 'lab'],
  [/\b(bone|osteo|calcium|vitamin d)/i, 'bone'], [/\b(sun|uv)/i, 'sun'],
  [/\b(skin|eczema|acne|rash|psoriasis)/i, 'flower'],
  [/\b(sign[- ]?off|approv|confirm|verif|complete[d]?\b|pass(ed)?\b)/i, 'check'],
  [/\b(referr?al|refer\b|specialist|escalat)/i, 'hospital'],
  [/\b(overdue|late|deadline|delay)/i, 'clock'],
  [/\b(book|booking|appointment|schedul)/i, 'calendar'],
  [/\b(choose|service|programme|program|package|option)/i, 'clipboard'],
  [/\b(begin|start|first step|kick ?off|onboard)/i, 'target'],
  [/\b(intake|history|assess|consult|examin|clinical)/i, 'stethoscope'],
  [/\b(note|record|document|form|checklist|audit|report|policy)/i, 'clipboard'],
  [/\b(patient|family|team|staff|people|community)/i, 'people'],
  [/\b(price|fee|cost|pay|invoice|naira|₦)/i, 'price'],
  [/\b(sale|lead|conver|funnel|pipeline)/i, 'funnel'],
  [/\b(partner|corporate|employer|agreement)/i, 'handshake'],
  [/\b(market|social|post|content|campaign|outreach|seo|brand)/i, 'megaphone'],
  [/\b(photo|video|camera|media)/i, 'camera'],
  [/\b(repl(y|ies)|respon[sd]|answer)/i, 'chat'],
  [/\b(hour|minute|within)\b/i, 'clock'],
  [/\b(call|phone|whatsapp)/i, 'phone'], [/\b(message|chat|talk|conversation|explain|say)/i, 'chat'], [/\b(email|letter)/i, 'email'],
  [/\b(privacy|consent|secur|password|access|confidential|data protection)/i, 'lock'],
  [/\b(goal|target|kpi|aim|outcome)/i, 'target'],
  [/\b(time|week|month|day|year|follow[- ]?up|review|timeline|schedule)/i, 'calendar'],
  [/\b(evidence|study|trial|research|science)/i, 'microscope'],
  [/\b(cycle|loop|recur|revolving)/i, 'cycle'],
  [/\b(remove|avoid|stop|never|don'?t|risk|harm|danger|caution)/i, 'warning'],
  [/\b(repair|heal|restore|support|replete|rebuild)/i, 'bandage'],
  [/\b(learn|understand|idea|principle|insight|why)/i, 'idea'],
]

const matches = (text: string) => text ? keywordIcons.filter(([re]) => re.test(text)).map(([, name]) => name) : []
const SPARE = ['sparkle', 'target', 'idea', 'check', 'key', 'trophy', 'leaf', 'chat']

/**
 * Icons for all the items of one visual at once, so neighbours don't repeat:
 * each item takes its author-named icon, else the first matching icon (label
 * words before description words) not already used in this visual.
 */
export function pickIcons(items: { text: string; detail?: string; name?: string }[]) {
  const used = new Set<string>()
  return items.map((item) => {
    if (item.name && lessonIcons[item.name]) { used.add(item.name); return item.name }
    const options = [...matches(item.text), ...matches(item.detail || '')]
    const pick = options.find((o) => !used.has(o)) || SPARE.find((o) => !used.has(o)) || options[0] || 'sparkle'
    used.add(pick); return pick
  })
}

/** The icon for an item: one named by the author, else one matching the label, else its description. */
export function iconFor(label: string, named?: string, detail = '') {
  if (named && lessonIcons[named]) return lessonIcons[named]
  for (const text of [label, detail]) { const found = text && keywordIcons.find(([re]) => re.test(text)); if (found) return lessonIcons[found[1]] }
  return null
}

export function LessonIcon({ text, detail = '', name, size = 28, fallback = 'sparkle', className }: { text: string; detail?: string; name?: string; size?: number; fallback?: string | null; className?: string }) {
  const Icon = iconFor(text, name, detail) || (fallback ? lessonIcons[fallback] : null)
  return Icon ? <Icon size={size} className={className} /> : null
}
