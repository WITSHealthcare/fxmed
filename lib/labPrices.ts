// Pricing a lab order for its invoices. An order can be invoiced for lab
// collection or for home collection; the clinician builds each invoice from the
// price list, and it is saved with the order.
//
// Tests with a clear line on the price list are priced straight away. For the
// rest, the closest lines are suggested for the clinician to choose from.

export type CollectionType = 'lab' | 'home'

export const collectionLabels: Record<CollectionType, string> = { lab: 'Lab collection', home: 'Home collection' }

/** On every home collection invoice, for getting the sample collector to the patient. Fixed: it cannot be changed or left off. */
export const HOME_LOGISTICS_FEE = { label: 'Logistics fee', amount: 20000 }

/** Services that can be added to an order's invoice with one click, on either collection type. */
export const INVOICE_EXTRAS = [{ label: 'Functional Health Analysis', amount: 235000 }]

export type PriceItem = { name: string; category: string; price: number }

/** One line of a saved invoice. `item` is the price list line it was priced from, when there is one. */
export type LabInvoiceLine = { test: string; item: string | null; amount: number }

export type LabInvoice = { collection: CollectionType; lines: LabInvoiceLine[]; total: number; savedAt: string; savedByEmail: string | null }

/**
 * The price list for a collection type (lib/data/labPriceList.json). Lab
 * collection is the Mecure Healthcare list effective 1 April 2026; home
 * collection is the Healthtracka partner list exported 12 November 2026.
 */
export async function loadPriceList(collection: CollectionType): Promise<PriceItem[]> {
  const data = (await import('./data/labPriceList.json')).default as unknown as Record<CollectionType, [string, string, number][]>
  return (data[collection] || []).map(([name, category, price]) => ({ name, category, price }))
}

/**
 * Tests in the order form's catalogue (lib/investigationFormPdf.ts) that have
 * a clear line on the price list, by the exact name of that line. Two lines
 * mean the test is both added together. Where the list offers more than one
 * price for a test, the dearer line is used. Catalogue tests left out here
 * (CMP, VLDL, Non-HDL, Zinc, Copper, Thyroglobulin Antibody) have no clear
 * line, so the clinician chooses.
 */
const LAB_MATCHES: Record<string, string[]> = {
  // Core panel names that differ from the catalogue's.
  'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)': ['LIPID PROFILE (MAXI)'],
  'Thyroid (TSH, free T3, free T4)': ['Free T3 + Free T4 + TSH'],
  'High Sensitivity CRP': ['CRP -HIGH SENSITIVITY'],
  'ESR (Erythrocyte Sedimentation Rate)': ['ESR'],

  // Haematology
  'Complete Blood Count (CBC)': ['CBC/FBC'],
  'Peripheral Blood Film': ['PERIPHERAL SMEAR EXAMINATION BY PATHOLOGIST'],
  'Erythrocyte Sedimentation Rate (ESR)': ['ESR'],
  'Reticulocyte Count': ['Reticulocyte Count, Automated - [Blood ]'],
  'Prothrombin Time / INR': ['Prothrombin Time (Pt) - [Plasma]'],
  'Activated Partial Thromboplastin Time (aPTT)': ['PTT'],
  'Haemoglobin Electrophoresis': ['Genotype'],
  'Haemoglobin Variant Analysis': ['HAEMOGLOBIN VARIANTS'],

  // Blood sugar & metabolic
  'Fasting Blood Glucose': ['BLOOD GLUCOSE FASTING (FBS)'],
  'Random Blood Glucose': ['BLOOD GLUCOSE RANDOM (RBS)'],
  'HbA1c (Glycated Hemoglobin)': ['HBA1C'],
  'Fasting Insulin': ['Insulin, Fasting - [Serum]'],
  'Oral Glucose Tolerance Test': ['GTC-Glucose Tolerance Curve, Extended (8 Samples) - [Plasma, Urine]'],
  'Uric Acid': ['URIC ACID'],

  // Kidney & electrolytes
  'Urea': ['UREA'],
  'Creatinine': ['CREATININE'],
  'Estimated GFR (eGFR)': ['Egfr'],
  'Urine Albumin–Creatinine Ratio': ['CREATININE/ ALBUMIN RATIO'],
  'Sodium': ['Sodium - [Serum]'],
  'Potassium': ['POTASSIUM'],
  'Chloride': ['CHLORIDES'],
  'Bicarbonate': ['BICARBONATE (HCO3)'],
  'Calcium': ['CALCIUM'],
  'Magnesium': ['MAGNESIUM (SERUM)'],
  'Phosphate': ['PHOSPHORUS/PHOSPHATE'],

  // Liver & proteins
  'Liver Function Test': ['LIVER FUNCTION TEST (MAXI)'],
  'ALT': ['ALT (SGPT) - [Serum]'],
  'AST': ['AST (SGOT) - [Serum]'],
  'ALP': ['Alkaline Phosphatase - [Serum]'],
  'GGT': ['Gamma Gt (GGTP) - [Serum]'],
  'Bilirubin (Total and Direct)': ['BILIRUBIN (TOTAL, DIRECT, INDIRECT)'],
  'Total Protein and Albumin': ['PROTEINS', 'ALBUMIN'],

  // Lipids & cardiovascular
  'Total Cholesterol': ['TOTAL CHOLESTEROL'],
  'LDL Cholesterol': ['LDL Cholesterol -Direct - [Serum]'],
  'HDL Cholesterol': ['HDL Cholesterol , Direct - [Serum]'],
  'Triglycerides': ['Triglycerides - [Serum]'],
  'High-Sensitivity CRP': ['CRP -HIGH SENSITIVITY'],
  'Apolipoprotein B': ['Apolipoproteins B - [Serum]'],
  'Lipoprotein(a)': ['Lipoprotein(A) - [Serum]'],
  'Homocysteine': ['Homocysteine - [Plasma]'],
  'Troponin': ['TROPONIN I'],

  // Thyroid & hormones
  'Thyroid Function Test (TSH, Free T3, Free T4)': ['Free T3 + Free T4 + TSH'],
  'TSH': ['TSH'],
  'Free T3': ['FREE T3'],
  'Free T4': ['FREE T4'],
  'Thyroid Peroxidase Antibody': ['Tpo (Microsomal) Antibody Titre - [Serum]'],
  'Cortisol': ['Cortisol - [Serum]'],
  'DHEA-S': ['Dheas-Dihydroepiandrostenedione Sulphate - [Serum]'],
  'Prolactin': ['PROLACTIN'],
  'FSH': ['FSH'],
  'LH': ['LH'],
  'Estradiol': ['ESTRADIOL (E2)'],
  'Progesterone': ['PROGESTERONE (P4)'],
  'Testosterone': ['TESTOSTERONE (TOTAL)'],
  'SHBG': ['Sex Hormone Binding Globulin(SHBG)'],

  // Vitamins & nutritional
  'Vitamin D (25-OH Vitamin D)': ['VITAMIN D3 (25 HYDROXY CHOLECALCIFEROL)'],
  'Vitamin B12': ['VITAMIN B12 (CYANOCOBALAMIN)'],
  'Folate': ['Folate ,Serum'],
  'Ferritin': ['Ferritin - [Serum]'],
  // The summary list gives serum iron as 7,040. The full list also carries a
  // second "Iron - [Serum]" line at 47,500, the 24-hour urine price.
  'Serum Iron': ['IRON'],
  'Iron Studies': ['IRON STUDIES'],
  'Ceruloplasmin': ['Ceruloplasmin'],

  // Infection & immunology
  'HIV Screening': ['HIV I & II ANTIBODY SCREEN/RVS'],
  'Hepatitis B Surface Antigen': ['HEPATITIS B (HBSAG)'],
  'Hepatitis C Antibody': ['HEPATITIS C (ANTI-HCV)'],
  'Syphilis Screening': ['Tpha-Treponema Pallidum Haemagglutination Assay - [Serum]'],
  'C-Reactive Protein (CRP)': ['CRP -HIGH SENSITIVITY'],
  'Antinuclear Antibody (ANA)': ['Anti nuclear Antibody(ANA) By IFA'],
  'Rheumatoid Factor': ['Ra-Rhuematoid Factor (Quantitative)'],

  // Urine, stool & microbiology
  'Urinalysis': ['URINALYSIS'],
  'Urine Microscopy, Culture and Sensitivity': ['URINE M/C/S'],
  'Stool Microscopy': ['STOOL ROUTINE EXAMINATION'],
  'Stool Culture': ['STOOL M/C/S'],
  'Stool Occult Blood': ['OCCULT BLOOD (STOOL)'],
  'Helicobacter pylori Test': ['H-PYLORI (STOOL)'],
  'High Vaginal Swab M/C/S': ['C & S For Aerobic Bacteria, Automated - [Vaginal Swab]'],
  'Endocervical Swab M/C/S': ['C & S For Aerobic Bacteria, Automated - [ Endocervical Swab ]'],

  // Cancer markers
  'PSA': ['PSA'],
  'CA-125': ['CA-125'],
  'CA 15-3': ['CA -15.3'],
  'CA 19-9': ['CA-19.9'],
  'CEA': ['CEA-Carcino Embryonic Antigen - [Serum]'],
  'Alpha-Fetoprotein (AFP)': ['ALPHA-FETO-PROTEIN (AFP)'],
}

/**
 * The same for home collection, against the Healthtracka list. It covers fewer
 * tests, so more are left for the clinician to choose, type or leave off.
 * Helicobacter pylori is left out on purpose: the list has three different
 * tests for it (rapid antibody, IgG, stool antigen).
 */
const HOME_MATCHES: Record<string, string[]> = {
  // Core panel names that differ from the catalogue's.
  'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)': ['Lipid Profile (Lipogram)'],
  'Thyroid (TSH, free T3, free T4)': ['Thyroid Function Test 1 (Free T3, Free T4,TSH)'],
  'High Sensitivity CRP': ['Ultrasensitive CRP'],
  'ESR (Erythrocyte Sedimentation Rate)': ['Erythrocyte Sedimentation Rate'],

  // Haematology
  'Complete Blood Count (CBC)': ['Full Blood Count'],
  'Peripheral Blood Film': ['Blood Film Review'],
  'Erythrocyte Sedimentation Rate (ESR)': ['Erythrocyte Sedimentation Rate'],
  'Prothrombin Time / INR': ['Prothrombin Time (PT) /INR'],
  'Activated Partial Thromboplastin Time (aPTT)': ['APTT- Activated Partial Thromboplastin'],
  'Haemoglobin Electrophoresis': ['Hb Electrophoresis /Genotype (Quantitative)'],
  'Haemoglobin Variant Analysis': ['Hb Electrophoresis /Genotype (Quantitative)'],

  // Blood sugar & metabolic
  'Fasting Blood Glucose': ['Fasting Blood Sugar (FBS)'],
  'Random Blood Glucose': ['Random Blood Sugar (RBS)'],
  'HbA1c (Glycated Hemoglobin)': ['HbA1C (Glycated Heamoglobin)'],
  'Fasting Insulin': ['Insulin (Fasting)'],
  'Uric Acid': ['Uric Acid'],

  // Kidney & electrolytes
  'Urea': ['Urea'],
  'Creatinine': ['Creatinine- (Serum)'],
  'Urine Albumin–Creatinine Ratio': ['Albumin (Micro/Macro)/Creatinine Ratio (Urine)'],
  'Sodium': ['Sodium- (Serum)'],
  'Potassium': ['Potassium- (Serum)'],
  'Calcium': ['Total Calcium ( Serum )'],
  'Magnesium': ['Magnesium'],
  'Phosphate': ['Inorganic Phosphate (Serum)'],

  // Liver & proteins
  'Liver Function Test': ['Liver Function Test'],
  'ALT': ['SGPT (ALT)'],
  'AST': ['SGOT (AST)'],
  'ALP': ['Alkaline Phosphatase'],

  // Lipids & cardiovascular
  'Total Cholesterol': ['Total Cholesterol'],
  'Triglycerides': ['Triglycerides (TGL)'],
  'High-Sensitivity CRP': ['Ultrasensitive CRP'],
  'Homocysteine': ['Homocysteine'],
  'Troponin': ['Troponin-T'],

  // Thyroid & hormones
  'Thyroid Function Test (TSH, Free T3, Free T4)': ['Thyroid Function Test 1 (Free T3, Free T4,TSH)'],
  'TSH': ['Thyroid-Stimulating Hormone (TSH)'],
  'Thyroglobulin Antibody': ['Thyroglobulin Antibody (TgAb)'],
  'Cortisol': ['Cortisol (AM)'],
  'DHEA-S': ['DHEAS'],
  'Prolactin': ['Prolactin'],
  'FSH': ['Follicule Stimulating Hormone (FSH)'],
  'LH': ['LH - Luteinizing Hormone'],
  'Estradiol': ['Estradiol'],
  'Progesterone': ['Progesterone (Day 21)'],
  'Testosterone': ['Testosterone (Total)'],
  'SHBG': ['SHBG (Sex Hormone Binding Globulin)'],

  // Vitamins & nutritional
  // 25-OH vitamin D is the line the list calls "25- Dihydroxy Vitamin D Total";
  // "Vitamin D3 1.25-OH" (252,000) is the separate 1,25-dihydroxy test.
  'Vitamin D (25-OH Vitamin D)': ['25- Dihydroxy Vitamin D Total'],
  'Vitamin B12': ['Vitamin B12'],
  'Folate': ['Folate'],
  'Ferritin': ['Ferritin (Serum)'],
  'Serum Iron': ['Iron'],
  'Zinc': ['Zinc- Serum'],

  // Infection & immunology: the rapid screens, not the quantitative assays.
  'HIV Screening': ['HIV I & II Rapid'],
  'Hepatitis B Surface Antigen': ['Hepatitis B Surface Antigen (HBsAg) Rapid'],
  'Hepatitis C Antibody': ['Hepatitis C Virus Antibody (HCV) Rapid'],
  'Syphilis Screening': ['TREPONEMA PALLIDUM HEMAGGLUTINATION ASSAY (TPHA)'],
  'C-Reactive Protein (CRP)': ['C-Reactive Protein CRP'],

  // Urine, stool & microbiology
  'Urinalysis': ['Urinalysis'],
  'Urine Microscopy, Culture and Sensitivity': ['Urine Microscopy Culture & Sensitivity'],
  'Stool Microscopy': ['Stool Microscopy'],
  'Stool Culture': ['Stool: Microscopy, Culture And Sensitivity'],
  'Stool Occult Blood': ['Stool Occult Blood'],
  'High Vaginal Swab M/C/S': ['High Vaginal Swab (Hvs): Microscopy, Culture And Sensitivity'],
  'Endocervical Swab M/C/S': ['Endocervical Swab (ECS): Microscopy, Culture And Sensitivity'],

  // Cancer markers
  'PSA': ['Total Prostate Specific Antigen (Total PSA)'],
  'CA-125': ['CA - 125'],
  'CA 19-9': ['CA - 19 - 9'],
  'CEA': ['Carcinoembryonic Antigen (CEA)'],
  'Alpha-Fetoprotein (AFP)': ['Alpha Fetoprotein (AFP)'],
}

const CATALOGUE_MATCHES: Record<CollectionType, Record<string, string[]>> = { lab: LAB_MATCHES, home: HOME_MATCHES }

// How clinicians write tests, in the words the price list uses.
const PHRASES: [RegExp, string][] = [
  [/\b(full|complete) blood count\b/g, 'cbc'],
  [/\bfbc\b/g, 'cbc'],
  [/\bmicroscopy,? culture (and|&) sensitivity\b/g, 'mcs'],
  [/\bculture (and|&) sensitivity\b/g, 'mcs'],
  [/\bm\s*\/\s*c\s*\/\s*s\b/g, 'mcs'],
  [/\bc\s*&\s*s\b/g, 'mcs'],
  [/\bglycated ha?emoglobin\b/g, 'hba1c'],
  [/\bhemoglobin\b/g, 'haemoglobin'],
  [/\bhematocrit\b/g, 'haematocrit'],
  [/\banemia\b/g, 'anaemia'],
  [/\bthyroid[- ]stimulating hormone\b/g, 'tsh'],
  [/\bthyroid function tests?\b/g, 'thyroid profile'],
  [/\btft\b/g, 'thyroid profile'],
  [/\blfts?\b/g, 'liver function test'],
  [/\b(rft|kft|kidney function tests?|e\s*\/\s*u\s*\/\s*cr)\b/g, 'renal function test'],
  [/\b(fbs|fbg|fasting blood (glucose|sugar))\b/g, 'blood glucose fasting'],
  [/\b(rbs|rbg|random blood (glucose|sugar))\b/g, 'blood glucose random'],
  [/\bc[- ]reactive protein\b/g, 'crp'],
  [/\bh\.?\s*-?\s*pylori\b/g, 'helicobacter pylori'],
  [/\b25\s*-?\s*oh\b/g, '25 hydroxy'],
  [/\bvitamin d3\b/g, 'vitamin d'],
  [/\bmalaria\b/g, 'malarial'],
  [/\bmp\b/g, 'malarial parasite'],
  [/\bpcv\b/g, 'packed cell volume'],
  [/\bheamoglobin\b/g, 'haemoglobin'],
  [/\bhb electrophoresi\w*\b/g, 'genotype'],
  [/\bseminal fluid analysi\w*\b|\bsemen analysi\w*\b|\bsfa\b/g, 'semen analysis'],
  [/\b(ecg|electrocardiogram)\b/g, 'ecg'],
  [/\bkidney function\b/g, 'renal function'],
  [/\bafp\b/g, 'alpha feto protein'],
  [/\balpha[- ]?fetoprotein\b/g, 'alpha feto protein'],
  [/\bpap smears?\b/g, 'pap smear'],
  [/\bhvs\b/g, 'vaginal swab'],
  [/\bx\s*-?\s*ray\b/g, 'xray'],
  [/\b(ultrasound|uss|usg|scan)\b/g, 'sonography'],
]

/** A test or price list name as comparable words: lower case, common wordings unified, plurals dropped. */
function words(name: string): string[] {
  let text = ` ${name.toLowerCase()} `
  for (const [pattern, replacement] of PHRASES) text = text.replace(pattern, replacement)
  return text.split(/[^a-z0-9]+/).filter(Boolean).map(word => word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)
}

/**
 * A name reduced to what identifies the test, for telling when two names are
 * the same test: the usual specimen ("[Serum]") and the word "test" are left
 * out, and word order and repeats do not matter.
 */
function identity(name: string) {
  const unique = new Set(words(name.replace(/\[\s*(serum|blood|plasma)\s*\]/gi, ' ')).filter(word => word !== 'test'))
  return Array.from(unique).sort().join(' ')
}

type Indexed = { item: PriceItem; words: string[]; text: string }
type Index = { entries: Indexed[]; weight: (word: string) => number; byName: Map<string, PriceItem> }
const indexes = new WeakMap<PriceItem[], Index>()

// Rare words say more about a test than common ones ("serum", "test"), so they weigh more.
function indexOf(list: PriceItem[]): Index {
  const existing = indexes.get(list)
  if (existing) return existing
  const entries = list.map(item => ({ item, words: words(item.name), text: identity(item.name) }))
  const counts = new Map<string, number>()
  for (const entry of entries) for (const word of Array.from(new Set(entry.words))) counts.set(word, (counts.get(word) || 0) + 1)
  const weight = (word: string) => Math.log(1 + entries.length / (1 + (counts.get(word) || 0)))
  const index = { entries, weight, byName: new Map(list.map(item => [item.name, item])) }
  indexes.set(list, index)
  return index
}

// Words too general to suggest a line on their own: "Reticulocyte Count" is not "CD4 Count".
const GENERIC = new Set(['count', 'test', 'total', 'free', 'profile', 'antibody', 'antigen', 'serum', 'urine', 'blood', 'rapid', 'panel', 'level', 'ratio', 'screen', 'screening', 'quantitative', 'qualitative', 'direct', 'and', 'with', 'for'])
/** A word that says which test it is: not a general one, and not a stray letter or number ("B", "3"), though "T3" and "B12" are. */
const telling = (word: string) => !GENERIC.has(word) && (word.length >= 3 || (word.length === 2 && /[a-z]/.test(word) && /\d/.test(word)))

function ranked(query: string, list: PriceItem[], limit: number, floor: number): PriceItem[] {
  const index = indexOf(list)
  const queryWords = Array.from(new Set(words(query)))
  if (!queryWords.length) return []
  const queryWeight = queryWords.reduce((sum, word) => sum + index.weight(word), 0)
  const scored: { item: PriceItem; score: number }[] = []
  for (const entry of index.entries) {
    let found = 0
    let relevant = false
    for (const word of queryWords) {
      if (entry.words.includes(word)) { found += index.weight(word); relevant = relevant || telling(word) }
      // "trig" finds "triglyceride": part of a word counts for less.
      else if (word.length >= 4 && entry.words.some(other => other.startsWith(word) || (other.length >= 6 && word.startsWith(other)))) { found += index.weight(word) * 0.7; relevant = relevant || telling(word) }
    }
    if (!found || !relevant) continue
    const itemWeight = entry.words.reduce((sum, word) => sum + index.weight(word), 0)
    const shared = entry.words.reduce((sum, word) => sum + (queryWords.includes(word) ? index.weight(word) : 0), 0)
    let score = 0.75 * (found / queryWeight) + 0.25 * (itemWeight ? shared / itemWeight : 0)
    // The everyday list first, referral tests last, when otherwise alike.
    if (entry.item.category === 'Common tests') score += 0.06
    if (entry.item.category.startsWith('Referral')) score -= 0.1
    if (score >= floor) scored.push({ item: entry.item, score })
  }
  return scored.sort((a, b) => b.score - a.score || b.item.price - a.item.price).slice(0, limit).map(entry => entry.item)
}

/** Price list lines closest to what was typed, best first. */
export function searchPriceList(query: string, list: PriceItem[], limit = 8): PriceItem[] {
  return ranked(query, list, limit, 0.2)
}

export type TestMatch =
  | { test: string; status: 'matched'; item: string; amount: number }
  | { test: string; status: 'choose'; suggestions: PriceItem[] }

/**
 * Prices each ordered test from the list. A test is matched when the catalogue
 * names its line, or when a line on the list has the very same name; with
 * several such lines, the dearest. Anything else comes back with the closest
 * lines as suggestions, for the clinician to choose.
 */
export function matchTests(tests: string[], list: PriceItem[], collection: CollectionType): TestMatch[] {
  const index = indexOf(list)
  const catalogue = new Map(Object.entries(CATALOGUE_MATCHES[collection]).map(([name, items]) => [name.trim().toLowerCase(), items]))
  return tests.map(test => {
    const named = catalogue.get(test.trim().toLowerCase())?.map(name => index.byName.get(name))
    if (named?.length && named.every(Boolean)) {
      const items = named as PriceItem[]
      return { test, status: 'matched', item: items.map(item => item.name).join(' + '), amount: items.reduce((sum, item) => sum + item.price, 0) }
    }
    const text = identity(test)
    const same = text ? index.entries.filter(entry => entry.text === text).map(entry => entry.item).sort((a, b) => b.price - a.price) : []
    if (same.length) return { test, status: 'matched', item: same[0].name, amount: same[0].price }
    return { test, status: 'choose', suggestions: ranked(test, list, 5, 0.3) }
  })
}
