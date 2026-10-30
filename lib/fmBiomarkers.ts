// Functional medicine lab analysis: the biomarker catalogue, and how a result
// is judged against both the laboratory's reference range and the narrower
// functional-medicine (FM) optimal range.
//
// Shared by the admin screen, the API and the PDF, so a marker is classified
// the same way wherever it is shown. Ranges are in the units listed; a result
// entered in another unit is compared against a converted FM range where a
// conversion is known, and otherwise left for the clinician to set.

export type PanelId =
  | 'cardio' | 'glucose' | 'thyroid' | 'adrenal' | 'kidney' | 'liver'
  | 'methylation' | 'hematology' | 'electrolytes' | 'vitamins' | 'inflammation' | 'other'

export type Panel = { id: PanelId; name: string; short: string; color: string; description: string }

export const FM_PANELS: Panel[] = [
  { id: 'cardio', name: 'Cardio-Metabolic', short: 'Cardio-Metabolic', color: '#C94A4A', description: 'Lipid fractions, cardiovascular risk markers, and metabolic indicators.' },
  { id: 'glucose', name: 'Glucose Metabolism', short: 'Glucose', color: '#0E9F6E', description: 'Insulin sensitivity, beta-cell function, and glycaemic control.' },
  { id: 'thyroid', name: 'Thyroid Panel', short: 'Thyroid', color: '#C8730F', description: 'Full thyroid assessment including conversion efficiency and autoimmunity.' },
  { id: 'adrenal', name: 'Adrenal & Hormone Panel', short: 'Adrenal/Hormones', color: '#C94A4A', description: 'Adrenal cortex output, sex hormones, and binding proteins.' },
  { id: 'kidney', name: 'Kidney Function', short: 'Kidney', color: '#3B82F6', description: 'Filtration capacity, waste clearance, and renal metabolite handling.' },
  { id: 'liver', name: 'Liver Function & Detoxification', short: 'Liver/Detox', color: '#7E57C2', description: 'Phase I/II detox capacity, bile flow, hepatocyte integrity.' },
  { id: 'methylation', name: 'Methylation Panel', short: 'Methylation', color: '#1A7A65', description: 'B12, folate and homocysteine for methylation cycle efficiency.' },
  { id: 'hematology', name: 'Hematology', short: 'Hematology', color: '#D94F7E', description: 'Red blood cell morphology, oxygen-carrying capacity, and immune cell counts.' },
  { id: 'electrolytes', name: 'Electrolytes & Minerals', short: 'Electrolytes', color: '#3B82F6', description: 'Ionic balance, cellular hydration, and mineral co-factor status.' },
  { id: 'vitamins', name: 'Vitamins & Micronutrients', short: 'Vitamins', color: '#139488', description: 'Key vitamins and micronutrients critical for enzymatic function.' },
  { id: 'inflammation', name: 'Inflammation & Bone Metabolism', short: 'Inflammation', color: '#D97706', description: 'Systemic inflammatory burden, PTH signalling, and muscle integrity.' },
  { id: 'other', name: 'Additional Markers', short: 'Other', color: '#4B6358', description: 'Results reported by the laboratory outside the standard panels.' },
]

export const panelById = (id: PanelId) => FM_PANELS.find(panel => panel.id === id) || FM_PANELS[FM_PANELS.length - 1]

type Pair = [number | null, number | null]
type SexRanges = { lab?: Pair; fm?: Pair }

export type Biomarker = {
  id: string
  name: string
  panel: PanelId
  unit: string
  lab: Pair
  fm: Pair
  aliases?: string[]
  female?: SexRanges
  male?: SexRanges
  /** Values past these are urgent regardless of how far outside range they are. */
  critical?: { low?: number; high?: number }
  /** Also shown on these panels' pages, as in the template (e.g. B12, hs-CRP). */
  alsoIn?: PanelId[]
}

const m = (id: string, name: string, panel: PanelId, unit: string, lab: Pair, fm: Pair, extra: Partial<Biomarker> = {}): Biomarker =>
  ({ id, name, panel, unit, lab, fm, ...extra })

export const FM_BIOMARKERS: Biomarker[] = [
  // Cardio-metabolic
  m('total_cholesterol', 'Total Cholesterol', 'cardio', 'mmol/L', [3, 5.2], [3.6, 5.2], { aliases: ['cholesterol', 'chol', 'tc'] }),
  m('ldl', 'LDL Cholesterol', 'cardio', 'mmol/L', [0, 3.37], [0, 2.59], { aliases: ['ldl', 'ldl-c', 'low density lipoprotein'] }),
  m('hdl', 'HDL Cholesterol', 'cardio', 'mmol/L', [1, 1.5], [1.55, 3], { aliases: ['hdl', 'hdl-c', 'high density lipoprotein'] }),
  m('triglycerides', 'Triglycerides', 'cardio', 'mmol/L', [0, 1.7], [0, 0.9], { aliases: ['tg', 'trigs', 'triglyceride'] }),
  m('lpa', 'Lipoprotein (a)', 'cardio', 'mg/dL', [0, 30], [0, 30], { aliases: ['lp(a)', 'lpa', 'lipoprotein a'], critical: { high: 50 } }),
  m('apoa1', 'Apolipoprotein A1', 'cardio', 'g/L', [1.2, 2.4], [1.4, 2.2], { aliases: ['apo a1', 'apoa1', 'apo a-1'] }),
  m('apob', 'Apolipoprotein B', 'cardio', 'g/L', [0.6, 1.1], [0.5, 0.9], { aliases: ['apo b', 'apob'] }),
  m('non_hdl', 'Non-HDL Cholesterol', 'cardio', 'mmol/L', [0, 4.2], [0, 3.4], { aliases: ['non hdl', 'non-hdl-c'] }),
  m('chol_hdl_ratio', 'Chol./HDL Ratio', 'cardio', 'ratio', [0, 5], [0, 4], { aliases: ['cholesterol/hdl ratio', 'tc/hdl', 'chol/hdl'] }),
  m('tg_hdl_ratio', 'Triglyceride/HDL Ratio', 'cardio', 'ratio', [0, 1.7], [0, 0.9], { aliases: ['tg/hdl', 'triglyceride/hdl ratio', 'tg:hdl'] }),
  // Glucose
  m('fasting_glucose', 'Fasting Glucose', 'glucose', 'mmol/L', [3.9, 6], [4.4, 5.5], { aliases: ['glucose', 'fbs', 'fbg', 'fasting blood sugar', 'fasting blood glucose', 'fasting plasma glucose'], critical: { low: 3, high: 11 } }),
  m('hba1c', 'HbA1c', 'glucose', '%', [4, 5.6], [4, 5.4], { aliases: ['hba1c (ngsp)', 'glycated haemoglobin', 'glycated hemoglobin', 'a1c'], critical: { high: 9 } }),
  m('hba1c_ifcc', 'HbA1c (IFCC)', 'glucose', 'mmol/mol', [20, 38], [20, 36], { aliases: ['hba1c ifcc'] }),
  m('fasting_insulin', 'Fasting Insulin', 'glucose', 'µIU/mL', [2.6, 24.9], [2.6, 8], { aliases: ['insulin', 'insulin fasting'] }),
  m('c_peptide', 'C-Peptide', 'glucose', 'pmol/L', [298, 1324], [298, 900], { aliases: ['c peptide'] }),
  m('homa_ir', 'HOMA-IR', 'glucose', 'index', [0.5, 1.4], [0.5, 1], { aliases: ['homa ir', 'homa'] }),
  m('glucose_insulin_ratio', 'Glucose/Insulin Ratio', 'glucose', 'ratio', [0.5, 2], [0.8, 2], { aliases: ['glucose/insulin'] }),
  m('quicki', 'QUICKI Index', 'glucose', 'index', [0.33, 0.45], [0.35, 0.45], { aliases: ['quicki'] }),
  // Thyroid
  m('tsh', 'TSH', 'thyroid', 'µIU/mL', [0.4, 4], [1, 2.5], { aliases: ['thyroid stimulating hormone', 'thyrotropin'], critical: { high: 10 } }),
  m('free_t3', 'Free T3', 'thyroid', 'pmol/L', [3.5, 6.5], [5, 6.5], { aliases: ['ft3', 'free triiodothyronine'] }),
  m('free_t4', 'Free T4', 'thyroid', 'pmol/L', [10, 23], [15, 23], { aliases: ['ft4', 'free thyroxine'] }),
  m('reverse_t3', 'Reverse T3', 'thyroid', 'ng/mL', [0.09, 0.35], [0.09, 0.2], { aliases: ['rt3', 'reverse triiodothyronine'] }),
  m('anti_tpo', 'Anti-TPO Ab', 'thyroid', 'IU/mL', [0, 35], [0, 2], { aliases: ['tpo', 'tpo antibodies', 'anti-thyroid peroxidase', 'thyroid peroxidase antibodies', 'thyroid peroxidase antibody'] }),
  m('anti_tg', 'Anti-TG Ab', 'thyroid', 'IU/mL', [0, 40], [0, 2], { aliases: ['tg antibodies', 'anti-thyroglobulin', 'thyroglobulin antibodies', 'thyroglobulin antibody'] }),
  // Adrenal & hormones
  m('dhea_s', 'DHEA-S', 'adrenal', 'µmol/L', [2.68, 9.23], [5, 9.23], { aliases: ['dheas', 'dhea sulphate', 'dhea sulfate'] }),
  m('cortisol_am', 'Cortisol AM', 'adrenal', 'µg/dL', [6.2, 19.4], [10, 15], { aliases: ['cortisol', 'morning cortisol', 'cortisol (am)', 'cortisol 8am'], critical: { low: 3 } }),
  m('cortisol_pm', 'Cortisol PM', 'adrenal', 'µg/dL', [2.3, 11.9], [3, 8], { aliases: ['evening cortisol', 'cortisol (pm)'] }),
  m('testosterone', 'Testosterone', 'adrenal', 'nmol/L', [0.5, 2.6], [1, 2], { aliases: ['total testosterone'], male: { lab: [8.6, 29], fm: [17, 28] } }),
  m('shbg', 'SHBG', 'adrenal', 'nmol/L', [18, 114], [18, 80], { aliases: ['sex hormone binding globulin'], male: { lab: [18, 54], fm: [20, 50] } }),
  m('free_testosterone', 'Free Testosterone', 'adrenal', 'pmol/L', [0, 26], [5, 18], { male: { lab: [174, 729], fm: [350, 700] } }),
  m('free_testosterone_index', 'Free Testosterone Index', 'adrenal', 'ratio', [0.5, 5], [1, 3.5], { aliases: ['fai', 'free androgen index'], male: { lab: [35, 92], fm: [50, 90] } }),
  m('estradiol', 'Estradiol (E2)', 'adrenal', 'pmol/L', [45, 1460], [180, 1000], { aliases: ['oestradiol', 'e2', 'estradiol'], male: { lab: [40, 160], fm: [70, 150] } }),
  m('progesterone', 'Progesterone', 'adrenal', 'nmol/L', [0.2, 90], [0.6, 90], { aliases: ['serum progesterone'], male: { lab: [0.2, 1.3], fm: [0.3, 1.3] } }),
  // Kidney
  m('creatinine', 'Creatinine', 'kidney', 'µmol/L', [44, 80], [50, 85], { aliases: ['serum creatinine', 'creat'], male: { lab: [62, 106], fm: [65, 100] } }),
  m('egfr', 'eGFR', 'kidney', 'mL/min/1.73 m²', [90, 120], [90, 120], { aliases: ['gfr', 'estimated gfr'], critical: { low: 60 } }),
  m('urea', 'Urea', 'kidney', 'mmol/L', [2.5, 7.8], [3, 6.5], { aliases: ['bun', 'blood urea'] }),
  m('uric_acid', 'Uric Acid', 'kidney', 'mmol/L', [0.15, 0.36], [0.18, 0.3], { aliases: ['urate'], male: { lab: [0.2, 0.43], fm: [0.21, 0.33] } }),
  m('protein_creatinine', 'Protein/Creatinine Ratio', 'kidney', 'g/g', [0, 0.2], [0, 0.15], { aliases: ['protein/creatinine', 'upcr', 'urine protein creatinine ratio'] }),
  m('amylase', 'Amylase', 'kidney', 'IU/L', [30, 110], [30, 100], { aliases: ['serum amylase'] }),
  m('u_creatinine', 'U-Creatinine', 'kidney', 'g/L', [0.15, 1.5], [0.3, 1.2], { aliases: ['urine creatinine'] }),
  m('u_protein', 'U-Protein', 'kidney', 'g/L', [0, 0.15], [0, 0.08], { aliases: ['urine protein'] }),
  // Liver
  m('alt', 'ALT (SGPT)', 'liver', 'IU/L', [7, 55], [7, 35], { aliases: ['alt', 'sgpt', 'alanine aminotransferase'] }),
  m('ast', 'AST (SGOT)', 'liver', 'IU/L', [10, 40], [10, 26], { aliases: ['ast', 'sgot', 'aspartate aminotransferase'] }),
  m('ggt', 'GGT', 'liver', 'IU/L', [5, 55], [5, 30], { aliases: ['gamma gt', 'gamma-glutamyl transferase'] }),
  m('alp', 'Alk. Phosphatase', 'liver', 'IU/L', [30, 120], [30, 90], { aliases: ['alp', 'alkaline phosphatase'] }),
  m('bilirubin_total', 'Bilirubin (Total)', 'liver', 'µmol/L', [5, 21], [5, 17], { aliases: ['total bilirubin', 't. bilirubin', 'tbil'] }),
  m('bilirubin_conj', 'Bilirubin (Conj.)', 'liver', 'µmol/L', [0, 5], [0, 4], { aliases: ['direct bilirubin', 'conjugated bilirubin', 'd. bilirubin', 'dbil'] }),
  m('albumin', 'Albumin', 'liver', 'g/L', [35, 50], [40, 50], { aliases: ['serum albumin', 'alb'] }),
  m('total_protein', 'Total Protein', 'liver', 'g/L', [60, 80], [65, 80], { aliases: ['serum protein', 'tp'] }),
  m('globulin', 'Globulin', 'liver', 'g/L', [20, 35], [24, 30], { aliases: ['total globulin', 'serum globulin'] }),
  m('ast_alt_ratio', 'AST/ALT Ratio', 'liver', 'ratio', [0.4, 1.5], [0.6, 1.2], { aliases: ['ast/alt', 'de ritis ratio', 'ast:alt'] }),
  m('ldh', 'LDH', 'liver', 'IU/L', [120, 246], [140, 200], { aliases: ['lactate dehydrogenase', 'ld'] }),
  m('a1at', 'Alpha-1 Antitrypsin', 'liver', 'mg/dL', [90, 200], [100, 180], { aliases: ['a1at', 'alpha 1 antitrypsin'] }),
  // Methylation
  m('b12', 'Vitamin B12', 'methylation', 'pmol/L', [133, 675], [400, 675], { aliases: ['b12', 'cobalamin', 'cyanocobalamin'], alsoIn: ['vitamins'] }),
  m('folate', 'Folate (Serum)', 'methylation', 'nmol/L', [7, 46], [20, 46], { aliases: ['folate', 'folic acid', 'serum folate'] }),
  m('homocysteine', 'Homocysteine', 'methylation', 'µmol/L', [0, 15.4], [0, 9], { aliases: ['hcy', 'plasma homocysteine'], alsoIn: ['inflammation'] }),
  // Hematology
  m('rbc', 'RBC Count', 'hematology', '×10¹²/L', [3.8, 5.8], [4, 5], { aliases: ['rbc', 'red blood cell count', 'red cell count', 'erythrocytes'], male: { lab: [4.5, 5.9], fm: [4.4, 5.4] } }),
  m('hemoglobin', 'Hemoglobin', 'hematology', 'g/dL', [11.5, 16.5], [12, 14.5], { aliases: ['haemoglobin', 'hb', 'hgb'], male: { lab: [13, 17.5], fm: [14, 16] }, critical: { low: 8 } }),
  m('hematocrit', 'Hematocrit', 'hematology', '%', [36, 47], [37, 44], { aliases: ['haematocrit', 'hct', 'pcv', 'packed cell volume'], male: { lab: [40, 52], fm: [42, 48] } }),
  m('mcv', 'MCV', 'hematology', 'fL', [76, 99], [82, 92], { aliases: ['mean corpuscular volume', 'mean cell volume'] }),
  m('mch', 'MCH', 'hematology', 'pg', [26, 34], [27, 32], { aliases: ['mean corpuscular haemoglobin', 'mean corpuscular hemoglobin'] }),
  m('mchc', 'MCHC', 'hematology', 'g/dL', [30, 37], [32, 36], { aliases: ['mean corpuscular haemoglobin concentration', 'mean corpuscular hemoglobin concentration'] }),
  m('rdw', 'RDW', 'hematology', '%', [11.5, 14.5], [11.5, 13], { aliases: ['red cell distribution width', 'rdw-cv'] }),
  m('platelets', 'Platelets', 'hematology', '×10⁹/L', [150, 450], [175, 350], { aliases: ['platelet count', 'plt'], critical: { low: 50, high: 1000 } }),
  m('wbc', 'WBC Count', 'hematology', '×10⁹/L', [4, 11], [4.5, 7.5], { aliases: ['wbc', 'white blood cell count', 'white cell count', 'leucocytes', 'leukocytes', 'total wbc'], critical: { low: 2, high: 25 } }),
  m('neutrophils', 'Neutrophils', 'hematology', '×10⁹/L', [1.5, 7.5], [1.9, 4.2], { aliases: ['neutrophil count', 'absolute neutrophils', 'neutrophils absolute', 'neut', 'anc'], critical: { low: 0.5 } }),
  m('lymphocytes', 'Lymphocytes', 'hematology', '×10⁹/L', [1, 4], [1.5, 3.1], { aliases: ['lymphocyte count', 'absolute lymphocytes', 'lymphocytes absolute', 'lymph'] }),
  m('monocytes', 'Monocytes', 'hematology', '×10⁹/L', [0.2, 1], [0.2, 0.6], { aliases: ['monocyte count', 'absolute monocytes', 'monocytes absolute', 'mono'] }),
  m('eosinophils', 'Eosinophils', 'hematology', '×10⁹/L', [0, 0.5], [0, 0.3], { aliases: ['eosinophil count', 'absolute eosinophils', 'eosinophils absolute', 'eos'] }),
  m('basophils', 'Basophils', 'hematology', '×10⁹/L', [0, 0.1], [0, 0.1], { aliases: ['basophil count', 'absolute basophils', 'basophils absolute', 'baso'] }),
  m('nlr', 'Neutrophil/Lymphocyte Ratio', 'hematology', 'ratio', [0.8, 3.5], [1.2, 2.2], { aliases: ['nlr', 'neutrophil:lymphocyte', 'neutrophil/lymphocyte'] }),
  m('esr', 'ESR (Westergren)', 'hematology', 'mm/hr', [0, 20], [0, 15], { aliases: ['esr', 'erythrocyte sedimentation rate'] }),
  // Electrolytes & minerals
  m('sodium', 'Sodium', 'electrolytes', 'mmol/L', [136, 145], [138, 142], { aliases: ['na', 'na+', 'serum sodium'], critical: { low: 125, high: 155 } }),
  m('potassium', 'Potassium', 'electrolytes', 'mmol/L', [3.5, 5.1], [4, 4.5], { aliases: ['k', 'k+', 'serum potassium'], critical: { low: 3, high: 6 } }),
  m('chloride', 'Chloride', 'electrolytes', 'mmol/L', [98, 107], [100, 106], { aliases: ['cl', 'cl-'] }),
  m('bicarbonate', 'Bicarbonate', 'electrolytes', 'mmol/L', [22, 29], [24, 28], { aliases: ['hco3', 'co2', 'total co2', 'bicarb'] }),
  m('anion_gap', 'Anion Gap', 'electrolytes', 'mmol/L', [7, 16], [7, 12], { aliases: ['ag'] }),
  m('calcium', 'Calcium', 'electrolytes', 'mmol/L', [2.15, 2.55], [2.25, 2.45], { aliases: ['ca', 'serum calcium', 'total calcium'], critical: { low: 1.9, high: 3 } }),
  m('ca_phos_ratio', 'Ca/Phos. Ratio', 'electrolytes', 'ratio', [1.5, 2.5], [1.8, 2.5], { aliases: ['calcium/phosphate ratio'] }),
  m('na_k_ratio', 'Na/K Ratio', 'electrolytes', 'ratio', [27, 40], [30, 40], { aliases: ['sodium/potassium ratio'] }),
  m('rbc_magnesium', 'RBC Magnesium', 'electrolytes', 'mmol/L', [1.65, 2.65], [1.8, 2.5], { aliases: ['rbc mg', 'red cell magnesium'] }),
  m('magnesium', 'Magnesium (Serum)', 'electrolytes', 'mmol/L', [0.66, 1.07], [0.85, 1], { aliases: ['magnesium', 'mg', 'serum magnesium'] }),
  m('phosphate', 'Phosphate', 'electrolytes', 'mmol/L', [0.74, 1.52], [0.9, 1.3], { aliases: ['s-phosphate inorg.', 'phosphorus', 'inorganic phosphate', 'serum phosphate'] }),
  // Vitamins & micronutrients
  m('vitamin_d', 'Vitamin D (25-OH)', 'vitamins', 'ng/mL', [30, 100], [50, 80], { aliases: ['vitamin d', '25-oh vitamin d', '25(oh)d', '25-hydroxy vitamin d', 'vit d'] }),
  m('serum_iron', 'Serum Iron', 'vitamins', 'µmol/L', [9, 30.4], [12, 25], { aliases: ['iron', 'fe'] }),
  m('transferrin', 'Transferrin', 'vitamins', 'µmol/L', [24, 45], [26, 42]),
  m('tibc', 'TIBC', 'vitamins', 'µmol/L', [45, 72], [50, 65], { aliases: ['total iron binding capacity'] }),
  m('tsat', 'Transferrin Saturation', 'vitamins', '%', [20, 50], [25, 45], { aliases: ['tsat', 'iron saturation'] }),
  m('ferritin', 'Ferritin', 'vitamins', 'ng/mL', [20, 300], [50, 200], { aliases: ['serum ferritin'], female: { lab: [13, 150], fm: [50, 120] } }),
  m('zinc', 'Serum Zinc', 'vitamins', 'µmol/L', [10.7, 18.4], [14, 18], { aliases: ['zinc', 'zn'] }),
  // Inflammation & bone
  m('hs_crp', 'hs-CRP', 'inflammation', 'mg/L', [0, 1], [0, 0.5], { aliases: ['crp', 'high sensitivity crp', 'high-sensitivity crp', 'c-reactive protein', 'hscrp'], alsoIn: ['methylation'] }),
  m('pth', 'PTH', 'inflammation', 'pg/mL', [15, 65], [15, 45], { aliases: ['parathyroid hormone', 'intact pth'] }),
  m('ck', 'Creatine Kinase', 'inflammation', 'IU/L', [26, 140], [26, 90], { aliases: ['ck', 'cpk', 'creatine phosphokinase'] }),
]

export const markerById = (id: string | null | undefined) => (id ? FM_BIOMARKERS.find(marker => marker.id === id) : undefined) || null

// ---------------------------------------------------------------------------
// Names and units

const squash = (value: string) => value.toLowerCase().replace(/[µμ]/g, 'u').replace(/[^a-z0-9%/]+/g, '')

const nameIndex = new Map<string, Biomarker>()
for (const marker of FM_BIOMARKERS) {
  for (const name of [marker.name, marker.id, ...(marker.aliases || [])]) {
    const key = squash(name)
    if (!nameIndex.has(key)) nameIndex.set(key, marker)
  }
}

/** The catalogue marker a laboratory's test name refers to, if any. */
export function matchBiomarker(name: string): Biomarker | null {
  const key = squash(name)
  if (!key) return null
  const exact = nameIndex.get(key)
  if (exact) return exact
  // Drop a trailing qualifier the lab adds, as in "Ferritin, serum".
  const head = squash(name.split(/[,(\[]/)[0] || '')
  return (head && nameIndex.get(head)) || null
}

const UNIT_SYNONYMS: Record<string, string> = {
  'meq/l': 'mmol/l', 'uiu/ml': 'miu/l', 'mu/l': 'miu/l', 'uu/ml': 'miu/l', 'ulu/ml': 'miu/l', 'uiu/l': 'miu/l', 'miu/ml': 'iu/l',
  'u/l': 'iu/l', 'mm/h': 'mm/hr', 'x10^9/l': '×10⁹/l', 'x109/l': '×10⁹/l', '10^9/l': '×10⁹/l', 'k/ul': '×10⁹/l', 'x10^3/ul': '×10⁹/l', '×10³/ul': '×10⁹/l', '10^3/ul': '×10⁹/l',
  'x10^12/l': '×10¹²/l', 'x1012/l': '×10¹²/l', 'm/ul': '×10¹²/l', 'x10^6/ul': '×10¹²/l', '×10⁶/ul': '×10¹²/l',
  'ml/min': 'ml/min/1.73m²', 'ml/min/1.73m2': 'ml/min/1.73m²',
  'mcg/l': 'ug/l', 'mcg/dl': 'ug/dl', 'mcg/ml': 'ug/ml',
}

/** A unit in one spelling, so "µIU/mL", "uIU/ml" and "mIU/L" compare equal. */
export function normalizeUnit(unit: string) {
  const base = unit.trim().toLowerCase().replace(/\s+/g, '').replace(/[μµ]/g, 'u').replace(/cumm|mm3/g, 'ul')
  return UNIT_SYNONYMS[base] || base
}

// Factor to multiply a value in the catalogue unit by to get the other unit.
const CONVERSIONS: Record<string, Record<string, number>> = {
  fasting_glucose: { 'mg/dl': 18.016 },
  total_cholesterol: { 'mg/dl': 38.67 }, ldl: { 'mg/dl': 38.67 }, hdl: { 'mg/dl': 38.67 }, non_hdl: { 'mg/dl': 38.67 },
  triglycerides: { 'mg/dl': 88.57 },
  lpa: { 'nmol/l': 2.15 },
  apoa1: { 'mg/dl': 100 }, apob: { 'mg/dl': 100 },
  creatinine: { 'mg/dl': 1 / 88.4 },
  urea: { 'mg/dl': 2.8 },
  uric_acid: { 'mg/dl': 16.81, 'µmol/l': 1000 },
  bilirubin_total: { 'mg/dl': 1 / 17.1 }, bilirubin_conj: { 'mg/dl': 1 / 17.1 },
  albumin: { 'g/dl': 0.1 }, total_protein: { 'g/dl': 0.1 },
  cortisol_am: { 'nmol/l': 27.59 }, cortisol_pm: { 'nmol/l': 27.59 },
  testosterone: { 'ng/dl': 28.84, 'ng/ml': 0.2884 },
  dhea_s: { 'µg/dl': 36.8 },
  free_t3: { 'pg/ml': 0.651 }, free_t4: { 'ng/dl': 0.0777 },
  b12: { 'pg/ml': 1.355 }, folate: { 'ng/ml': 0.441 },
  estradiol: { 'pg/ml': 0.2724 }, progesterone: { 'ng/ml': 0.3145 },
  globulin: { 'g/dl': 0.1 },
  hemoglobin: { 'g/l': 10 }, mchc: { 'g/l': 10 },
  hematocrit: { 'l/l': 0.01 },
  calcium: { 'mg/dl': 4.008 }, magnesium: { 'mg/dl': 2.43 }, phosphate: { 'mg/dl': 3.097 },
  serum_iron: { 'µg/dl': 5.585 }, tibc: { 'µg/dl': 5.585 },
  zinc: { 'µg/dl': 6.54 },
  vitamin_d: { 'nmol/l': 2.496 },
  hs_crp: { 'mg/dl': 0.1 },
  fasting_insulin: { 'pmol/l': 6.945 },
  c_peptide: { 'ng/ml': 1 / 331 },
  tsh: { 'miu/l': 1 },
}

/** The factor from a marker's catalogue unit to `unit`, already normalised. */
function conversion(markerId: string, unit: string) {
  const match = Object.entries(CONVERSIONS[markerId] || {}).find(([key]) => normalizeUnit(key) === unit)
  return match?.[1]
}

export type Sex = 'female' | 'male' | ''

/** Lab and FM ranges for a marker, for a sex, in the catalogue unit. */
function rangesFor(marker: Biomarker, sex: Sex) {
  const override = sex === 'male' ? marker.male : sex === 'female' ? marker.female : undefined
  return { lab: override?.lab || marker.lab, fm: override?.fm || marker.fm }
}

/**
 * The default ranges for a marker reported in `unit`. When the lab's unit
 * differs and no conversion is known, nothing is returned: comparing against a
 * range in another unit would misclassify the result.
 */
export function defaultRanges(marker: Biomarker, unit: string, sex: Sex) {
  const { lab, fm } = rangesFor(marker, sex)
  const target = normalizeUnit(unit || marker.unit)
  if (!unit.trim() || target === normalizeUnit(marker.unit)) return { lab: formatRange(lab), fm: formatRange(fm), converted: false }
  const factor = conversion(marker.id, target)
  if (!factor) return null
  const scale = (pair: Pair): Pair => [pair[0] === null ? null : round(pair[0] * factor), pair[1] === null ? null : round(pair[1] * factor)]
  return { lab: formatRange(scale(lab)), fm: formatRange(scale(fm)), converted: true }
}

/** A result in its marker's catalogue unit, converting where a factor is known. */
export function canonicalValue(entry: { markerId: string | null; value: string; unit: string }): number | null {
  const marker = markerById(entry.markerId)
  const value = parseValue(entry.value)
  if (!marker || value === null) return null
  const unit = normalizeUnit(entry.unit || marker.unit)
  if (unit === normalizeUnit(marker.unit)) return value
  const factor = conversion(marker.id, unit)
  return factor ? value / factor : null
}

function round(value: number) {
  if (value === 0) return 0
  const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(value))))
  return Number(value.toFixed(Math.min(digits, 3)))
}

// ---------------------------------------------------------------------------
// Ranges and classification

export type Range = { low: number | null; high: number | null }

export function formatRange(range: Pair | Range | null) {
  if (!range) return ''
  const [low, high] = Array.isArray(range) ? range : [range.low, range.high]
  if (low !== null && high !== null) return `${low}–${high}`
  if (high !== null) return `<${high}`
  if (low !== null) return `>${low}`
  return ''
}

const number = (text: string) => {
  const value = Number(text.replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

/** Reads "3.5–5.1", "3.5 - 5.1", "<30", "≤ 30", ">1.55", "up to 30". */
export function parseRange(text: string): Range | null {
  const value = (text || '').trim().replace(/[–—]/g, '-').replace(/\bto\b/gi, '-')
  if (!value) return null
  const between = value.match(/(-?\d[\d,]*\.?\d*)\s*-\s*(-?\d[\d,]*\.?\d*)/)
  if (between) {
    const low = number(between[1]), high = number(between[2])
    if (low !== null && high !== null) return low <= high ? { low, high } : { low: high, high: low }
  }
  const upper = value.match(/(?:<|≤|<=|up\s*-?\s*|below\s*|less than\s*)\s*(\d[\d,]*\.?\d*)/i)
  if (upper) return { low: null, high: number(upper[1]) }
  const lower = value.match(/(?:>|≥|>=|above\s*|greater than\s*)\s*(\d[\d,]*\.?\d*)/i)
  if (lower) return { low: number(lower[1]), high: null }
  return null
}

/** The number in a result as printed, ignoring "<", "H" and the like. */
export function parseValue(text: string): number | null {
  const match = (text || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

export type LabStatus = 'low' | 'normal' | 'high' | 'unknown'
export type FmStatus = 'low' | 'borderline' | 'normal' | 'optimal' | 'high' | 'unknown'

export function labStatus(value: number | null, range: Range | null): LabStatus {
  if (value === null || !range) return 'unknown'
  if (range.low !== null && value < range.low) return 'low'
  if (range.high !== null && value > range.high) return 'high'
  return 'normal'
}

/**
 * Inside the FM range a result is optimal near the middle, normal further
 * out, and borderline in the outer tenth. A range that starts at zero (or is
 * only an upper limit) is lower-is-better, so only the top end is borderline.
 */
export function fmStatus(value: number | null, range: Range | null): FmStatus {
  if (value === null || !range) return 'unknown'
  const { low, high } = range
  if (low !== null && value < low) return 'low'
  if (high !== null && value > high) return 'high'
  if (high !== null && (low === null || low === 0)) {
    const position = high === 0 ? 1 : value / high
    return position > 0.9 ? 'borderline' : position <= 0.6 ? 'optimal' : 'normal'
  }
  if (low !== null && high === null) return value < low * 1.1 ? 'borderline' : 'optimal'
  if (low === null || high === null || high === low) return 'normal'
  const position = (value - low) / (high - low)
  if (position < 0.12 || position > 0.88) return 'borderline'
  if (position >= 0.25 && position <= 0.75) return 'optimal'
  return 'normal'
}

// ---------------------------------------------------------------------------
// An analysis

export type FmEntry = {
  markerId: string | null
  name: string
  panel: PanelId
  value: string
  unit: string
  labRange: string
  fmRange: string
  note: string
  /** Worked out from other results rather than reported by the lab. */
  calculated?: boolean
}

export type Priority = 'urgent' | 'high' | 'moderate' | 'low'

/** A health improvement area's plan, as the clinician edited it. */
export type AreaPlan = { nutrition: string[]; lifestyle: string[]; supplements: string[]; tests: string[] }

export type FmNarrative = {
  summary: string
  findings: { priority: Priority; title: string; detail: string }[]
  panels: Partial<Record<PanelId, { summary: string; understanding: { title: string; text: string }[]; actions: string[] }>>
  recommendations: { priority: Priority; title: string; items: string[] }[]
  nextSteps: { title: string; text: string; items: string[] }[]
  /** Edits to the standard plan of a health improvement area, by area id. */
  areaPlans?: Record<string, AreaPlan>
}

export type FmPatient = {
  name: string
  age: string
  sex: Sex
  collectedAt: string
  labRef: string
  facility: string
  clinician: string
}

export const emptyNarrative = (): FmNarrative => ({ summary: '', findings: [], panels: {}, recommendations: [], nextSteps: [] })

export function createEntry(marker: Biomarker | null, sex: Sex, overrides: Partial<FmEntry> = {}): FmEntry {
  const unit = overrides.unit ?? marker?.unit ?? ''
  const ranges = marker ? defaultRanges(marker, unit, sex) : null
  return {
    markerId: marker?.id || null,
    name: marker?.name || '',
    panel: marker?.panel || 'other',
    value: '',
    unit,
    labRange: ranges?.lab || '',
    fmRange: ranges?.fm || '',
    note: '',
    ...overrides,
  }
}

export type AssessedEntry = FmEntry & {
  numeric: number | null
  lab: LabStatus
  fm: FmStatus
  labRangeParsed: Range | null
  fmRangeParsed: Range | null
  urgent: boolean
}

export function assessEntry(entry: FmEntry): AssessedEntry {
  const numeric = parseValue(entry.value)
  const labRangeParsed = parseRange(entry.labRange)
  const fmRangeParsed = parseRange(entry.fmRange) || labRangeParsed
  const lab = labStatus(numeric, labRangeParsed)
  const fm = fmStatus(numeric, fmRangeParsed)
  const marker = markerById(entry.markerId)
  let urgent = false
  // A calculated ratio is only as urgent as the results it comes from.
  if (numeric !== null && !entry.calculated) {
    // Critical cut-offs are in the catalogue unit, so only apply them there.
    const sameUnit = marker && normalizeUnit(entry.unit || marker.unit) === normalizeUnit(marker.unit)
    if (marker?.critical && sameUnit) {
      if (marker.critical.low !== undefined && numeric < marker.critical.low) urgent = true
      if (marker.critical.high !== undefined && numeric > marker.critical.high) urgent = true
    }
    // Far outside the laboratory's own range: more than a third beyond a limit.
    // Only when the FM range agrees it is out, so a protective high (HDL) is not flagged.
    const fmOut = fm === 'high' || fm === 'low'
    if (fmOut && labRangeParsed && lab === 'high' && labRangeParsed.high !== null && labRangeParsed.high > 0 && numeric > labRangeParsed.high * 1.33) urgent = true
    if (fmOut && labRangeParsed && lab === 'low' && labRangeParsed.low !== null && labRangeParsed.low > 0 && numeric < labRangeParsed.low * 0.67) urgent = true
  }
  return { ...entry, numeric, lab, fm, labRangeParsed, fmRangeParsed, urgent }
}

export type PanelSummary = {
  panel: Panel
  entries: AssessedEntry[]
  score: number | null
  counts: Record<FmStatus, number>
}

const emptyCounts = (): Record<FmStatus, number> => ({ low: 0, borderline: 0, normal: 0, optimal: 0, high: 0, unknown: 0 })

/** Share of a panel's markers in the FM range, borderline counting half, to the nearest 5%. */
export function panelScore(entries: AssessedEntry[]) {
  const scored = entries.filter(entry => entry.fm !== 'unknown')
  if (!scored.length) return null
  const points = scored.reduce((sum, entry) => sum + (entry.fm === 'optimal' || entry.fm === 'normal' ? 1 : entry.fm === 'borderline' ? 0.5 : 0), 0)
  return Math.round((points / scored.length) * 20) * 5
}

export function summarize(entries: FmEntry[]) {
  const assessed = entries.filter(entry => entry.value.trim()).map(assessEntry)
  const panels: PanelSummary[] = FM_PANELS.map(panel => {
    const members = assessed.filter(entry => entry.panel === panel.id || (markerById(entry.markerId)?.alsoIn || []).includes(panel.id))
    const counts = emptyCounts()
    members.forEach(entry => { counts[entry.fm] += 1 })
    return { panel, entries: members, score: panelScore(members), counts }
  }).filter(summary => summary.entries.length)
  const totals = emptyCounts()
  assessed.forEach(entry => { totals[entry.fm] += 1 })
  return {
    assessed,
    panels,
    total: assessed.length,
    inRange: totals.optimal + totals.normal + totals.borderline,
    high: totals.high,
    low: totals.low,
    urgent: assessed.filter(entry => entry.urgent),
  }
}

export const FM_STATUS_LABEL: Record<FmStatus, string> = { low: 'LOW ↓', borderline: 'BORDERLINE ~', normal: 'NORMAL ✓', optimal: 'OPTIMAL ✓', high: 'HIGH ↑', unknown: '—' }
export const LAB_STATUS_LABEL: Record<LabStatus, string> = { low: 'LOW ↓', normal: 'NORMAL ✓', high: 'HIGH ↑', unknown: '—' }
export const STATUS_COLOR: Record<FmStatus | LabStatus, string> = { low: '#1D64C8', borderline: '#C8730F', normal: '#1A6B53', optimal: '#0E9F6E', high: '#C53030', unknown: '#6B7C74' }
export const PRIORITY_COLOR: Record<Priority, string> = { urgent: '#B5102B', high: '#C53030', moderate: '#C8730F', low: '#2D8A6A' }

/** How far a result sits outside a range, as a percentage of the limit it crossed. */
export function deviation(value: number | null, range: Range | null) {
  if (value === null || !range) return 0
  if (range.low !== null && value < range.low && range.low !== 0) return ((range.low - value) / Math.abs(range.low)) * 100
  if (range.high !== null && value > range.high) return range.high === 0 ? 100 : ((value - range.high) / Math.abs(range.high)) * 100
  return 0
}
