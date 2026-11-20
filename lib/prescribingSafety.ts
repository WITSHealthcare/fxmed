// Prescribing safety checks: allergies, interactions and duplicate therapy.
//
// Decision support only. It catches common, well-documented problems with
// medicines used in Nigerian practice; it is not a complete interaction
// database, and the prescriber stays responsible for the prescription. Used
// both in the prescription form (live warnings) and by the server, which
// refuses a prescription with a serious warning unless a reason is given.

export type SafetySeverity = 'contraindicated' | 'major' | 'moderate'
export type SafetyWarning = { kind: 'allergy' | 'interaction' | 'duplicate'; severity: SafetySeverity; message: string }

type DrugClass =
  | 'penicillin' | 'cephalosporin' | 'carbapenem' | 'sulfonamide' | 'macrolide' | 'tetracycline' | 'fluoroquinolone' | 'nitroimidazole' | 'aminoglycoside'
  | 'nsaid' | 'aspirin' | 'opioid' | 'acei' | 'arb' | 'potassium_sparing' | 'thiazide' | 'statin' | 'anticoagulant' | 'antiplatelet' | 'ppi'
  | 'nitrate' | 'pde5' | 'sulfonylurea' | 'azole' | 'qt' | 'serotonergic' | 'benzodiazepine' | 'rifampicin' | 'hormonal_contraceptive'
  | 'methotrexate' | 'trimethoprim' | 'lithium' | 'digoxin' | 'theophylline' | 'efavirenz' | 'nevirapine' | 'dolutegravir' | 'metformin'
  | 'polyvalent_cation' | 'artemether_lumefantrine' | 'quinine' | 'amiodarone' | 'verapamil' | 'clopidogrel'

// Lower-case fragments of generic or common brand names in each class.
const classPatterns: Record<DrugClass, string[]> = {
  penicillin: ['penicillin', 'amoxicillin', 'amoxycillin', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'piperacillin', 'co-amoxiclav', 'augmentin', 'ampiclox', 'clavulan'],
  cephalosporin: ['cefalexin', 'cephalexin', 'cefuroxime', 'cefixime', 'cefpodoxime', 'ceftriaxone', 'cefotaxime', 'ceftazidime', 'cefepime', 'cefaclor', 'cephalosporin'],
  carbapenem: ['meropenem', 'imipenem', 'ertapenem', 'carbapenem'],
  sulfonamide: ['co-trimoxazole', 'cotrimoxazole', 'sulfamethoxazole', 'septrin', 'sulfadoxine', 'fansidar', 'sulfasalazine', 'sulfonamide', 'sulpha', 'sulfa '],
  macrolide: ['azithromycin', 'clarithromycin', 'erythromycin', 'macrolide'],
  tetracycline: ['doxycycline', 'tetracycline', 'minocycline'],
  fluoroquinolone: ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'moxifloxacin', 'quinolone'],
  nitroimidazole: ['metronidazole', 'tinidazole', 'flagyl'],
  aminoglycoside: ['gentamicin', 'amikacin', 'streptomycin', 'aminoglycoside'],
  nsaid: ['ibuprofen', 'diclofenac', 'naproxen', 'celecoxib', 'meloxicam', 'etoricoxib', 'piroxicam', 'ketorolac', 'indometacin', 'indomethacin', 'nsaid'],
  aspirin: ['aspirin', 'acetylsalicylic'],
  opioid: ['tramadol', 'codeine', 'morphine', 'pentazocine', 'pethidine', 'oxycodone', 'fentanyl', 'opioid'],
  acei: ['lisinopril', 'enalapril', 'ramipril', 'perindopril', 'captopril', 'ace inhibitor'],
  arb: ['losartan', 'valsartan', 'telmisartan', 'candesartan', 'irbesartan', 'olmesartan'],
  potassium_sparing: ['spironolactone', 'eplerenone', 'amiloride'],
  thiazide: ['hydrochlorothiazide', 'chlorthalidone', 'indapamide', 'bendroflumethiazide', 'thiazide'],
  statin: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'statin'],
  anticoagulant: ['warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin', 'heparin'],
  antiplatelet: ['clopidogrel', 'ticagrelor', 'aspirin (low dose)'],
  ppi: ['omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'rabeprazole'],
  nitrate: ['isosorbide', 'glyceryl trinitrate', 'nitroglycerin'],
  pde5: ['sildenafil', 'tadalafil', 'vardenafil'],
  sulfonylurea: ['glibenclamide', 'gliclazide', 'glimepiride', 'glipizide'],
  azole: ['fluconazole', 'itraconazole', 'ketoconazole', 'voriconazole'],
  qt: ['artemether', 'lumefantrine', 'quinine', 'mefloquine', 'piperaquine', 'halofantrine', 'azithromycin', 'clarithromycin', 'erythromycin', 'ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'amiodarone', 'ondansetron', 'domperidone', 'haloperidol', 'chlorpromazine', 'citalopram', 'escitalopram'],
  serotonergic: ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram', 'amitriptyline', 'venlafaxine', 'duloxetine', 'tramadol'],
  benzodiazepine: ['diazepam', 'lorazepam', 'alprazolam', 'bromazepam', 'midazolam', 'clonazepam'],
  rifampicin: ['rifampicin', 'rifampin'],
  hormonal_contraceptive: ['ethinylestradiol', 'levonorgestrel', 'desogestrel', 'norethisterone', '(coc)'],
  methotrexate: ['methotrexate'],
  trimethoprim: ['trimethoprim', 'co-trimoxazole', 'cotrimoxazole', 'septrin'],
  lithium: ['lithium'],
  digoxin: ['digoxin'],
  theophylline: ['theophylline', 'aminophylline'],
  efavirenz: ['efavirenz'],
  nevirapine: ['nevirapine'],
  dolutegravir: ['dolutegravir', '(tld)'],
  metformin: ['metformin'],
  polyvalent_cation: ['ferrous', 'iron ', 'iron sucrose', 'antacid', 'aluminium', 'magnesium hydroxide', 'calcium carbonate', 'sucralfate'],
  artemether_lumefantrine: ['artemether/lumefantrine', 'lumefantrine', 'coartem'],
  quinine: ['quinine'],
  amiodarone: ['amiodarone'],
  verapamil: ['verapamil', 'diltiazem'],
  clopidogrel: ['clopidogrel'],
}

const classLabels: Partial<Record<DrugClass, string>> = {
  penicillin: 'penicillins', cephalosporin: 'cephalosporins', carbapenem: 'carbapenems', sulfonamide: 'sulfonamides', macrolide: 'macrolides',
  tetracycline: 'tetracyclines', fluoroquinolone: 'fluoroquinolones', nsaid: 'NSAIDs', opioid: 'opioids', acei: 'ACE inhibitors', arb: 'ARBs',
  statin: 'statins', anticoagulant: 'anticoagulants', antiplatelet: 'antiplatelets', ppi: 'proton pump inhibitors', sulfonylurea: 'sulfonylureas',
  benzodiazepine: 'benzodiazepines', nitroimidazole: 'nitroimidazoles', aminoglycoside: 'aminoglycosides', azole: 'azole antifungals',
}

// Creams, gels, sprays and the like act locally: still checked against
// allergies, but not for interactions or duplicate therapy.
const topical = /\b(cream|gel|ointment|shampoo|pessary|spray|drops|lotion|emulsion|patch|suppository)\b/

const normalise = (value: string) => ` ${value.toLowerCase().replace(/\s+/g, ' ').trim()} `

function classesOf(name: string): Set<DrugClass> {
  const text = normalise(name)
  return new Set((Object.keys(classPatterns) as DrugClass[]).filter((drugClass) => classPatterns[drugClass].some((pattern) => text.includes(pattern))))
}

// Duplicate therapy: two drugs from one of these classes at once.
const duplicateClasses: DrugClass[] = ['penicillin', 'cephalosporin', 'macrolide', 'fluoroquinolone', 'tetracycline', 'nsaid', 'opioid', 'acei', 'arb', 'statin', 'anticoagulant', 'ppi', 'sulfonylurea', 'benzodiazepine']

type Rule = { a: DrugClass[]; b: DrugClass[]; severity: SafetySeverity; message: string }
const interactions: Rule[] = [
  { a: ['nitrate'], b: ['pde5'], severity: 'contraindicated', message: 'Nitrates with sildenafil or tadalafil can cause severe low blood pressure.' },
  { a: ['statin'], b: ['macrolide', 'azole'], severity: 'major', message: 'Raises statin levels (simvastatin and atorvastatin especially): risk of myopathy and rhabdomyolysis.' },
  { a: ['anticoagulant'], b: ['nsaid', 'aspirin', 'antiplatelet'], severity: 'major', message: 'Combined bleeding risk.' },
  { a: ['anticoagulant'], b: ['nitroimidazole', 'sulfonamide', 'azole', 'fluoroquinolone', 'macrolide'], severity: 'major', message: 'Can raise INR sharply with warfarin. Check INR closely or choose another agent.' },
  { a: ['acei'], b: ['arb'], severity: 'major', message: 'Dual RAAS blockade: hyperkalaemia, hypotension and kidney injury.' },
  { a: ['acei', 'arb'], b: ['potassium_sparing'], severity: 'moderate', message: 'Risk of hyperkalaemia. Check potassium.' },
  { a: ['acei', 'arb'], b: ['nsaid'], severity: 'moderate', message: 'NSAIDs blunt the antihypertensive effect and raise the risk of kidney injury.' },
  { a: ['methotrexate'], b: ['trimethoprim', 'sulfonamide'], severity: 'major', message: 'Raises methotrexate toxicity: bone marrow suppression.' },
  { a: ['qt'], b: ['qt'], severity: 'major', message: 'Two QT-prolonging medicines together: risk of arrhythmia. Consider an ECG.' },
  { a: ['serotonergic'], b: ['serotonergic'], severity: 'major', message: 'Risk of serotonin syndrome.' },
  { a: ['opioid'], b: ['benzodiazepine'], severity: 'major', message: 'Opioids with benzodiazepines: risk of profound sedation and respiratory depression.' },
  { a: ['rifampicin'], b: ['hormonal_contraceptive'], severity: 'major', message: 'Rifampicin makes hormonal contraception unreliable. Advise a barrier or other method.' },
  { a: ['rifampicin'], b: ['anticoagulant', 'artemether_lumefantrine', 'efavirenz', 'nevirapine', 'dolutegravir'], severity: 'major', message: 'Rifampicin sharply lowers the level of this medicine. Adjust the dose or choose another agent.' },
  { a: ['lithium'], b: ['nsaid', 'acei', 'arb', 'thiazide'], severity: 'major', message: 'Raises lithium levels: toxicity risk. Monitor levels.' },
  { a: ['digoxin'], b: ['amiodarone', 'verapamil', 'macrolide'], severity: 'major', message: 'Raises digoxin levels: toxicity risk. Reduce the dose and monitor.' },
  { a: ['theophylline'], b: ['fluoroquinolone', 'macrolide'], severity: 'major', message: 'Raises theophylline levels: seizure and arrhythmia risk.' },
  { a: ['sulfonylurea'], b: ['sulfonamide', 'azole'], severity: 'moderate', message: 'Can cause hypoglycaemia. Advise glucose monitoring.' },
  { a: ['efavirenz', 'nevirapine'], b: ['artemether_lumefantrine'], severity: 'moderate', message: 'Lowers lumefantrine levels: risk of malaria treatment failure.' },
  { a: ['tetracycline', 'fluoroquinolone', 'dolutegravir'], b: ['polyvalent_cation'], severity: 'moderate', message: 'Iron, calcium, magnesium and antacids block absorption. Separate the doses by at least 2 hours (6 hours for dolutegravir).' },
  { a: ['dolutegravir'], b: ['metformin'], severity: 'moderate', message: 'Dolutegravir raises metformin levels. Consider a lower metformin dose.' },
  { a: ['clopidogrel'], b: ['ppi'], severity: 'moderate', message: 'Omeprazole and esomeprazole reduce clopidogrel activation. Pantoprazole is preferred.' },
  { a: ['aspirin'], b: ['nsaid'], severity: 'moderate', message: 'Raises the risk of GI bleeding, and ibuprofen can blunt low-dose aspirin.' },
]

// Allergy cross-reactivity between classes worth stopping for.
const crossReactive: Array<{ allergy: DrugClass; drug: DrugClass; message: string }> = [
  { allergy: 'penicillin', drug: 'cephalosporin', message: 'Cross-reactivity with penicillin allergy is uncommon but documented. Avoid if the reaction was anaphylaxis.' },
  { allergy: 'penicillin', drug: 'carbapenem', message: 'Low but documented cross-reactivity with penicillin allergy.' },
  { allergy: 'nsaid', drug: 'aspirin', message: 'NSAID allergy often extends to aspirin.' },
  { allergy: 'aspirin', drug: 'nsaid', message: 'Aspirin allergy often extends to other NSAIDs.' },
]

export type SafetyInput = { medication_name: string; generic_name?: string | null }
export type SafetyContext = {
  allergies: Array<{ allergen: string; reaction?: string | null; severity?: string | null; status?: string | null }>
  medications: Array<{ id?: string; medication_name: string; generic_name?: string | null; status?: string | null }>
}

export function checkPrescription(drug: SafetyInput, context: SafetyContext, options: { ignoreMedicationId?: string } = {}): SafetyWarning[] {
  const name = [drug.medication_name, drug.generic_name].filter(Boolean).join(' ')
  if (!name.trim()) return []
  const drugText = normalise(name)
  const drugClasses = classesOf(name)
  const isTopical = topical.test(drugText)
  const warnings: SafetyWarning[] = []

  for (const allergy of context.allergies.filter((item) => (item.status || 'active') === 'active')) {
    const allergen = normalise(allergy.allergen || '')
    if (allergen.trim().length < 3) continue
    const allergyClasses = classesOf(allergy.allergen)
    const reaction = allergy.reaction ? ` (reaction: ${allergy.reaction})` : ''
    const shared = Array.from(drugClasses).filter((drugClass) => allergyClasses.has(drugClass) && drugClass !== 'qt' && drugClass !== 'serotonergic')
    const direct = drugText.includes(allergen.trim()) || allergen.includes(normalise(drug.medication_name).trim())
    if (direct || shared.length) {
      const via = !direct && shared.length ? `; ${drug.medication_name.trim()} is one of the ${classLabels[shared[0]] || shared[0].replace(/_/g, ' ')}` : ''
      warnings.push({ kind: 'allergy', severity: 'contraindicated', message: `Patient is allergic to ${allergy.allergen.trim()}${reaction}${via}.` })
      continue
    }
    for (const rule of crossReactive) {
      if (allergyClasses.has(rule.allergy) && drugClasses.has(rule.drug)) warnings.push({ kind: 'allergy', severity: 'major', message: `Allergy to ${allergy.allergen.trim()}${reaction}. ${rule.message}` })
    }
  }

  if (isTopical) return warnings

  const current = context.medications.filter((item) => (item.status || 'active') === 'active' && item.id !== options.ignoreMedicationId && !topical.test(normalise(item.medication_name)))
  for (const medication of current) {
    const otherName = [medication.medication_name, medication.generic_name].filter(Boolean).join(' ')
    const otherClasses = classesOf(otherName)
    if (normalise(medication.medication_name).trim() === normalise(drug.medication_name).trim()) {
      warnings.push({ kind: 'duplicate', severity: 'major', message: `${medication.medication_name} is already an active medication.` })
      continue
    }
    const sameClass = duplicateClasses.find((drugClass) => drugClasses.has(drugClass) && otherClasses.has(drugClass))
    if (sameClass) warnings.push({ kind: 'duplicate', severity: 'major', message: `Duplicate therapy: ${medication.medication_name} is also one of the ${classLabels[sameClass] || sameClass}.` })
    for (const rule of interactions) {
      const forward = rule.a.some((c) => drugClasses.has(c)) && rule.b.some((c) => otherClasses.has(c))
      const backward = rule.b.some((c) => drugClasses.has(c)) && rule.a.some((c) => otherClasses.has(c))
      if (forward || backward) warnings.push({ kind: 'interaction', severity: rule.severity, message: `With ${medication.medication_name}: ${rule.message}` })
    }
  }

  // One line per message, most serious first.
  const order: Record<SafetySeverity, number> = { contraindicated: 0, major: 1, moderate: 2 }
  return warnings.filter((item, index) => warnings.findIndex((other) => other.message === item.message) === index).sort((a, b) => order[a.severity] - order[b.severity])
}

// Warnings serious enough that the prescriber must give a reason to go ahead.
export const needsOverride = (warnings: SafetyWarning[]) => warnings.some((warning) => warning.severity !== 'moderate')
