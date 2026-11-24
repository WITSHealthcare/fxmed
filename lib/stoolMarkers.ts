// Stool testing for the Functional Health Analysis: the GI-MAP catalogue, and
// how a stool result is read. Stool results sit beside the blood results; they
// are never given an FM optimal range or scored as blood markers. Each result is
// read against the laboratory's own printed reference. See docs/gi-map-module-plan.md.

export type StoolSection =
  | 'pathogen' | 'h_pylori' | 'commensal' | 'phyla' | 'overgrowth' | 'inflammatory'
  | 'fungi' | 'virus' | 'parasite' | 'worm' | 'digestion' | 'gi_markers' | 'immune' | 'inflammation' | 'barrier' | 'other'

/**
 * range: a low and/or high limit ("1.6e9 - 2.5e11", "> 200");
 * threshold: an upper limit a result should stay under ("< 1.00e3");
 * presence: detected or not ("Not Detected", "Negative").
 */
export type StoolKind = 'range' | 'threshold' | 'presence'

export type StoolMarker = { id: string; name: string; section: StoolSection; unit: string; kind: StoolKind; reference: string; aliases?: string[] }

export type StoolEntry = {
  markerId: string | null
  name: string
  section: StoolSection
  /** As printed: "2.10e7", "<dl", ">750", "Not Detected". */
  value: string
  unit: string
  /** As printed: "< 1.00e3", "1.6e9 - 2.5e11", "> 200", "Negative". */
  reference: string
  note: string
}

export type StoolTest = { lab: string; collectedAt: string; accession: string; entries: StoolEntry[] }

export type StoolStatus = 'high' | 'low' | 'normal' | 'detected' | 'not_detected' | 'unknown'

export const STOOL_SECTIONS: Array<{ id: StoolSection; name: string }> = [
  { id: 'pathogen', name: 'Pathogens' },
  { id: 'h_pylori', name: 'H. pylori' },
  { id: 'commensal', name: 'Beneficial (commensal) bacteria' },
  { id: 'phyla', name: 'Bacterial phyla' },
  { id: 'overgrowth', name: 'Opportunistic and overgrowth bacteria' },
  { id: 'inflammatory', name: 'Inflammatory and autoimmune-related bacteria' },
  { id: 'fungi', name: 'Fungi and yeast' },
  { id: 'virus', name: 'Viruses' },
  { id: 'parasite', name: 'Parasites (protozoa)' },
  { id: 'worm', name: 'Worms' },
  { id: 'digestion', name: 'Digestion' },
  { id: 'gi_markers', name: 'GI markers' },
  { id: 'immune', name: 'Immune response' },
  { id: 'inflammation', name: 'Inflammation' },
  { id: 'barrier', name: 'Gut barrier' },
  { id: 'other', name: 'Other stool markers' },
]
export const stoolSectionName = (id: StoolSection) => STOOL_SECTIONS.find(section => section.id === id)?.name || 'Other stool markers'

const GE = 'GE/g'
const m = (id: string, name: string, section: StoolSection, kind: StoolKind, reference: string, unit = GE, aliases: string[] = []): StoolMarker => ({ id, name, section, kind, reference, unit, aliases })
const threshold = (id: string, name: string, section: StoolSection, limit: string, aliases: string[] = []) => m(id, name, section, 'threshold', `< ${limit}`, GE, aliases)
const presence = (id: string, name: string, section: StoolSection, reference = 'Not Detected', aliases: string[] = []) => m(id, name, section, 'presence', reference, '', aliases)

/** The GI-MAP (Diagnostic Solutions Laboratory) markers, with the references it prints. */
export const STOOL_MARKERS: StoolMarker[] = [
  // Pathogens
  threshold('campylobacter', 'Campylobacter', 'pathogen', '1.00e3'),
  threshold('c_diff_toxin_a', 'C. difficile Toxin A', 'pathogen', '1.00e3', ['c. difficile toxin a', 'clostridium difficile toxin a']),
  threshold('c_diff_toxin_b', 'C. difficile Toxin B', 'pathogen', '1.00e3', ['c. difficile toxin b', 'clostridium difficile toxin b']),
  threshold('ecoli_epec', 'E. coli EPEC/EHEC', 'pathogen', '1.00e3', ['e. coli - epec/ehec', 'epec', 'ehec']),
  threshold('ecoli_o157', 'E. coli O157', 'pathogen', '1.00e3'),
  threshold('eiec_shigella', 'Enteroinvasive E. coli/Shigella', 'pathogen', '1.00e3', ['shigella', 'eiec']),
  threshold('etec', 'Enterotoxigenic E. coli LT/ST', 'pathogen', '1.00e3', ['etec']),
  threshold('stec_stx1', 'Shiga-like Toxin E. coli stx1', 'pathogen', '1.00e3', ['stx1']),
  threshold('stec_stx2', 'Shiga-like Toxin E. coli stx2', 'pathogen', '1.00e3', ['stx2']),
  threshold('salmonella', 'Salmonella', 'pathogen', '1.00e4'),
  threshold('vibrio_cholerae', 'Vibrio cholerae', 'pathogen', '1.00e5'),
  threshold('yersinia', 'Yersinia enterocolitica', 'pathogen', '1.00e5', ['yersinia']),
  threshold('cryptosporidium', 'Cryptosporidium', 'pathogen', '1.00e6'),
  threshold('entamoeba_histolytica', 'Entamoeba histolytica', 'pathogen', '1.00e4'),
  threshold('giardia', 'Giardia', 'pathogen', '5.00e3'),
  threshold('adenovirus_40_41', 'Adenovirus 40/41', 'pathogen', '1.00e10', ['adenovirus']),
  threshold('norovirus', 'Norovirus GI/II', 'pathogen', '1.00e7', ['norovirus']),
  // H. pylori, its virulence factors and antibiotic resistance genes (reported only when it is positive)
  threshold('h_pylori', 'Helicobacter pylori', 'h_pylori', '1.00e3', ['h. pylori', 'helicobacter pylori']),
  ...['babA', 'cagA', 'dupA', 'iceA', 'oipA', 'vacA', 'virB', 'virD'].map(gene => presence(`h_pylori_${gene.toLowerCase()}`, `H. pylori virulence factor ${gene}`, 'h_pylori', 'Negative', [`virulence factor, ${gene.toLowerCase()}`, `virulence factor ${gene.toLowerCase()}`])),
  ...['Amoxicillin', 'Clarithromycin', 'Fluoroquinolones', 'Tetracycline'].map(drug => presence(`h_pylori_resist_${drug.toLowerCase()}`, `H. pylori ${drug} resistance`, 'h_pylori', 'Negative', [drug.toLowerCase()])),
  // Commensal / keystone bacteria
  m('bacteroides_fragilis', 'Bacteroides fragilis', 'commensal', 'range', '1.6e9 - 2.5e11'),
  m('bifidobacterium', 'Bifidobacterium spp.', 'commensal', 'range', '> 6.7e7', GE, ['bifidobacterium']),
  m('enterococcus', 'Enterococcus spp.', 'commensal', 'range', '1.9e5 - 2.0e8', GE, ['enterococcus']),
  m('escherichia', 'Escherichia spp.', 'commensal', 'range', '3.7e6 - 3.8e9', GE, ['escherichia']),
  m('lactobacillus', 'Lactobacillus spp.', 'commensal', 'range', '8.6e5 - 6.2e8', GE, ['lactobacillus']),
  m('enterobacter', 'Enterobacter spp.', 'commensal', 'range', '1.0e6 - 5.0e7', GE, ['enterobacter']),
  m('akkermansia', 'Akkermansia muciniphila', 'commensal', 'range', '1.0e1 - 8.2e6', GE, ['akkermansia']),
  m('faecalibacterium', 'Faecalibacterium prausnitzii', 'commensal', 'range', '1.0e3 - 5.0e8', GE, ['faecalibacterium']),
  m('roseburia', 'Roseburia spp.', 'commensal', 'range', '5.0e7 - 2.0e10', GE, ['roseburia']),
  // Bacterial phyla
  m('bacteroidetes', 'Bacteroidetes', 'phyla', 'range', '8.6e11 - 3.3e12'),
  m('firmicutes', 'Firmicutes', 'phyla', 'range', '5.7e10 - 3.0e11'),
  m('firmicutes_bacteroidetes_ratio', 'Firmicutes:Bacteroidetes Ratio', 'phyla', 'threshold', '< 1.0', 'ratio', ['f:b ratio', 'firmicutes/bacteroidetes ratio']),
  // Dysbiotic and overgrowth bacteria
  threshold('bacillus', 'Bacillus spp.', 'overgrowth', '1.76e6', ['bacillus']),
  threshold('enterococcus_faecalis', 'Enterococcus faecalis', 'overgrowth', '1.00e4'),
  threshold('enterococcus_faecium', 'Enterococcus faecium', 'overgrowth', '1.00e4'),
  threshold('morganella', 'Morganella spp.', 'overgrowth', '1.00e3', ['morganella']),
  threshold('pseudomonas', 'Pseudomonas spp.', 'overgrowth', '1.00e4', ['pseudomonas']),
  threshold('pseudomonas_aeruginosa', 'Pseudomonas aeruginosa', 'overgrowth', '5.00e2'),
  threshold('staphylococcus', 'Staphylococcus spp.', 'overgrowth', '1.00e4', ['staphylococcus']),
  threshold('staphylococcus_aureus', 'Staphylococcus aureus', 'overgrowth', '5.00e2', ['staph aureus']),
  threshold('streptococcus', 'Streptococcus spp.', 'overgrowth', '1.00e3', ['streptococcus']),
  threshold('desulfovibrio', 'Desulfovibrio spp.', 'overgrowth', '7.98e8', ['desulfovibrio']),
  threshold('methanobacteriaceae', 'Methanobacteriaceae (family)', 'overgrowth', '3.38e8', ['methanobacteriaceae']),
  // Inflammatory and autoimmune-related bacteria
  threshold('citrobacter', 'Citrobacter spp.', 'inflammatory', '5.00e6', ['citrobacter']),
  threshold('citrobacter_freundii', 'Citrobacter freundii', 'inflammatory', '5.00e5'),
  threshold('klebsiella', 'Klebsiella spp.', 'inflammatory', '5.00e3', ['klebsiella']),
  threshold('klebsiella_pneumoniae', 'Klebsiella pneumoniae', 'inflammatory', '5.00e4'),
  threshold('m_avium_paratuberculosis', 'M. avium subsp. paratuberculosis', 'inflammatory', '5.00e3', ['m. avium subsp. paratuberculosis', 'map']),
  threshold('proteus', 'Proteus spp.', 'inflammatory', '5.00e4', ['proteus']),
  threshold('proteus_mirabilis', 'Proteus mirabilis', 'inflammatory', '1.00e3'),
  threshold('fusobacterium', 'Fusobacterium spp.', 'inflammatory', '1.00e8', ['fusobacterium']),
  threshold('prevotella', 'Prevotella spp.', 'inflammatory', '1.00e8', ['prevotella']),
  // Fungi and yeast
  threshold('candida', 'Candida spp.', 'fungi', '5.00e3', ['candida']),
  threshold('candida_albicans', 'Candida albicans', 'fungi', '5.00e2'),
  threshold('geotrichum', 'Geotrichum spp.', 'fungi', '3.00e2', ['geotrichum']),
  threshold('microsporidium', 'Microsporidium spp.', 'fungi', '5.00e3', ['microsporidium']),
  threshold('rhodotorula', 'Rhodotorula spp.', 'fungi', '1.00e3', ['rhodotorula']),
  // Viruses
  threshold('cytomegalovirus', 'Cytomegalovirus', 'virus', '1.00e5', ['cmv']),
  threshold('epstein_barr', 'Epstein-Barr Virus', 'virus', '1.00e7', ['ebv', 'epstein barr virus']),
  // Parasites
  threshold('blastocystis', 'Blastocystis hominis', 'parasite', '2.00e3', ['blastocystis']),
  threshold('chilomastix', 'Chilomastix mesnili', 'parasite', '1.00e5'),
  threshold('cyclospora', 'Cyclospora spp.', 'parasite', '5.00e4', ['cyclospora']),
  threshold('dientamoeba', 'Dientamoeba fragilis', 'parasite', '1.00e5'),
  threshold('endolimax', 'Endolimax nana', 'parasite', '1.00e4'),
  threshold('entamoeba_coli', 'Entamoeba coli', 'parasite', '5.00e6'),
  threshold('pentatrichomonas', 'Pentatrichomonas hominis', 'parasite', '1.00e2'),
  presence('ancylostoma', 'Ancylostoma duodenale', 'worm'),
  presence('ascaris', 'Ascaris lumbricoides', 'worm'),
  presence('necator', 'Necator americanus', 'worm'),
  presence('trichuris', 'Trichuris trichiura', 'worm'),
  presence('taenia', 'Taenia spp.', 'worm', 'Not Detected', ['taenia']),
  // Intestinal health markers
  m('steatocrit', 'Steatocrit', 'digestion', 'threshold', '< 15', '%'),
  m('elastase', 'Elastase-1', 'digestion', 'range', '> 200', 'µg/g', ['elastase', 'pancreatic elastase', 'elastase 1']),
  m('beta_glucuronidase', 'β-Glucuronidase', 'gi_markers', 'threshold', '< 2486', 'U/mL', ['beta-glucuronidase', 'b-glucuronidase', 'beta glucuronidase']),
  m('occult_blood', 'Occult Blood (FIT)', 'gi_markers', 'threshold', '< 10', 'µg/g', ['occult blood - fit', 'occult blood', 'fit']),
  m('secretory_iga', 'Secretory IgA', 'immune', 'range', '510 - 2010', 'µg/g', ['secretory iga', 'siga']),
  m('anti_gliadin_iga', 'Anti-gliadin IgA', 'immune', 'threshold', '< 175', 'U/L', ['anti-gliadin iga', 'antigliadin iga']),
  m('eosinophil_activation_protein', 'Eosinophil Activation Protein (EDN, EPX)', 'immune', 'threshold', '< 2.34', 'µg/g', ['eosinophil activation protein', 'edn', 'epx']),
  m('calprotectin', 'Calprotectin', 'inflammation', 'threshold', '< 173', 'µg/g'),
  m('zonulin', 'Zonulin', 'barrier', 'threshold', '< 175', 'ng/g'),
]

export const stoolMarkerById = (id: string | null | undefined) => (id ? STOOL_MARKERS.find(marker => marker.id === id) : undefined) || null

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const lookup = new Map<string, StoolMarker>()
for (const marker of STOOL_MARKERS) for (const name of [marker.name, marker.id, ...(marker.aliases || [])]) if (!lookup.has(squash(name))) lookup.set(squash(name), marker)

/** The catalogue marker a laboratory's printed name refers to, if any. */
export function matchStoolMarker(name: string): StoolMarker | null {
  const key = squash(name)
  return lookup.get(key) || lookup.get(squash(name.replace(/\s*\(.*\)\s*$/, ''))) || null
}

export function createStoolEntry(marker: StoolMarker | null, overrides: Partial<StoolEntry> = {}): StoolEntry {
  return {
    markerId: marker?.id || null,
    name: marker?.name || '',
    section: marker?.section || 'other',
    value: '',
    unit: marker?.unit || '',
    reference: marker?.reference || '',
    note: '',
    ...overrides,
  }
}

export const emptyStoolTest = (): StoolTest => ({ lab: 'GI-MAP', collectedAt: '', accession: '', entries: [] })

// ---------------------------------------------------------------------------
// Reading a stool result

const NUMBER = /[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i

/** A printed number, including scientific notation ("2.10e7", "2.10 x 10^7"); null if there is none. */
export function parseStoolNumber(text: string): number | null {
  const cleaned = (text || '').replace(/,/g, '').replace(/\s*[x×]\s*10\^?\s*([-+]?\d+)/i, 'e$1')
  const match = cleaned.match(NUMBER)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

const NOT_DETECTED = /not\s*detected|negative|^\s*<\s*d\.?l\.?\s*$|below\s*(the\s*)?detect|^\s*nd\s*$/i
const DETECTED = /^\s*(detected|positive|present)\s*$/i

export type StoolRange = { low: number | null; high: number | null; inclusive: boolean }

/** "< 1.00e3", "> 6.7e7", "1.6e9 - 2.5e11", "≤ 15"; null when there is no number (e.g. "Negative"). */
export function parseStoolReference(text: string): StoolRange | null {
  const reference = (text || '').trim()
  if (!reference || NOT_DETECTED.test(reference)) return null
  const between = reference.replace(/,/g, '').match(new RegExp(`(${NUMBER.source})\\s*(?:-|–|to)\\s*(${NUMBER.source})`, 'i'))
  if (between) return { low: Number(between[1]), high: Number(between[2]), inclusive: true }
  const value = parseStoolNumber(reference)
  if (value === null) return null
  if (/^\s*(<|≤|less|under|below|up to)/i.test(reference)) return { low: null, high: value, inclusive: /≤|<=/.test(reference) }
  if (/^\s*(>|≥|more|over|above|at least)/i.test(reference)) return { low: value, high: null, inclusive: /≥|>=/.test(reference) }
  return null
}

/**
 * The status of a stool result against its printed reference. A result printed
 * below the detection limit counts as zero: not detected, or low where the
 * reference has a lower limit (a missing beneficial species).
 */
export function stoolStatus(entry: Pick<StoolEntry, 'value' | 'reference' | 'markerId'>): StoolStatus {
  const value = (entry.value || '').trim()
  if (!value || /^n\/?a$/i.test(value)) return 'unknown'
  const reference = parseStoolReference(entry.reference)
  const kind = stoolMarkerById(entry.markerId)?.kind
  if (NOT_DETECTED.test(value)) return reference?.low != null && reference.low > 0 ? 'low' : 'not_detected'
  if (DETECTED.test(value)) return 'detected'
  const number = parseStoolNumber(value)
  if (number === null) return 'unknown'
  // A printed "<x" or ">x" result sits just past x; that is enough to place it.
  const below = /^\s*</.test(value), above = /^\s*>/.test(value)
  if (!reference) return kind === 'presence' ? (number > 0 ? 'detected' : 'not_detected') : 'unknown'
  if (reference.high !== null && (above ? number >= reference.high : reference.inclusive ? number > reference.high : number >= reference.high)) return 'high'
  if (reference.low !== null && (below ? number <= reference.low : number < reference.low)) return 'low'
  return 'normal'
}

export const STOOL_STATUS_LABEL: Record<StoolStatus, string> = { high: 'High ↑', low: 'Low ↓', normal: 'In range', detected: 'Detected', not_detected: 'Not detected', unknown: '—' }

/** Out of range in a way the clinician should see: high, low, or detected. */
export const stoolOutOfRange = (status: StoolStatus) => status === 'high' || status === 'low' || status === 'detected'

/** Results that need a clinician's review before anything else: any pathogen, parasite or worm found, or H. pylori positive. */
export function stoolNeedsReview(entry: StoolEntry, status = stoolStatus(entry)) {
  return (entry.section === 'pathogen' || entry.section === 'parasite' || entry.section === 'worm' || entry.markerId === 'h_pylori') && (status === 'high' || status === 'detected')
}
