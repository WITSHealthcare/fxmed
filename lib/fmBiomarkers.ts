// Functional Health Analysis lab report: the biomarker catalogue, and how a result
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
  /** Action values, in the catalogue unit: a result past one needs prompt medical review. */
  critical?: { low?: number; high?: number }
  /**
   * The optimal range is the laboratory's own: for assays whose cut-offs
   * differ between manufacturers (thyroid antibodies), where a fixed FM range
   * would flag a result the lab calls negative.
   */
  fmFromLab?: boolean
  /** Also shown on these panels' pages, as in the template (e.g. B12, hs-CRP). */
  alsoIn?: PanelId[]
  /**
   * Labs often report it in words ("Positive", "Not detected") rather than a
   * number. A worded result is read as negative, equivocal or positive; a
   * numeric index is read against the lab's range like any other result.
   */
  qualitative?: boolean
}

const m = (id: string, name: string, panel: PanelId, unit: string, lab: Pair, fm: Pair, extra: Partial<Biomarker> = {}): Biomarker =>
  ({ id, name, panel, unit, lab, fm, ...extra })

export const FM_BIOMARKERS: Biomarker[] = [
  // Cardio-metabolic
  m('total_cholesterol', 'Total Cholesterol', 'cardio', 'mmol/L', [3, 5.2], [3.6, 5.2], { aliases: ['cholesterol', 'chol', 'tc'] }),
  m('ldl', 'LDL Cholesterol', 'cardio', 'mmol/L', [0, 3.4], [0, 2.6], { aliases: ['ldl', 'ldl-c', 'low density lipoprotein'], critical: { high: 4.9 } }),
  m('hdl', 'HDL Cholesterol', 'cardio', 'mmol/L', [1, null], [1.2, 2.3], { aliases: ['hdl', 'hdl-c', 'high density lipoprotein'], female: { lab: [1.2, null], fm: [1.3, 2.5] } }),
  m('triglycerides', 'Triglycerides', 'cardio', 'mmol/L', [0, 1.7], [0.5, 1.1], { aliases: ['tg', 'trigs', 'triglyceride'], critical: { high: 5.6 } }),
  m('lpa', 'Lipoprotein (a)', 'cardio', 'mg/dL', [0, 30], [0, 30], { aliases: ['lp(a)', 'lpa', 'lipoprotein a'] }),
  m('apoa1', 'Apolipoprotein A1', 'cardio', 'g/L', [1.2, 2.4], [1.4, 2.2], { aliases: ['apo a1', 'apoa1', 'apo a-1'] }),
  m('apob', 'Apolipoprotein B', 'cardio', 'g/L', [0, 1.2], [0, 0.9], { aliases: ['apo b', 'apob'] }),
  m('non_hdl', 'Non-HDL Cholesterol', 'cardio', 'mmol/L', [0, 4.1], [0, 3.4], { aliases: ['non hdl', 'non-hdl-c'] }),
  m('chol_hdl_ratio', 'Chol./HDL Ratio', 'cardio', 'ratio', [0, 5], [0, 4], { aliases: ['cholesterol/hdl ratio', 'tc/hdl', 'chol/hdl'] }),
  m('tg_hdl_ratio', 'Triglyceride/HDL Ratio', 'cardio', 'ratio', [0, 1.7], [0, 0.9], { aliases: ['tg/hdl', 'triglyceride/hdl ratio', 'tg:hdl'] }),
  m('omega3_index', 'Omega-3 Index', 'cardio', '%', [4, 12], [8, 12], { aliases: ['omega 3 index', 'omega-3 index (rbc)', 'o3i', 'rbc omega-3'] }),
  // Glucose
  m('fasting_glucose', 'Fasting Glucose', 'glucose', 'mmol/L', [3.9, 6], [4.4, 5.5], { aliases: ['glucose', 'fbs', 'fbg', 'fasting blood sugar', 'fasting blood glucose', 'fasting plasma glucose'], critical: { low: 3, high: 11.1 } }),
  m('hba1c', 'HbA1c', 'glucose', '%', [4, 5.6], [4, 5.4], { aliases: ['hba1c (ngsp)', 'glycated haemoglobin', 'glycated hemoglobin', 'a1c'], critical: { high: 9 } }),
  m('hba1c_ifcc', 'HbA1c (IFCC)', 'glucose', 'mmol/mol', [20, 38], [20, 36], { aliases: ['hba1c ifcc'] }),
  m('fasting_insulin', 'Fasting Insulin', 'glucose', 'µIU/mL', [2.6, 24.9], [2.6, 8], { aliases: ['insulin', 'insulin fasting'] }),
  m('c_peptide', 'C-Peptide', 'glucose', 'pmol/L', [298, 1324], [298, 900], { aliases: ['c peptide'] }),
  m('homa_ir', 'HOMA-IR', 'glucose', 'index', [0, 2.5], [0, 1.5], { aliases: ['homa ir', 'homa'] }),
  m('glucose_insulin_ratio', 'Glucose/Insulin Ratio', 'glucose', 'ratio', [4.5, null], [4.5, null], { aliases: ['glucose/insulin'] }),
  m('quicki', 'QUICKI Index', 'glucose', 'index', [0.33, 0.45], [0.35, 0.45], { aliases: ['quicki'] }),
  // Thyroid
  m('tsh', 'TSH', 'thyroid', 'µIU/mL', [0.4, 4], [1, 2.5], { aliases: ['thyroid stimulating hormone', 'thyrotropin'], critical: { low: 0.1, high: 10 } }),
  m('free_t3', 'Free T3', 'thyroid', 'pmol/L', [3.5, 6.5], [4.6, 6.2], { aliases: ['ft3', 'free triiodothyronine'] }),
  m('free_t4', 'Free T4', 'thyroid', 'pmol/L', [10, 23], [13, 20], { aliases: ['ft4', 'free thyroxine'] }),
  m('reverse_t3', 'Reverse T3', 'thyroid', 'ng/mL', [0.09, 0.35], [0.09, 0.2], { aliases: ['rt3', 'reverse triiodothyronine'] }),
  m('anti_tpo', 'Anti-TPO Ab', 'thyroid', 'IU/mL', [0, 34], [0, 34], { aliases: ['tpo', 'tpo antibodies', 'anti-thyroid peroxidase', 'thyroid peroxidase antibodies', 'thyroid peroxidase antibody'], fmFromLab: true }),
  m('anti_tg', 'Anti-TG Ab', 'thyroid', 'IU/mL', [0, 40], [0, 40], { aliases: ['tg antibodies', 'anti-thyroglobulin', 'thyroglobulin antibodies', 'thyroglobulin antibody'], fmFromLab: true }),
  m('thyroglobulin', 'Thyroglobulin', 'thyroid', 'ng/mL', [3.5, 77], [3.5, 77], { aliases: ['thyroglobulin (tg)', 'serum thyroglobulin', 'tg (thyroglobulin)'], fmFromLab: true }),
  // Adrenal & hormones
  m('dhea_s', 'DHEA-S', 'adrenal', 'µmol/L', [2.68, 9.23], [3.5, 9.2], { aliases: ['dheas', 'dhea sulphate', 'dhea sulfate'], male: { lab: [4.3, 12.2], fm: [6, 12] } }),
  m('cortisol_am', 'Cortisol AM', 'adrenal', 'µg/dL', [6.2, 19.4], [10, 15], { aliases: ['cortisol', 'morning cortisol', 'cortisol (am)', 'cortisol 8am'], critical: { low: 3 } }),
  m('cortisol_pm', 'Cortisol PM', 'adrenal', 'µg/dL', [2.3, 11.9], [3, 8], { aliases: ['evening cortisol', 'cortisol (pm)'] }),
  m('testosterone', 'Testosterone', 'adrenal', 'nmol/L', [0.5, 2.6], [0.7, 2], { aliases: ['total testosterone'], male: { lab: [8.6, 29], fm: [15, 28] } }),
  m('shbg', 'SHBG', 'adrenal', 'nmol/L', [18, 114], [18, 80], { aliases: ['sex hormone binding globulin'], male: { lab: [18, 54], fm: [20, 50] } }),
  m('free_testosterone', 'Free Testosterone', 'adrenal', 'pmol/L', [0, 26], [5, 18], { male: { lab: [174, 729], fm: [350, 700] } }),
  m('free_testosterone_index', 'Free Testosterone Index', 'adrenal', 'ratio', [0.5, 5], [1, 3.5], { aliases: ['fai', 'free androgen index'], male: { lab: [35, 92], fm: [50, 90] } }),
  m('estradiol', 'Estradiol (E2)', 'adrenal', 'pmol/L', [45, 1460], [45, 1460], { aliases: ['oestradiol', 'e2', 'estradiol'], male: { lab: [40, 160], fm: [70, 150] } }),
  m('progesterone', 'Progesterone', 'adrenal', 'nmol/L', [0.2, 90], [0.2, 90], { aliases: ['serum progesterone'], male: { lab: [0.2, 1.3], fm: [0.3, 1.3] } }),
  m('fsh', 'FSH', 'adrenal', 'IU/L', [3.5, 12.5], [3.5, 12.5], { aliases: ['follicle stimulating hormone', 'follicle-stimulating hormone', 'serum fsh'], male: { lab: [1.5, 12.4], fm: [1.5, 12.4] }, fmFromLab: true }),
  m('lh', 'LH', 'adrenal', 'IU/L', [2.4, 12.6], [2.4, 12.6], { aliases: ['luteinizing hormone', 'luteinising hormone', 'serum lh'], male: { lab: [1.7, 8.6], fm: [1.7, 8.6] }, fmFromLab: true }),
  m('prolactin', 'Prolactin', 'adrenal', 'ng/mL', [4.8, 23.3], [4.8, 20], { aliases: ['prl', 'serum prolactin'], male: { lab: [4, 15.2], fm: [4, 12] }, critical: { high: 100 } }),
  m('amh', 'AMH', 'adrenal', 'ng/mL', [1, 10], [1, 10], { aliases: ['anti-mullerian hormone', 'anti-müllerian hormone', 'mullerian inhibiting substance'], fmFromLab: true }),
  m('igf1', 'IGF-1', 'adrenal', 'ng/mL', [80, 300], [80, 300], { aliases: ['igf 1', 'igf-i', 'insulin-like growth factor 1', 'somatomedin c'], fmFromLab: true }),
  // Kidney
  m('creatinine', 'Creatinine', 'kidney', 'µmol/L', [44, 80], [50, 80], { aliases: ['serum creatinine', 'creat'], male: { lab: [62, 106], fm: [65, 100] } }),
  m('egfr', 'eGFR', 'kidney', 'mL/min/1.73 m²', [60, null], [90, null], { aliases: ['gfr', 'estimated gfr'], critical: { low: 30 } }),
  m('urea', 'Urea', 'kidney', 'mmol/L', [2.5, 7.8], [3, 6.5], { aliases: ['blood urea', 'serum urea'] }),
  m('bun', 'BUN', 'kidney', 'mg/dL', [7, 20], [10, 16], { aliases: ['bun', 'blood urea nitrogen', 'urea nitrogen'] }),
  m('uric_acid', 'Uric Acid', 'kidney', 'mmol/L', [0.15, 0.36], [0.18, 0.3], { aliases: ['urate'], male: { lab: [0.2, 0.43], fm: [0.21, 0.33] }, critical: { high: 0.6 } }),
  m('protein_creatinine', 'Protein/Creatinine Ratio', 'kidney', 'g/g', [0, 0.2], [0, 0.15], { aliases: ['protein/creatinine', 'upcr', 'urine protein creatinine ratio'] }),
  m('cystatin_c', 'Cystatin C', 'kidney', 'mg/L', [0.6, 1], [0.6, 0.9], { aliases: ['cystatin c', 'serum cystatin c', 'cys c'] }),
  m('amylase', 'Amylase', 'kidney', 'IU/L', [30, 110], [30, 100], { aliases: ['serum amylase'] }),
  m('u_creatinine', 'U-Creatinine', 'kidney', 'g/L', [0.15, 1.5], [0.3, 1.2], { aliases: ['urine creatinine'] }),
  m('u_protein', 'U-Protein', 'kidney', 'g/L', [0, 0.15], [0, 0.08], { aliases: ['urine protein'] }),
  // Liver
  m('alt', 'ALT (SGPT)', 'liver', 'IU/L', [7, 55], [7, 35], { aliases: ['alt', 'sgpt', 'alanine aminotransferase'], critical: { high: 200 } }),
  m('ast', 'AST (SGOT)', 'liver', 'IU/L', [10, 40], [10, 26], { aliases: ['ast', 'sgot', 'aspartate aminotransferase'], critical: { high: 200 } }),
  m('ggt', 'GGT', 'liver', 'IU/L', [0, 55], [0, 30], { aliases: ['gamma gt', 'gamma-glutamyl transferase'], female: { lab: [0, 38] } }),
  m('alp', 'Alk. Phosphatase', 'liver', 'IU/L', [30, 120], [40, 100], { aliases: ['alp', 'alkaline phosphatase'] }),
  m('bilirubin_total', 'Bilirubin (Total)', 'liver', 'µmol/L', [3, 21], [5, 17], { aliases: ['total bilirubin', 't. bilirubin', 'tbil'], critical: { high: 50 } }),
  m('bilirubin_conj', 'Bilirubin (Conj.)', 'liver', 'µmol/L', [0, 5], [0, 4], { aliases: ['direct bilirubin', 'conjugated bilirubin', 'd. bilirubin', 'dbil'] }),
  m('albumin', 'Albumin', 'liver', 'g/L', [35, 50], [40, 50], { aliases: ['serum albumin', 'alb'], critical: { low: 25 } }),
  m('total_protein', 'Total Protein', 'liver', 'g/L', [60, 80], [65, 80], { aliases: ['serum protein', 'tp'] }),
  m('globulin', 'Globulin', 'liver', 'g/L', [20, 35], [24, 30], { aliases: ['total globulin', 'serum globulin'] }),
  m('ast_alt_ratio', 'AST/ALT Ratio', 'liver', 'ratio', [0, 2], [0.6, 1.2], { aliases: ['ast/alt', 'de ritis ratio', 'ast:alt'] }),
  m('ldh', 'LDH', 'liver', 'IU/L', [120, 246], [140, 200], { aliases: ['lactate dehydrogenase', 'ld'] }),
  m('a1at', 'Alpha-1 Antitrypsin', 'liver', 'mg/dL', [90, 200], [100, 180], { aliases: ['a1at', 'alpha 1 antitrypsin'] }),
  // Methylation
  m('b12', 'Vitamin B12', 'methylation', 'pmol/L', [133, 675], [370, 1000], { aliases: ['b12', 'cobalamin', 'cyanocobalamin'], alsoIn: ['vitamins'], critical: { low: 110 } }),
  m('folate', 'Folate (Serum)', 'methylation', 'nmol/L', [7, 46], [15, null], { aliases: ['folate', 'folic acid', 'serum folate'] }),
  m('homocysteine', 'Homocysteine', 'methylation', 'µmol/L', [0, 15], [0, 10], { aliases: ['hcy', 'plasma homocysteine'], alsoIn: ['inflammation'], critical: { high: 30 } }),
  m('mma', 'Methylmalonic Acid', 'methylation', 'nmol/L', [0, 400], [0, 300], { aliases: ['mma', 'methylmalonic acid (mma)', 'serum methylmalonic acid'], alsoIn: ['vitamins'] }),
  // Hematology
  m('rbc', 'RBC Count', 'hematology', '×10¹²/L', [3.8, 5.8], [4, 5], { aliases: ['rbc', 'red blood cell count', 'red cell count', 'erythrocytes'], male: { lab: [4.5, 5.9], fm: [4.4, 5.4] } }),
  m('hemoglobin', 'Hemoglobin', 'hematology', 'g/dL', [11.5, 16.5], [12, 14.5], { aliases: ['haemoglobin', 'hb', 'hgb'], male: { lab: [13, 17.5], fm: [14, 16] }, critical: { low: 8 } }),
  m('hematocrit', 'Hematocrit', 'hematology', '%', [36, 47], [37, 44], { aliases: ['haematocrit', 'hct', 'pcv', 'packed cell volume'], male: { lab: [40, 52], fm: [42, 48] } }),
  m('mcv', 'MCV', 'hematology', 'fL', [76, 99], [82, 92], { aliases: ['mean corpuscular volume', 'mean cell volume'] }),
  m('mch', 'MCH', 'hematology', 'pg', [26, 34], [27, 32], { aliases: ['mean corpuscular haemoglobin', 'mean corpuscular hemoglobin'] }),
  m('mchc', 'MCHC', 'hematology', 'g/dL', [30, 37], [32, 36], { aliases: ['mean corpuscular haemoglobin concentration', 'mean corpuscular hemoglobin concentration'] }),
  m('rdw', 'RDW', 'hematology', '%', [10, 14.5], [10.5, 13.5], { aliases: ['red cell distribution width', 'rdw-cv'] }),
  m('platelets', 'Platelets', 'hematology', '×10⁹/L', [150, 450], [175, 350], { aliases: ['platelet count', 'plt'], critical: { low: 50, high: 1000 } }),
  m('wbc', 'WBC Count', 'hematology', '×10⁹/L', [3, 10.5], [3.5, 7.5], { aliases: ['wbc', 'white blood cell count', 'white cell count', 'leucocytes', 'leukocytes', 'total wbc'], critical: { low: 2, high: 25 } }),
  m('neutrophils', 'Neutrophils', 'hematology', '×10⁹/L', [1, 7], [1.4, 4.5], { aliases: ['neutrophil count', 'absolute neutrophils', 'neutrophils absolute', 'neut', 'anc'], critical: { low: 0.5 } }),
  m('lymphocytes', 'Lymphocytes', 'hematology', '×10⁹/L', [1, 4], [1.5, 3.1], { aliases: ['lymphocyte count', 'absolute lymphocytes', 'lymphocytes absolute', 'lymph'] }),
  m('monocytes', 'Monocytes', 'hematology', '×10⁹/L', [0.2, 1], [0.2, 0.6], { aliases: ['monocyte count', 'absolute monocytes', 'monocytes absolute', 'mono'] }),
  m('eosinophils', 'Eosinophils', 'hematology', '×10⁹/L', [0, 0.5], [0, 0.3], { aliases: ['eosinophil count', 'absolute eosinophils', 'eosinophils absolute', 'eos'] }),
  m('basophils', 'Basophils', 'hematology', '×10⁹/L', [0, 0.1], [0, 0.1], { aliases: ['basophil count', 'absolute basophils', 'basophils absolute', 'baso'] }),
  m('nlr', 'Neutrophil/Lymphocyte Ratio', 'hematology', 'ratio', [0.7, 3.5], [0.7, 2.5], { aliases: ['nlr', 'neutrophil:lymphocyte', 'neutrophil/lymphocyte'] }),
  m('esr', 'ESR (Westergren)', 'hematology', 'mm/hr', [0, 20], [0, 15], { aliases: ['esr', 'erythrocyte sedimentation rate'], male: { lab: [0, 15], fm: [0, 10] } }),
  // Electrolytes & minerals
  m('sodium', 'Sodium', 'electrolytes', 'mmol/L', [136, 145], [137, 143], { aliases: ['na', 'na+', 'serum sodium'], critical: { low: 125, high: 155 } }),
  m('potassium', 'Potassium', 'electrolytes', 'mmol/L', [3.5, 5.1], [4, 4.8], { aliases: ['k', 'k+', 'serum potassium'], critical: { low: 3, high: 6 } }),
  m('chloride', 'Chloride', 'electrolytes', 'mmol/L', [98, 107], [100, 106], { aliases: ['cl', 'cl-'] }),
  m('bicarbonate', 'Bicarbonate', 'electrolytes', 'mmol/L', [22, 29], [24, 28], { aliases: ['hco3', 'co2', 'total co2', 'bicarb'] }),
  m('anion_gap', 'Anion Gap', 'electrolytes', 'mmol/L', [7, 16], [6, 14], { aliases: ['ag'] }),
  m('calcium', 'Calcium', 'electrolytes', 'mmol/L', [2.15, 2.55], [2.25, 2.45], { aliases: ['ca', 'serum calcium', 'total calcium'], critical: { low: 1.9, high: 2.9 } }),
  m('ca_phos_ratio', 'Ca/Phos. Ratio', 'electrolytes', 'ratio', [1.5, 2.5], [1.8, 2.5], { aliases: ['calcium/phosphate ratio'] }),
  m('na_k_ratio', 'Na/K Ratio', 'electrolytes', 'ratio', [27, 40], [30, 40], { aliases: ['sodium/potassium ratio'] }),
  m('rbc_magnesium', 'RBC Magnesium', 'electrolytes', 'mmol/L', [1.65, 2.65], [1.8, 2.5], { aliases: ['rbc mg', 'red cell magnesium'] }),
  m('magnesium', 'Magnesium (Serum)', 'electrolytes', 'mmol/L', [0.66, 1.07], [0.8, 1], { aliases: ['magnesium', 'mg', 'serum magnesium'], critical: { low: 0.5 } }),
  m('phosphate', 'Phosphate', 'electrolytes', 'mmol/L', [0.74, 1.52], [0.9, 1.3], { aliases: ['s-phosphate inorg.', 'phosphorus', 'inorganic phosphate', 'serum phosphate'] }),
  // Vitamins & micronutrients
  m('vitamin_d', 'Vitamin D (25-OH)', 'vitamins', 'ng/mL', [30, 100], [40, 80], { aliases: ['vitamin d', '25-oh vitamin d', '25(oh)d', '25-hydroxy vitamin d', 'vit d'], critical: { low: 10 } }),
  m('serum_iron', 'Serum Iron', 'vitamins', 'µmol/L', [9, 30.4], [12, 25], { aliases: ['iron', 'fe'] }),
  m('transferrin', 'Transferrin', 'vitamins', 'µmol/L', [24, 45], [26, 42]),
  m('tibc', 'TIBC', 'vitamins', 'µmol/L', [45, 72], [50, 65], { aliases: ['total iron binding capacity'] }),
  m('tsat', 'Transferrin Saturation', 'vitamins', '%', [20, 50], [25, 45], { aliases: ['tsat', 'iron saturation'], critical: { high: 60 } }),
  m('stfr', 'Soluble Transferrin Receptor', 'vitamins', 'mg/L', [0.76, 1.76], [0.76, 1.76], { aliases: ['stfr', 'soluble transferrin receptor (stfr)', 'transferrin receptor, soluble', 'serum transferrin receptor'], fmFromLab: true }),
  m('ferritin', 'Ferritin', 'vitamins', 'ng/mL', [20, 300], [50, 200], { aliases: ['serum ferritin'], female: { lab: [13, 150], fm: [50, 120] }, critical: { high: 1000 } }),
  m('zinc', 'Serum Zinc', 'vitamins', 'µmol/L', [10.7, 18.4], [14, 18], { aliases: ['zinc', 'zn'] }),
  m('copper', 'Serum Copper', 'vitamins', 'µg/dL', [70, 140], [80, 125], { aliases: ['copper', 'cu'], female: { lab: [80, 155], fm: [85, 135] } }),
  m('selenium', 'Serum Selenium', 'vitamins', 'µg/L', [70, 150], [100, 150], { aliases: ['selenium', 'se', 'selenium (serum)'] }),
  // Inflammation & bone
  m('hs_crp', 'hs-CRP', 'inflammation', 'mg/L', [0, 3], [0, 1], { aliases: ['crp', 'high sensitivity crp', 'high-sensitivity crp', 'c-reactive protein', 'hscrp'], alsoIn: ['methylation'], critical: { high: 10 } }),
  m('pth', 'PTH', 'inflammation', 'pg/mL', [15, 65], [15, 45], { aliases: ['parathyroid hormone', 'intact pth'] }),
  m('ck', 'Creatine Kinase', 'inflammation', 'IU/L', [26, 140], [26, 90], { aliases: ['ck', 'cpk', 'creatine phosphokinase'] }),
  m('fibrinogen', 'Fibrinogen', 'inflammation', 'g/L', [2, 4], [2, 3.5], { aliases: ['plasma fibrinogen', 'fibrinogen level'], alsoIn: ['cardio'], critical: { low: 1 } }),
  m('il6', 'IL-6', 'inflammation', 'pg/mL', [0, 7], [0, 3], { aliases: ['interleukin 6', 'interleukin-6', 'il 6', 'il-6 (interleukin 6)'] }),
  // Additional
  m('psa', 'PSA (Total)', 'other', 'ng/mL', [0, 4], [0, 4], { aliases: ['psa', 'total psa', 'prostate specific antigen', 'prostate-specific antigen'], critical: { high: 10 } }),
  m('h_pylori', 'H. pylori', 'other', 'index', [0, 0.9], [0, 0.9], { aliases: ['helicobacter pylori', 'h. pylori antibody', 'h. pylori igg', 'h pylori antibodies', 'h. pylori stool antigen', 'h pylori antigen', 'helicobacter pylori antigen', 'helicobacter pylori igg'], fmFromLab: true, qualitative: true }),
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
  urea: { 'mg/dl': 6.006 },
  bun: { 'mmol/l': 0.357 },
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
  serum_iron: { 'µg/dl': 5.585 }, tibc: { 'µg/dl': 5.585 }, transferrin: { 'g/l': 0.0795, 'mg/dl': 7.95 },
  zinc: { 'µg/dl': 6.54 },
  vitamin_d: { 'nmol/l': 2.496 },
  hs_crp: { 'mg/dl': 0.1 },
  fasting_insulin: { 'pmol/l': 6.945 },
  c_peptide: { 'ng/ml': 1 / 331 },
  tsh: { 'miu/l': 1 },
  mma: { 'µmol/l': 0.001 },
  selenium: { 'µmol/l': 0.01266, 'ng/ml': 1 },
  copper: { 'µmol/l': 0.1574 },
  fibrinogen: { 'mg/dl': 100 },
  prolactin: { 'miu/l': 21.2, 'µg/l': 1 },
  amh: { 'pmol/l': 7.14 },
  igf1: { 'nmol/l': 0.131 },
  thyroglobulin: { 'µg/l': 1 },
  psa: { 'µg/l': 1 },
}

/** Other units a marker is commonly reported in, with the factor from the catalogue unit. */
export const alternateUnits = (markerId: string) => Object.entries(CONVERSIONS[markerId] || {}).map(([unit, factor]) => ({ unit, factor }))

/** The factor from a marker's catalogue unit to `unit`, already normalised. */
function conversion(markerId: string, unit: string) {
  const match = Object.entries(CONVERSIONS[markerId] || {}).find(([key]) => normalizeUnit(key) === unit)
  return match?.[1]
}

export type Sex = 'female' | 'male' | ''

// ---------------------------------------------------------------------------
// Children
//
// The catalogue's ranges are adult ones, and the FM optimal ranges come from
// adult practice. For a patient under 18 no FM optimal range is applied: the
// result is read against an age-appropriate reference range, which is the
// lab's printed range where there is one, or the defaults below.

/** Patients younger than this are read against paediatric ranges. */
export const ADULT_AGE = 18
/** Below this, reference ranges change too fast for a default (newborn and early infancy). */
const YOUNGEST_DEFAULT_AGE = 0.5

/** The age in years from what was typed: "4", "4y 5m", "4 years", "18 months", "6 weeks". */
export function ageInYears(text: string | null | undefined): number | null {
  const value = (text || '').trim().toLowerCase()
  if (!value) return null
  const unit = (pattern: RegExp) => { const match = value.match(pattern); return match ? Number(match[1]) : null }
  const years = unit(/(\d+(?:\.\d+)?)\s*(?:y\b|yr|year)/)
  const months = unit(/(\d+(?:\.\d+)?)\s*(?:m\b|mo|month)/)
  const weeks = unit(/(\d+(?:\.\d+)?)\s*(?:w\b|wk|week)/)
  if (years !== null || months !== null || weeks !== null) return (years || 0) + (months || 0) / 12 + (weeks || 0) / 52
  const plain = Number(value)
  return Number.isFinite(plain) && plain >= 0 ? plain : null
}

export const isChild = (age: number | null | undefined): age is number => typeof age === 'number' && age < ADULT_AGE

type AgeBand = { to: number; lab?: Pair; male?: Pair; female?: Pair }
const band = (to: number, lab: Pair | null, sexes: { male?: Pair; female?: Pair } = {}): AgeBand => ({ to, ...(lab ? { lab } : {}), ...sexes })

/**
 * Paediatric reference ranges in the catalogue unit, by age band (each band
 * runs from the previous one's end to `to` years). Blood counts from Nathan &
 * Oski / the Harriet Lane Handbook; alkaline phosphatase from CALIPER.
 */
const PAEDIATRIC: Record<string, AgeBand[]> = {
  hemoglobin: [band(2, [10.5, 13.5]), band(6, [11.5, 13.5]), band(12, [11.5, 15.5]), band(18, null, { male: [13, 16], female: [12, 16] })],
  hematocrit: [band(2, [33, 39]), band(6, [34, 40]), band(12, [35, 45]), band(18, null, { male: [37, 49], female: [36, 46] })],
  mcv: [band(2, [70, 86]), band(6, [75, 87]), band(12, [77, 95]), band(18, null, { male: [78, 98], female: [78, 102] })],
  mch: [band(2, [23, 31]), band(6, [24, 30]), band(12, [25, 33]), band(18, [25, 35])],
  rbc: [band(2, [3.7, 5.3]), band(6, [3.9, 5.3]), band(12, [4, 5.2]), band(18, null, { male: [4.5, 5.3], female: [4.1, 5.1] })],
  wbc: [band(2, [6, 17.5]), band(6, [5.5, 15.5]), band(12, [4.5, 13.5]), band(18, [4.5, 13])],
  neutrophils: [band(2, [1.5, 8.5]), band(6, [1.5, 8.5]), band(12, [1.5, 8]), band(18, [1.8, 8])],
  lymphocytes: [band(2, [4, 10.5]), band(6, [2, 8]), band(12, [1.5, 6.8]), band(18, [1.2, 5.2])],
  alp: [
    band(1, [134, 518]), band(10, [156, 369]), band(13, [141, 460]),
    band(15, null, { male: [127, 517], female: [62, 280] }), band(17, null, { male: [89, 365], female: [54, 128] }), band(18, null, { male: [59, 164], female: [48, 95] }),
  ],
  calcium: [band(18, [2.2, 2.7])],
}

/** Markers whose adult reference range also holds through childhood. */
const ADULT_RANGE_IN_CHILDHOOD = new Set([
  'sodium', 'potassium', 'chloride', 'bicarbonate', 'magnesium', 'b12', 'folate', 'vitamin_d', 'zinc', 'hs_crp',
  'bilirubin_total', 'bilirubin_conj', 'alt', 'ggt', 'albumin', 'platelets', 'eosinophils', 'basophils', 'monocytes',
  'mchc', 'rdw', 'fasting_glucose', 'hba1c', 'anion_gap',
])

/** A child's reference range for a marker; null where the lab's printed range must be used. */
function paediatricLab(marker: Biomarker, sex: Sex, age: number): Pair | null {
  if (age < YOUNGEST_DEFAULT_AGE) return null
  const bands = PAEDIATRIC[marker.id]
  if (bands) {
    const found = bands.find(item => age < item.to)
    if (!found) return null
    const bySex = sex === 'male' ? found.male : sex === 'female' ? found.female : undefined
    return bySex || found.lab || null
  }
  return ADULT_RANGE_IN_CHILDHOOD.has(marker.id) ? marker.lab : null
}

/** Whether a marker's adult catalogue range would mislead for a child. */
const ageSensitive = (marker: Biomarker) => !ADULT_RANGE_IN_CHILDHOOD.has(marker.id)

/** Lab and FM ranges for a marker, for a sex and age, in the catalogue unit. */
function rangesFor(marker: Biomarker, sex: Sex, age?: number | null): { lab: Pair | null; fm: Pair | null } {
  if (isChild(age)) return { lab: paediatricLab(marker, sex, age), fm: null }
  const override = sex === 'male' ? marker.male : sex === 'female' ? marker.female : undefined
  return { lab: override?.lab || marker.lab, fm: override?.fm || marker.fm }
}

/**
 * The default ranges for a marker reported in `unit`. When the lab's unit
 * differs and no conversion is known, nothing is returned: comparing against a
 * range in another unit would misclassify the result. For a child, the FM range
 * is empty and the lab range is the paediatric default, or empty where the
 * lab's printed range is needed.
 */
export function defaultRanges(marker: Biomarker, unit: string, sex: Sex, age?: number | null) {
  const { lab, fm } = rangesFor(marker, sex, age)
  const target = normalizeUnit(unit || marker.unit)
  // An empty FM range means the lab's range is used for both.
  const fmText = (pair: Pair | null) => marker.fmFromLab ? '' : formatRange(pair)
  if (!unit.trim() || target === normalizeUnit(marker.unit)) return { lab: formatRange(lab), fm: fmText(fm), converted: false }
  const factor = conversion(marker.id, target)
  if (!factor) return null
  const scale = (pair: Pair | null): Pair | null => pair && [pair[0] === null ? null : round(pair[0] * factor), pair[1] === null ? null : round(pair[1] * factor)]
  return { lab: formatRange(scale(lab)), fm: fmText(scale(fm)), converted: true }
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

export type TextResult = 'negative' | 'equivocal' | 'positive'

/** A worded result as printed ("Positive", "Non-reactive", "Not detected"), or null. */
export function textResult(text: string): TextResult | null {
  const value = (text || '').toLowerCase()
  if (/\b(non[- ]?reactive|not detected|undetected|negative|absent|nil)\b/.test(value)) return 'negative'
  if (/\b(equivocal|borderline|indeterminate|inconclusive)\b/.test(value)) return 'equivocal'
  if (/\b(positive|reactive|detected|present)\b/.test(value)) return 'positive'
  return null
}

/** Whether a result can go into the analysis: a number, or a worded result for a marker labs report that way. */
export function isUsableResult(marker: Biomarker | null, value: string) {
  return /\d/.test(value) || (!!marker?.qualitative && textResult(value) !== null)
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

/** A care plan focus area's plan, as the clinician edited it. */
export type AreaPlan = { nutrition: string[]; lifestyle: string[]; supplements: string[]; tests: string[] }

export type FmNarrative = {
  summary: string
  findings: { priority: Priority; title: string; detail: string }[]
  panels: Partial<Record<PanelId, { summary: string; understanding: { title: string; text: string }[]; actions: string[] }>>
  recommendations: { priority: Priority; title: string; items: string[] }[]
  nextSteps: { title: string; text: string; items: string[] }[]
  /** Edits to the standard plan of a care plan focus area, by area id. */
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

export function createEntry(marker: Biomarker | null, sex: Sex, overrides: Partial<FmEntry> = {}, age?: number | null): FmEntry {
  const unit = overrides.unit ?? marker?.unit ?? ''
  const ranges = marker ? defaultRanges(marker, unit, sex, age) : null
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

// Catalogue lab ranges that were wrong in earlier versions, in the catalogue
// unit. A saved result still carrying one of these was filled in from the
// catalogue rather than printed by the lab, so updating it is safe.
const LEGACY_LAB_DEFAULTS: Record<string, string[]> = {
  hdl: ['1–1.5'], hs_crp: ['0–1'], egfr: ['90–120'], homa_ir: ['0.5–1.4'], apob: ['0.6–1.1'],
  glucose_insulin_ratio: ['0.5–2'], ggt: ['5–55'], wbc: ['4–11'], neutrophils: ['1.5–7.5'], nlr: ['0.8–3.5'],
  rdw: ['11.5–14.5'], bilirubin_total: ['5–21'], ast_alt_ratio: ['0.4–1.5'], anti_tpo: ['0–35'], ldl: ['0–3.37'], non_hdl: ['0–4.2'],
  homocysteine: ['0–15.4'], dhea_s: ['2.68–9.23'],
}

/**
 * Brings saved results up to the current catalogue: optimal ranges are reset
 * to the current defaults, and lab ranges only where they are a known wrong
 * default (a lab's own printed range is kept). For a child, an adult catalogue
 * range filled in for an age-sensitive marker is also replaced. Returns the
 * updated entries and how many changed.
 */
export function refreshRanges(entries: FmEntry[], sex: Sex, age?: number | null) {
  let changed = 0
  const next = entries.map(entry => {
    let markerId = entry.markerId
    // BUN was once filed under urea; it is its own test now.
    if (markerId === 'urea' && /\bbun\b|urea nitrogen/i.test(entry.name)) markerId = 'bun'
    const marker = markerById(markerId)
    if (!marker || entry.calculated) return entry
    const ranges = defaultRanges(marker, entry.unit, sex, age)
    if (!ranges) return markerId === entry.markerId ? entry : { ...entry, markerId, panel: marker.panel }
    const sameUnit = normalizeUnit(entry.unit || marker.unit) === normalizeUnit(marker.unit)
    const adultDefault = isChild(age) && ageSensitive(marker) && !!entry.labRange && ['', 'male', 'female'].some(adultSex => defaultRanges(marker, entry.unit, adultSex as Sex)?.lab === entry.labRange)
    const legacy = ((LEGACY_LAB_DEFAULTS[marker.id] || []).includes(entry.labRange) && sameUnit) || adultDefault
    const updated = { ...entry, markerId, panel: marker.panel, fmRange: ranges.fm, labRange: legacy ? ranges.lab : entry.labRange }
    if (updated.fmRange !== entry.fmRange || updated.labRange !== entry.labRange || markerId !== entry.markerId) { changed++; return updated }
    return entry
  })
  return { entries: next, changed }
}

export type AssessedEntry = FmEntry & {
  numeric: number | null
  /** A worded result ("Positive") for a qualitative marker; numeric then holds 0, 1 or 2 for scoring. */
  textResult: TextResult | null
  lab: LabStatus
  fm: FmStatus
  labRangeParsed: Range | null
  fmRangeParsed: Range | null
  urgent: boolean
}

// A worded result is scored on its own fixed scale: negative is in range,
// equivocal is off target, positive is outside the laboratory's range.
const TEXT_SCORE: Record<TextResult, number> = { negative: 0, equivocal: 1, positive: 2 }
const TEXT_LAB_RANGE: Range = { low: null, high: 1 }
const TEXT_FM_RANGE: Range = { low: null, high: 0.5 }

export function assessEntry(entry: FmEntry): AssessedEntry {
  const worded = markerById(entry.markerId)?.qualitative ? textResult(entry.value) : null
  if (worded) {
    const numeric = TEXT_SCORE[worded]
    // The unit is dropped for display: "Positive", not "Positive index".
    return {
      ...entry, unit: '', numeric, textResult: worded, labRangeParsed: TEXT_LAB_RANGE, fmRangeParsed: TEXT_FM_RANGE,
      lab: labStatus(numeric, TEXT_LAB_RANGE), fm: fmStatus(numeric, TEXT_FM_RANGE), urgent: false,
    }
  }
  const numeric = parseValue(entry.value)
  const labRangeParsed = parseRange(entry.labRange)
  const fmRangeParsed = parseRange(entry.fmRange) || labRangeParsed
  const lab = labStatus(numeric, labRangeParsed)
  const fm = fmStatus(numeric, fmRangeParsed)
  const marker = markerById(entry.markerId)
  // Urgent only past a clinical action value, compared in the catalogue unit.
  // A calculated ratio is only as urgent as the results it comes from.
  let urgent = false
  const canonical = entry.calculated ? null : canonicalValue(entry)
  if (canonical !== null && marker?.critical) {
    if (marker.critical.low !== undefined && canonical < marker.critical.low) urgent = true
    if (marker.critical.high !== undefined && canonical > marker.critical.high) urgent = true
  }
  return { ...entry, numeric, textResult: null, lab, fm, labRangeParsed, fmRangeParsed, urgent }
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
// Text colours in the clinic palette (flag / watch / clear), dark enough to read on white.
// Direction is carried by the arrow in each label, not the colour.
export const STATUS_COLOR: Record<FmStatus | LabStatus, string> = { low: '#b8433b', borderline: '#a87a1c', normal: '#4f7a35', optimal: '#4f7a35', high: '#b8433b', unknown: '#6d726b' }
export const PRIORITY_COLOR: Record<Priority, string> = { urgent: '#9e2f29', high: '#b8433b', moderate: '#a87a1c', low: '#4f7a35' }

/** How far a result sits outside a range, as a percentage of the limit it crossed. */
export function deviation(value: number | null, range: Range | null) {
  if (value === null || !range) return 0
  if (range.low !== null && value < range.low && range.low !== 0) return ((range.low - value) / Math.abs(range.low)) * 100
  if (range.high !== null && value > range.high) return range.high === 0 ? 100 : ((value - range.high) / Math.abs(range.high)) * 100
  return 0
}
