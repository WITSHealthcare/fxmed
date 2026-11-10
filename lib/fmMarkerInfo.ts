// Plain-English explanations of each catalogue biomarker for the Functional
// Health Report's "Out of Optimal Range" section: what the marker is, and the
// common reasons it runs high or low. Written for patients reading the report
// with their clinician; keyed by the catalogue ids in lib/fmBiomarkers.ts.

export type MarkerInfo = { about: string; high?: string; low?: string }

export const MARKER_INFO: Record<string, MarkerInfo> = {
  // Cardio-metabolic
  total_cholesterol: {
    about: 'Cholesterol is a building block for cell membranes, vitamin D, bile and every steroid hormone. Most of it is made by the liver rather than eaten.',
    high: 'A raised level adds to cardiovascular risk and is often seen with insulin resistance, an underactive thyroid, sluggish bile flow or a diet high in refined carbohydrate.',
    low: 'A low level can reflect poor fat absorption, low intake, liver strain, an overactive thyroid or chronic inflammation, and may limit hormone production.',
  },
  ldl: {
    about: 'LDL carries cholesterol from the liver to the tissues. When there is too much of it, or the particles are damaged, it lodges in artery walls.',
    high: 'Raised LDL is one of the main drivers of atherosclerosis. Insulin resistance, an underactive thyroid, genetics and saturated or trans fats all push it up.',
    low: 'Very low LDL is uncommon outside medication and can be seen with malabsorption, an overactive thyroid or liver disease.',
  },
  hdl: {
    about: 'HDL collects excess cholesterol from tissues and returns it to the liver. Higher levels are generally protective.',
    high: 'A high HDL is usually protective. Very high levels occasionally reflect genetics, heavy alcohol use or inflammation that makes HDL less effective.',
    low: 'Low HDL is a hallmark of insulin resistance and metabolic syndrome, and is linked to inactivity, smoking and refined-carbohydrate diets.',
  },
  triglycerides: {
    about: 'Triglycerides are the main form of fat in the blood. The liver makes them from excess sugar and starch, as well as from dietary fat and alcohol.',
    high: 'Raised triglycerides point to insulin resistance, a diet high in sugar, starch or alcohol, fatty liver or an underactive thyroid.',
    low: 'Low triglycerides are usually healthy; very low levels can follow a very low-fat diet, malabsorption or an overactive thyroid.',
  },
  lpa: {
    about: 'Lipoprotein(a) is an LDL-like particle whose level is set largely by genetics. It promotes both plaque and clotting.',
    high: 'A raised Lp(a) is an inherited cardiovascular risk factor. It changes little with diet, which makes controlling every other risk factor more important.',
  },
  apoa1: {
    about: 'Apolipoprotein A1 is the main protein of HDL and drives its ability to clear cholesterol from tissues.',
    high: 'Higher levels are generally protective.',
    low: 'A low level means less protective HDL activity, and is seen with insulin resistance, inactivity and smoking.',
  },
  apob: {
    about: 'Apolipoprotein B sits on every atherogenic particle (LDL, VLDL and Lp(a)), so it counts the particles that can enter artery walls.',
    high: 'Raised ApoB is one of the strongest single predictors of cardiovascular risk, often more telling than LDL itself.',
    low: 'Low ApoB is favourable.',
  },
  non_hdl: {
    about: 'Non-HDL cholesterol is total cholesterol minus HDL: all the cholesterol carried by particles that can cause plaque.',
    high: 'A raised level signals increased cardiovascular risk, particularly alongside high triglycerides or insulin resistance.',
  },
  chol_hdl_ratio: {
    about: 'The ratio of total cholesterol to HDL balances the harmful and protective fractions, and predicts risk better than either alone.',
    high: 'A higher ratio means less protection relative to the cholesterol load, and is linked to higher cardiovascular risk.',
  },
  tg_hdl_ratio: {
    about: 'The triglyceride to HDL ratio is a simple, well-validated window on insulin sensitivity and on the size of LDL particles.',
    high: 'A raised ratio suggests insulin resistance and smaller, denser LDL particles, which are more likely to cause plaque.',
  },
  // Glucose
  fasting_glucose: {
    about: 'Fasting glucose is the blood sugar level after an overnight fast, reflecting how well the body manages sugar between meals.',
    high: 'A raised fasting glucose points to insulin resistance, pre-diabetes or diabetes. Stress, poor sleep and steroid medicines can also raise it.',
    low: 'A low fasting glucose can reflect reactive hypoglycaemia, under-eating, adrenal or liver problems, or some medicines.',
  },
  hba1c: {
    about: 'HbA1c measures how much sugar has attached to red blood cells, giving an average of blood sugar over the past two to three months.',
    high: 'A raised HbA1c means blood sugar has been running high on average, a trend towards pre-diabetes or diabetes. Iron deficiency can also falsely raise it.',
    low: 'A low HbA1c can reflect frequent low blood sugar, or a shortened red-cell lifespan (bleeding, haemolysis or a haemoglobin variant).',
  },
  hba1c_ifcc: {
    about: 'HbA1c (IFCC units) is the same three-month blood sugar average reported in mmol/mol.',
    high: 'A raised value means blood sugar has been running high on average, a trend towards pre-diabetes or diabetes.',
    low: 'A low value can reflect frequent low blood sugar or a shortened red-cell lifespan.',
  },
  fasting_insulin: {
    about: 'Insulin moves sugar from the blood into the cells. Fasting insulin shows how hard the pancreas must work to keep blood sugar normal.',
    high: 'Raised fasting insulin is often the earliest sign of insulin resistance, years before blood sugar itself rises. It promotes fat storage, high blood pressure and inflammation.',
    low: 'A low level with normal glucose is usually healthy; with high glucose it can mean the pancreas is not producing enough insulin.',
  },
  c_peptide: {
    about: 'C-peptide is released with insulin in equal amounts, so it reflects how much insulin the pancreas is producing.',
    high: 'A raised level means the pancreas is overworking, as in insulin resistance.',
    low: 'A low level suggests reduced insulin production by the pancreas.',
  },
  homa_ir: {
    about: 'HOMA-IR combines fasting glucose and insulin into one estimate of insulin resistance.',
    high: 'A raised score means the body needs more insulin than it should to control blood sugar: insulin resistance.',
  },
  glucose_insulin_ratio: {
    about: 'The glucose to insulin ratio is another way of estimating insulin sensitivity.',
    low: 'A low ratio suggests insulin resistance.',
  },
  quicki: {
    about: 'QUICKI is an index of insulin sensitivity calculated from fasting glucose and insulin.',
    low: 'A low value suggests reduced insulin sensitivity.',
  },
  // Thyroid
  tsh: {
    about: 'TSH is the pituitary gland\'s signal to the thyroid. It rises when the thyroid is underactive and falls when it is overactive.',
    high: 'A raised TSH suggests the thyroid is underactive (hypothyroidism), most often from autoimmune thyroiditis, iodine imbalance or recovery from illness.',
    low: 'A low TSH suggests an overactive thyroid or too much thyroid medication, and occasionally a pituitary problem.',
  },
  free_t3: {
    about: 'Free T3 is the active thyroid hormone that sets the metabolic rate of every cell. Most of it is converted from T4 in the liver, gut and tissues.',
    high: 'A raised level suggests an overactive thyroid or too much thyroid medication.',
    low: 'A low level can reflect an underactive thyroid or poor conversion of T4 to T3, which is common with stress, illness, calorie restriction and low selenium, zinc or iron.',
  },
  free_t4: {
    about: 'Free T4 is the main hormone the thyroid produces. It is the storage form that the body converts to active T3.',
    high: 'A raised level suggests an overactive thyroid or too much thyroid medication.',
    low: 'A low level suggests the thyroid is underactive, or a lack of iodine or other nutrients the thyroid needs.',
  },
  reverse_t3: {
    about: 'Reverse T3 is an inactive form of T3 that the body makes more of under stress, acting as a brake on metabolism.',
    high: 'A raised level is seen with chronic stress, illness, calorie restriction, high cortisol and low iron or selenium.',
  },
  anti_tpo: {
    about: 'Thyroid peroxidase antibodies show the immune system is attacking the enzyme the thyroid uses to make its hormones.',
    high: 'Raised antibodies are the hallmark of autoimmune thyroiditis (Hashimoto\'s), and can precede changes in thyroid hormone levels by years.',
  },
  anti_tg: {
    about: 'Thyroglobulin antibodies show the immune system is attacking thyroglobulin, the protein from which thyroid hormones are made.',
    high: 'Raised antibodies are found in autoimmune thyroiditis (Hashimoto\'s) and Graves\' disease.',
  },
  // Adrenal & hormones
  dhea_s: {
    about: 'DHEA-S is made by the adrenal glands and is the raw material for testosterone and oestrogen. It supports energy, mood, muscle and immunity.',
    high: 'A raised level can be seen with polycystic ovary syndrome, adrenal overactivity or DHEA supplements.',
    low: 'A low level is seen with long-term stress, adrenal fatigue, ageing and chronic illness, and is linked to low energy, libido and resilience.',
  },
  cortisol_am: {
    about: 'Morning cortisol is the adrenal stress hormone at its daily peak. It mobilises energy, controls inflammation and sets the body clock.',
    high: 'A raised level suggests an active stress response, poor sleep, steroid medicines or, rarely, an adrenal or pituitary disorder.',
    low: 'A low level suggests the adrenal glands are under-responding, as with prolonged stress or, rarely, adrenal insufficiency, which needs prompt medical review.',
  },
  cortisol_pm: {
    about: 'Evening cortisol should be low, allowing the body to wind down for sleep.',
    high: 'A raised evening level suggests the stress response is not switching off, which disrupts sleep and blood sugar.',
    low: 'A low level with a low morning cortisol suggests reduced adrenal output.',
  },
  testosterone: {
    about: 'Testosterone supports muscle, bone, energy, mood and libido in both men and women.',
    high: 'In women a raised level is most often seen with polycystic ovary syndrome and insulin resistance. In men it is usually from supplements or medication.',
    low: 'A low level is linked to fatigue, low libido, loss of muscle and bone, and in men is common with excess weight, insulin resistance and poor sleep.',
  },
  shbg: {
    about: 'Sex hormone binding globulin carries testosterone and oestrogen in the blood. Bound hormone is inactive, so SHBG controls how much is available to the tissues.',
    high: 'A raised SHBG reduces free testosterone, and is seen with an overactive thyroid, low calorie intake, liver strain and oral oestrogen.',
    low: 'A low SHBG is a sensitive sign of insulin resistance and is common with excess weight and polycystic ovary syndrome.',
  },
  free_testosterone: {
    about: 'Free testosterone is the unbound, active portion of testosterone that can enter the tissues.',
    high: 'In women a raised level suggests polycystic ovary syndrome or insulin resistance.',
    low: 'A low level is linked to fatigue, low libido and loss of muscle and bone.',
  },
  free_testosterone_index: {
    about: 'The free androgen index compares testosterone with SHBG to estimate how much testosterone is active.',
    high: 'In women a raised index points towards polycystic ovary syndrome or insulin resistance.',
    low: 'A low index suggests little active testosterone.',
  },
  estradiol: {
    about: 'Estradiol is the main oestrogen. In women it varies across the cycle; in men a small amount is needed for bone and brain health.',
    high: 'A raised level can reflect the phase of the cycle, excess body fat, oestrogen dominance or slow oestrogen clearance by the liver and gut.',
    low: 'A low level can reflect the phase of the cycle, perimenopause or menopause, low body fat or over-training, and affects bone, mood and sleep.',
  },
  progesterone: {
    about: 'Progesterone balances oestrogen, supports sleep and calm, and prepares the womb for pregnancy. It peaks in the second half of the cycle.',
    high: 'A raised level is expected in the luteal phase and in pregnancy.',
    low: 'A low level can reflect the day of the cycle the sample was taken, a cycle without ovulation, a short luteal phase, stress or perimenopause.',
  },
  // Kidney
  creatinine: {
    about: 'Creatinine is a waste product of muscle that the kidneys filter out. Its level reflects both kidney filtration and muscle mass.',
    high: 'A raised level can mean reduced kidney filtration, dehydration, high muscle mass or a high-meat meal before the test.',
    low: 'A low level is usually due to low muscle mass, and can be seen with low protein intake.',
  },
  egfr: {
    about: 'The eGFR estimates how much blood the kidneys filter each minute, calculated from creatinine, age and sex.',
    high: 'A high eGFR is usually normal; very high values can be seen early in diabetes.',
    low: 'A low eGFR means the kidneys are filtering less than they should. Below 60 for three months or more is chronic kidney disease.',
  },
  urea: {
    about: 'Urea is the main waste product of protein breakdown, made in the liver and cleared by the kidneys.',
    high: 'A raised level can mean dehydration, reduced kidney function, a very high-protein diet or bleeding in the gut.',
    low: 'A low level can reflect low protein intake, poor protein digestion, over-hydration or liver strain.',
  },
  uric_acid: {
    about: 'Uric acid is made when the body breaks down purines from food and cell turnover. In moderate amounts it is an antioxidant.',
    high: 'A raised level is linked to gout, kidney stones, insulin resistance, fructose and alcohol intake, and cardiovascular risk.',
    low: 'A low level can reflect low antioxidant reserve, low protein intake or molybdenum deficiency.',
  },
  protein_creatinine: {
    about: 'The urine protein to creatinine ratio measures how much protein is leaking through the kidney filters.',
    high: 'A raised ratio shows protein leaking into the urine, an early sign of kidney damage from diabetes, high blood pressure or kidney disease.',
  },
  amylase: {
    about: 'Amylase is a digestive enzyme made mostly by the pancreas and salivary glands.',
    high: 'A raised level can reflect pancreatic or salivary gland inflammation, or reduced kidney clearance.',
    low: 'A low level can be seen with reduced pancreatic function.',
  },
  u_creatinine: {
    about: 'Urine creatinine shows how concentrated the urine sample is, and is used to adjust other urine results.',
    high: 'A raised level usually means concentrated urine.',
    low: 'A low level usually means dilute urine.',
  },
  u_protein: {
    about: 'Urine protein measures protein leaking through the kidney filters.',
    high: 'Protein in the urine is an early sign of kidney stress, often from diabetes or high blood pressure.',
  },
  // Liver
  alt: {
    about: 'ALT is an enzyme found mainly inside liver cells. It leaks into the blood when liver cells are stressed.',
    high: 'A raised ALT suggests liver cell stress, most commonly from fatty liver and insulin resistance, alcohol, medicines or viral hepatitis.',
    low: 'A low ALT can be a sign of vitamin B6 deficiency.',
  },
  ast: {
    about: 'AST is an enzyme found in the liver, heart and muscles.',
    high: 'A raised AST can reflect liver stress, alcohol, muscle injury or hard exercise before the test.',
    low: 'A low AST can be a sign of vitamin B6 deficiency.',
  },
  ggt: {
    about: 'GGT is a liver and bile-duct enzyme involved in glutathione, the body\'s main antioxidant.',
    high: 'A raised GGT is a sensitive sign of liver and bile-flow stress, alcohol use, fatty liver, toxin exposure and oxidative stress.',
    low: 'A low GGT is generally favourable.',
  },
  alp: {
    about: 'Alkaline phosphatase is an enzyme from the liver, bile ducts and bone. Zinc and magnesium are needed for it to work.',
    high: 'A raised level can reflect sluggish bile flow, liver strain or increased bone turnover (growth, healing, vitamin D deficiency).',
    low: 'A low level is often linked to zinc or magnesium deficiency, and occasionally to low thyroid function.',
  },
  bilirubin_total: {
    about: 'Bilirubin is made when old red blood cells are broken down, then processed by the liver and excreted in bile.',
    high: 'A raised level can reflect liver or bile-flow problems, increased red-cell breakdown, or Gilbert\'s syndrome, a common harmless variant.',
    low: 'Bilirubin is also an antioxidant, so a low level has been linked to increased oxidative stress.',
  },
  bilirubin_conj: {
    about: 'Conjugated (direct) bilirubin has already been processed by the liver and is waiting to be excreted in bile.',
    high: 'A raised level suggests bile is not flowing freely, from the liver, gallbladder or bile ducts.',
  },
  albumin: {
    about: 'Albumin is the main protein in blood, made by the liver. It carries hormones, nutrients and medicines, and holds fluid in the bloodstream.',
    high: 'A raised level most often reflects dehydration.',
    low: 'A low level can reflect inflammation, low protein intake or poor digestion, liver strain or protein loss through the kidneys.',
  },
  total_protein: {
    about: 'Total protein is albumin plus globulins, a broad measure of protein status, digestion and immune activity.',
    high: 'A raised level is most often due to dehydration, and occasionally to high immune protein production.',
    low: 'A low level can reflect low protein intake, poor digestion and absorption, or liver strain.',
  },
  globulin: {
    about: 'Globulins are proteins that include antibodies and the carriers of hormones and minerals.',
    high: 'A raised level can reflect chronic infection, inflammation or immune activation, and occasionally dehydration.',
    low: 'A low level can reflect poor digestion, low protein intake or reduced immune reserve.',
  },
  ast_alt_ratio: {
    about: 'The AST to ALT ratio helps tell apart different patterns of liver stress.',
    high: 'A ratio above 1 can point towards alcohol-related liver stress, more advanced liver change or muscle injury.',
    low: 'A low ratio is typical of fatty-liver-type stress, where ALT rises more than AST.',
  },
  ldh: {
    about: 'LDH is an enzyme found in almost every tissue, released when cells are damaged.',
    high: 'A raised level is non-specific: tissue damage, haemolysis, muscle injury or, rarely, other serious conditions.',
    low: 'A low LDH has been linked to reactive hypoglycaemia.',
  },
  a1at: {
    about: 'Alpha-1 antitrypsin is a liver protein that protects the lungs from inflammatory damage.',
    high: 'A raised level is a sign of inflammation.',
    low: 'A low level can indicate inherited alpha-1 antitrypsin deficiency, which affects the lungs and liver.',
  },
  // Methylation
  b12: {
    about: 'Vitamin B12 is needed for nerves, red blood cells, DNA and energy, and for clearing homocysteine.',
    high: 'A raised level usually reflects supplementation; without supplements it can occasionally point to liver disease.',
    low: 'A low level causes fatigue, nerve symptoms, memory problems and anaemia. It is common with low stomach acid, metformin, acid-blocking medicines and plant-based diets.',
  },
  folate: {
    about: 'Folate works with B12 in methylation, which the body needs for DNA, red blood cells, mood chemicals and detoxification.',
    high: 'A raised level usually reflects supplementation or fortified foods.',
    low: 'A low level impairs methylation, raises homocysteine and can cause anaemia. It is common with low vegetable intake, alcohol and some medicines.',
  },
  homocysteine: {
    about: 'Homocysteine is an amino acid made during methylation. B12, folate and B6 are needed to recycle it.',
    high: 'A raised level damages blood vessels and is linked to heart disease, stroke and cognitive decline. It usually signals a shortfall of B12, folate or B6.',
    low: 'A low level is generally favourable.',
  },
  // Hematology
  rbc: {
    about: 'The red blood cell count is the number of oxygen-carrying cells in the blood.',
    high: 'A raised count can reflect dehydration, smoking, living at altitude or, less often, a bone-marrow condition.',
    low: 'A low count suggests anaemia, from iron, B12 or folate deficiency, blood loss or chronic illness.',
  },
  hemoglobin: {
    about: 'Haemoglobin is the iron-containing protein in red cells that carries oxygen around the body.',
    high: 'A raised level can reflect dehydration, smoking or a bone-marrow condition.',
    low: 'A low level is anaemia, which causes tiredness and breathlessness. Iron deficiency is the most common cause.',
  },
  hematocrit: {
    about: 'Haematocrit is the share of the blood made up of red cells.',
    high: 'A raised level most often reflects dehydration.',
    low: 'A low level suggests anaemia.',
  },
  mcv: {
    about: 'MCV is the average size of the red blood cells, which helps point to the cause of any anaemia.',
    high: 'Large red cells suggest B12 or folate deficiency, alcohol use, liver strain or an underactive thyroid.',
    low: 'Small red cells suggest iron deficiency, or an inherited trait such as thalassaemia.',
  },
  mch: {
    about: 'MCH is the average amount of haemoglobin in each red cell.',
    high: 'A raised level is seen with B12 or folate deficiency.',
    low: 'A low level is seen with iron deficiency.',
  },
  mchc: {
    about: 'MCHC is the concentration of haemoglobin inside the red cells.',
    high: 'A raised level is uncommon and can reflect certain inherited red-cell conditions.',
    low: 'A low level suggests iron deficiency.',
  },
  rdw: {
    about: 'RDW measures how much the red cells vary in size.',
    high: 'A raised RDW is an early sign of a developing iron, B12 or folate deficiency, or of a mixed deficiency.',
  },
  platelets: {
    about: 'Platelets are the cells that start blood clotting.',
    high: 'A raised count can reflect inflammation, iron deficiency, recent bleeding or infection.',
    low: 'A low count can reflect viral infection, medicines, liver or spleen problems, or bone-marrow conditions, and increases bleeding risk.',
  },
  wbc: {
    about: 'The white blood cell count is the total number of immune cells in the blood.',
    high: 'A raised count usually reflects infection, inflammation, stress or steroid medicines.',
    low: 'A low count can reflect chronic viral infection, nutrient deficiencies, autoimmune conditions or medicines. Mildly low counts are common and often harmless in people of African heritage.',
  },
  neutrophils: {
    about: 'Neutrophils are the immune system\'s first responders to bacterial infection.',
    high: 'A raised count suggests bacterial infection, inflammation, stress or steroid medicines.',
    low: 'A low count can reflect viral infection or nutrient deficiency; mildly low counts are common and often harmless in people of African heritage.',
  },
  lymphocytes: {
    about: 'Lymphocytes direct the immune response to viruses and produce antibodies.',
    high: 'A raised count suggests a viral infection or chronic immune activation.',
    low: 'A low count can reflect stress, high cortisol, zinc deficiency or chronic illness.',
  },
  monocytes: {
    about: 'Monocytes clean up damaged cells and microbes and help resolve inflammation.',
    high: 'A raised count is seen in the recovery phase of infection and with chronic infection or inflammation.',
    low: 'A low count is usually not significant on its own.',
  },
  eosinophils: {
    about: 'Eosinophils respond to allergies and parasites.',
    high: 'A raised count suggests allergy, asthma, eczema or a parasitic infection, which is worth checking for.',
  },
  basophils: {
    about: 'Basophils release histamine and take part in allergic reactions.',
    high: 'A raised count can reflect allergy or inflammation.',
  },
  nlr: {
    about: 'The neutrophil to lymphocyte ratio is a simple marker of the balance between inflammation and immune regulation.',
    high: 'A raised ratio points to physical stress, inflammation or infection.',
    low: 'A low ratio can point towards a viral pattern or lowered neutrophils.',
  },
  esr: {
    about: 'ESR measures how quickly red cells settle in a tube, an indirect sign of inflammation.',
    high: 'A raised ESR suggests inflammation or infection, and rises with anaemia and age.',
  },
  // Electrolytes & minerals
  sodium: {
    about: 'Sodium controls fluid balance, blood pressure and nerve signalling, and is regulated by the kidneys and adrenal glands.',
    high: 'A raised level most often reflects dehydration, and can reflect adrenal stress.',
    low: 'A low level can reflect over-hydration, diuretic medicines, adrenal underactivity or heavy sweating.',
  },
  potassium: {
    about: 'Potassium is essential for the heart rhythm, muscles and nerves.',
    high: 'A raised level can reflect reduced kidney function, some blood-pressure medicines, adrenal underactivity or a damaged sample.',
    low: 'A low level can reflect diuretics, vomiting or diarrhoea, low intake or adrenal stress, and can affect the heart rhythm.',
  },
  chloride: {
    about: 'Chloride works with sodium and bicarbonate to keep fluid and acid–base balance.',
    high: 'A raised level can reflect dehydration or a tendency towards acidity.',
    low: 'A low level can reflect vomiting, low stomach acid or a tendency towards alkalinity.',
  },
  bicarbonate: {
    about: 'Bicarbonate (CO₂) is the blood\'s main buffer against acidity.',
    high: 'A raised level can reflect vomiting, diuretics or shallow breathing.',
    low: 'A low level suggests the blood is tending towards acidity, as with kidney strain, uncontrolled diabetes or rapid breathing.',
  },
  anion_gap: {
    about: 'The anion gap is calculated from the electrolytes and helps detect hidden acids in the blood.',
    high: 'A raised gap can reflect acidity from kidney strain, poorly controlled diabetes or thiamine (B1) deficiency.',
    low: 'A low gap is often due to low albumin.',
  },
  calcium: {
    about: 'Calcium supports bones, muscles, nerves and heart rhythm, and is held in a tight range by parathyroid hormone and vitamin D.',
    high: 'A raised level can reflect an overactive parathyroid gland, excess vitamin D or dehydration, and needs medical review.',
    low: 'A low level can reflect low vitamin D, low magnesium, low albumin or poor absorption.',
  },
  ca_phos_ratio: {
    about: 'The calcium to phosphate ratio reflects how parathyroid hormone and vitamin D are balancing these minerals.',
    high: 'A raised ratio can point to parathyroid overactivity.',
    low: 'A low ratio can point to low vitamin D or high phosphate intake.',
  },
  na_k_ratio: {
    about: 'The sodium to potassium ratio reflects the adrenal hormones that balance these two minerals.',
    high: 'A raised ratio is associated with acute stress.',
    low: 'A low ratio is associated with long-term adrenal strain.',
  },
  rbc_magnesium: {
    about: 'Red-cell magnesium reflects the magnesium stored inside cells, a better guide to body stores than serum magnesium.',
    high: 'A raised level is uncommon and usually reflects supplementation.',
    low: 'A low level shows depleted magnesium stores, linked to cramps, poor sleep, anxiety, palpitations and insulin resistance.',
  },
  magnesium: {
    about: 'Magnesium is needed for more than 300 enzymes, including those for energy, muscle relaxation, sleep and blood sugar control.',
    high: 'A raised level is uncommon and can reflect reduced kidney clearance or supplements.',
    low: 'A low level is linked to cramps, fatigue, poor sleep, palpitations and insulin resistance. Serum levels fall only once stores are quite depleted.',
  },
  phosphate: {
    about: 'Phosphate is needed for bones and for energy (ATP) in every cell.',
    high: 'A raised level can reflect reduced kidney function or low parathyroid activity.',
    low: 'A low level can reflect low vitamin D, poor intake, high insulin or an overactive parathyroid gland.',
  },
  // Vitamins & micronutrients
  vitamin_d: {
    about: 'Vitamin D acts like a hormone, supporting bones, immunity, mood, muscle strength and blood sugar control.',
    high: 'A raised level usually reflects high-dose supplements and can raise calcium; the dose may need reducing.',
    low: 'A low level is linked to weak bones, low immunity, low mood, fatigue and insulin resistance. It is common even in sunny climates, especially with darker skin and indoor work.',
  },
  serum_iron: {
    about: 'Serum iron is the iron circulating in the blood, bound to transferrin. It varies through the day and with recent meals.',
    high: 'A raised level can reflect iron overload, supplements or liver damage.',
    low: 'A low level suggests iron deficiency or inflammation, and is best read alongside ferritin and transferrin saturation.',
  },
  transferrin: {
    about: 'Transferrin is the protein that carries iron in the blood. The body makes more of it when iron is short.',
    high: 'A raised level suggests iron deficiency.',
    low: 'A low level can reflect inflammation, low protein status or iron overload.',
  },
  tibc: {
    about: 'Total iron-binding capacity measures how much iron the blood could carry; it rises when iron is short.',
    high: 'A raised TIBC suggests iron deficiency.',
    low: 'A low TIBC can reflect inflammation, low protein status or iron overload.',
  },
  tsat: {
    about: 'Transferrin saturation is the share of iron-carrying capacity that is in use.',
    high: 'A raised saturation can reflect iron overload, including inherited haemochromatosis, and should be followed up.',
    low: 'A low saturation is a sensitive sign of iron deficiency.',
  },
  ferritin: {
    about: 'Ferritin is the body\'s iron store. It also rises with inflammation, so it is read alongside the other iron markers and CRP.',
    high: 'A raised level can reflect inflammation, fatty liver, insulin resistance or iron overload, and is linked to oxidative stress.',
    low: 'A low level means depleted iron stores, causing fatigue, hair loss and poor exercise tolerance, often before anaemia develops.',
  },
  zinc: {
    about: 'Zinc is needed for immunity, wound healing, taste, skin, thyroid hormone conversion and testosterone production.',
    high: 'A raised level usually reflects supplements; long-term excess can lower copper.',
    low: 'A low level is linked to frequent infections, poor wound healing, hair loss, low taste and low testosterone.',
  },
  // Inflammation & bone
  hs_crp: {
    about: 'High-sensitivity CRP is made by the liver in response to inflammation anywhere in the body.',
    high: 'A raised level signals inflammation and is an independent cardiovascular risk factor. A recent infection or injury can raise it temporarily.',
  },
  pth: {
    about: 'Parathyroid hormone keeps blood calcium steady by drawing on bone, kidneys and vitamin D.',
    high: 'A raised level most often reflects low vitamin D or low calcium intake, and occasionally an overactive parathyroid gland.',
    low: 'A low level can reflect high calcium or excess vitamin D.',
  },
  ck: {
    about: 'Creatine kinase is an enzyme released from muscle.',
    high: 'A raised level usually reflects hard exercise or muscle injury, and occasionally statin side effects or an underactive thyroid.',
    low: 'A low level can reflect low muscle mass.',
  },
}

/** The explanation for a marker and the direction it is out in. */
export function markerExplanation(markerId: string | null, direction: 'high' | 'low') {
  const info = markerId ? MARKER_INFO[markerId] : undefined
  if (!info) return ''
  const reason = direction === 'high' ? info.high : info.low
  return [info.about, reason].filter(Boolean).join(' ')
}
