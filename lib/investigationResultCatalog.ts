import { INVESTIGATION_CATALOG } from './investigationFormPdf'
import type { InvestigationResult } from './investigationResultPdf'

// Result entry needs individual measurements rather than a single value for a panel.
const panelMeasurements: Record<string, string[]> = {
  'Liver Function Test': ['ALT', 'AST', 'ALP', 'GGT', 'Total Bilirubin', 'Direct Bilirubin', 'Total Protein', 'Albumin', 'Globulin'],
  'Bilirubin (Total and Direct)': ['Total Bilirubin', 'Direct Bilirubin'],
  'Total Protein and Albumin': ['Total Protein', 'Albumin'],
  'Thyroid Function Test (TSH, Free T3, Free T4)': ['TSH', 'Free T3', 'Free T4'],
  'Iron Studies': ['Serum Iron', 'Ferritin', 'Transferrin', 'Total Iron Binding Capacity (TIBC)', 'Transferrin Saturation'],
}

export const RESULT_TEST_CATALOG = [
  {
    category: 'Full Blood Count',
    tests: [
      'Haemoglobin', 'Haematocrit (PCV)', 'Red Blood Cell Count (RBC)', 'White Blood Cell Count (WBC)',
      'Platelet Count', 'Mean Corpuscular Volume (MCV)', 'Mean Corpuscular Haemoglobin (MCH)',
      'Mean Corpuscular Haemoglobin Concentration (MCHC)', 'Red Cell Distribution Width (RDW)',
      'Mean Platelet Volume (MPV)', 'Neutrophils (%)', 'Lymphocytes (%)', 'Monocytes (%)',
      'Eosinophils (%)', 'Basophils (%)', 'Neutrophils (absolute)', 'Lymphocytes (absolute)',
      'Monocytes (absolute)', 'Eosinophils (absolute)', 'Basophils (absolute)',
    ],
  },
  ...INVESTIGATION_CATALOG.map(group => ({
    category: group.category,
    tests: Array.from(new Set(group.tests.flatMap(test =>
      test === 'Complete Blood Count (CBC)' ? [] : panelMeasurements[test] || [test]
    ))),
  })),
]

// These are choices for transcribing a laboratory report, not conversions or
// reference ranges. Leave the unit blank until the user chooses it.
export const RESULT_UNIT_GROUPS = [
  { label: 'Concentration', units: ['mmol/L', 'µmol/L', 'mol/L', 'mEq/L', 'mg/dL', 'mg/L', 'g/dL', 'g/L', 'µg/dL', 'µg/L', 'ng/dL', 'ng/mL', 'pg/mL', 'nmol/L', 'pmol/L'] },
  { label: 'Cell counts', units: ['×10⁹/L', '×10¹²/L', '×10³/µL', '×10⁶/µL', 'cells/µL', 'cells/HPF'] },
  { label: 'Activity and hormones', units: ['U/L', 'IU/L', 'IU/mL', 'mIU/L', 'mIU/mL', 'µIU/mL', 'U/mL'] },
  { label: 'Other measurements', units: ['%', 'mmol/mol', 'fL', 'pg', 'mm/hr', 'seconds', 'ratio', 'mL/min/1.73 m²', 'mg/g', 'mg/mmol', 'copies/mL', 'CFU/mL'] },
]

export const resultTestKey = (test: string) => test.trim().replace(/\s+/g, ' ').toLowerCase()

export function createResultRow(test = '', section = ''): InvestigationResult {
  return { section, test, result: '', unit: '', referenceRange: '', flag: '', remark: '' }
}

// What a lab reports back for each test that can be ordered, so entering the
// results of an order starts from what was requested. Panels expand into the
// measurements they report; the core-panel names, which are worded differently
// from the catalogue, are mapped onto it here too.
const orderedPanels: Record<string, { section: string; tests: string[] }> = {
  'Complete Blood Count (CBC)': { section: 'Full Blood Count', tests: RESULT_TEST_CATALOG[0].tests },
  'Comprehensive Metabolic Panel (CMP)': { section: 'Comprehensive Metabolic Panel', tests: ['Glucose', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'Urea', 'Creatinine', 'Calcium', 'Total Protein', 'Albumin', 'Total Bilirubin', 'ALP', 'ALT', 'AST'] },
  'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)': { section: 'Lipid Profile', tests: ['Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides'] },
  'Thyroid (TSH, free T3, free T4)': { section: 'Thyroid Function', tests: ['TSH', 'Free T3', 'Free T4'] },
  'Thyroid Function Test (TSH, Free T3, Free T4)': { section: 'Thyroid Function', tests: panelMeasurements['Thyroid Function Test (TSH, Free T3, Free T4)'] },
  'Liver Function Test': { section: 'Liver Function Test', tests: panelMeasurements['Liver Function Test'] },
  'Iron Studies': { section: 'Iron Studies', tests: panelMeasurements['Iron Studies'] },
}
const renamedTests: Record<string, string> = {
  'High Sensitivity CRP': 'High-Sensitivity CRP',
  'ESR (Erythrocyte Sedimentation Rate)': 'Erythrocyte Sedimentation Rate (ESR)',
}

function orderedTestCategory(test: string) {
  return INVESTIGATION_CATALOG.find(group => group.tests.some(name => name === test))?.category || 'Other Investigations'
}

/** Blank result rows for the tests on an order, one per reported measurement. */
export function resultRowsForOrder(orderedTests: string[]): InvestigationResult[] {
  const rows: InvestigationResult[] = []
  const seen = new Set<string>()
  const add = (test: string, section: string) => {
    const key = resultTestKey(test)
    if (!key || seen.has(key)) return
    seen.add(key)
    rows.push(createResultRow(test, section))
  }
  for (const ordered of orderedTests) {
    const name = renamedTests[ordered] || ordered
    const panel = orderedPanels[name]
    if (panel) panel.tests.forEach(test => add(test, panel.section))
    else (panelMeasurements[name] || [name]).forEach(test => add(test, orderedTestCategory(name)))
  }
  return rows
}
