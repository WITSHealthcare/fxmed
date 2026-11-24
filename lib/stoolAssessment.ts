// What a stool test says, as a handful of gut findings: each one a status
// (flag / watch / clear / not tested), the results behind it and a plain line
// of text. Done by rules, never by the model, so it is reproducible. Stool
// findings sit beside the blood areas and never change their scores; where an
// area takes a stool finding into account it shows the higher of the two, with
// its source (option A in docs/gi-map-module-plan.md).
//
// The wording and thresholds here need a clinician's sign-off before release.

import { stoolNeedsReview, stoolStatus, type StoolEntry, type StoolSection, type StoolStatus, type StoolTest } from './stoolMarkers'

export type GutTone = 'flag' | 'watch' | 'clear' | 'nodata'
export type GutFindingId = 'pathogen' | 'h_pylori' | 'beneficial' | 'overgrowth' | 'yeast_parasites' | 'digestion' | 'immune' | 'inflammation' | 'barrier'
export type GutResult = { entry: StoolEntry; status: StoolStatus }

export type GutFinding = {
  id: GutFindingId
  title: string
  tone: GutTone
  /** One line on what was found; empty when nothing stood out. */
  summary: string
  /** The results outside reference that set the status. */
  results: GutResult[]
  /** True when a clinician must review before anything else (pathogen, parasite, H. pylori, blood). */
  review: boolean
}

export type GutAssessment = { tested: boolean; findings: GutFinding[]; review: GutResult[] }

const RANK: Record<GutTone, number> = { flag: 3, watch: 2, clear: 1, nodata: 0 }
export const worstTone = (tones: GutTone[]): GutTone => tones.reduce<GutTone>((worst, tone) => RANK[tone] > RANK[worst] ? tone : worst, 'nodata')

const out = (status: StoolStatus) => status === 'high' || status === 'low' || status === 'detected'
const names = (results: GutResult[]) => results.map(({ entry, status }) => `${entry.name} ${status === 'low' ? '↓' : status === 'detected' ? '(detected)' : '↑'}`).join(', ')
const times = (entry: StoolEntry, limit: number) => {
  const value = Number((entry.value.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i) || [])[0])
  return Number.isFinite(value) && limit > 0 ? value / limit : 0
}

/** The gut findings from a stool test. Each finding is "not tested" when none of its markers has a result. */
export function assessStool(test: StoolTest | null): GutAssessment {
  const results: GutResult[] = (test?.entries || []).filter(entry => entry.value.trim()).map(entry => ({ entry, status: stoolStatus(entry) })).filter(result => result.status !== 'unknown')
  const inSections = (...sections: StoolSection[]) => results.filter(result => sections.includes(result.entry.section))
  const byId = (...ids: string[]) => results.filter(result => ids.includes(result.entry.markerId || ''))
  const findings: GutFinding[] = []
  const add = (id: GutFindingId, title: string, measured: GutResult[], decide: (found: GutResult[]) => { tone: Exclude<GutTone, 'nodata'>; summary: string; review?: boolean }) => {
    if (!measured.length) { findings.push({ id, title, tone: 'nodata', summary: '', results: [], review: false }); return }
    const found = measured.filter(result => out(result.status))
    const { tone, summary, review = false } = decide(found)
    findings.push({ id, title, tone, summary, results: found, review })
  }

  add('pathogen', 'Pathogens', inSections('pathogen'), found => found.length
    ? { tone: 'flag', review: true, summary: `${names(found)} above the lab's threshold. Review with the clinician; symptoms decide what it means.` }
    : { tone: 'clear', summary: '' })

  const pylori = byId('h_pylori')
  add('h_pylori', 'H. pylori', pylori, found => {
    if (!found.length) return { tone: 'clear', summary: '' }
    const virulence = byId('h_pylori_baba', 'h_pylori_caga', 'h_pylori_dupa', 'h_pylori_icea', 'h_pylori_oipa', 'h_pylori_vaca', 'h_pylori_virb', 'h_pylori_vird').filter(result => out(result.status))
    return virulence.length
      ? { tone: 'flag', review: true, summary: `H. pylori above the lab's threshold, with virulence factors (${virulence.map(result => result.entry.name.replace('H. pylori virulence factor ', '')).join(', ')}). Review with the clinician.` }
      : { tone: 'watch', review: true, summary: 'H. pylori above the lab\'s threshold. Review with the clinician.' }
  })

  add('beneficial', 'Beneficial bacteria', [...inSections('commensal'), ...byId('bacteroidetes', 'firmicutes')], found => {
    const low = found.filter(result => result.status === 'low')
    return !low.length ? { tone: 'clear', summary: '' }
      : { tone: low.length >= 3 ? 'flag' : 'watch', summary: `Low ${names(low).replace(/ ↓/g, '').replace(/\.$/, '')}. Fewer of the bacteria that protect the gut lining and make short-chain fatty acids.` }
  })

  add('overgrowth', 'Overgrowth and dysbiosis', [...inSections('overgrowth', 'inflammatory'), ...byId('escherichia', 'enterococcus', 'enterobacter', 'firmicutes_bacteroidetes_ratio')], found => {
    const high = found.filter(result => result.status === 'high')
    return !high.length ? { tone: 'clear', summary: '' }
      : { tone: high.length >= 3 ? 'flag' : 'watch', summary: `${names(high)}. More opportunistic or inflammatory bacteria than the lab expects.` }
  })

  add('yeast_parasites', 'Yeast and parasites', inSections('fungi', 'parasite', 'worm'), found => {
    if (!found.length) return { tone: 'clear', summary: '' }
    const parasites = found.filter(result => result.entry.section !== 'fungi')
    return parasites.length
      ? { tone: 'flag', review: true, summary: `${names(found)}. Review with the clinician.` }
      : { tone: 'watch', summary: `${names(found)}. More yeast than the lab expects.` }
  })

  add('digestion', 'Digestion and absorption', inSections('digestion'), found => {
    const elastase = found.find(result => result.entry.markerId === 'elastase' && result.status === 'low')
    const severe = elastase && times(elastase.entry, 1) < 100
    return !found.length ? { tone: 'clear', summary: '' }
      : { tone: severe ? 'flag' : 'watch', summary: `${names(found)}. ${elastase ? 'Lower pancreatic enzyme output' : 'Fat reaching the stool'}, so food may not be fully broken down.` }
  })

  add('immune', 'Gut immune response', byId('secretory_iga', 'eosinophil_activation_protein'), found => !found.length ? { tone: 'clear', summary: '' }
    : { tone: 'watch', summary: `${names(found)}. The gut's immune defences are ${found.some(result => result.status === 'low') ? 'running low' : 'more active than usual'}.` })

  add('inflammation', 'Gut inflammation', [...inSections('inflammation'), ...byId('occult_blood')], found => {
    if (!found.length) return { tone: 'clear', summary: '' }
    const blood = found.some(result => result.entry.markerId === 'occult_blood')
    const calprotectin = found.find(result => result.entry.markerId === 'calprotectin')
    const strong = blood || (calprotectin && times(calprotectin.entry, 173) >= 2)
    return { tone: strong ? 'flag' : 'watch', review: blood, summary: `${names(found)}. ${blood ? 'Blood in the stool needs the clinician\'s review. ' : ''}Inflammation in the gut lining.` }
  })

  add('barrier', 'Gut barrier', byId('zonulin', 'anti_gliadin_iga'), found => !found.length ? { tone: 'clear', summary: '' }
    : { tone: found.length >= 2 ? 'flag' : 'watch', summary: `${names(found)}. Signs the gut lining is more permeable${found.some(result => result.entry.markerId === 'anti_gliadin_iga') ? ', with a reaction to gluten' : ''}.` })

  return {
    tested: results.length > 0,
    findings,
    // The results themselves that need review, not everything in a finding that does.
    review: findings.filter(finding => finding.review).flatMap(finding => finding.results)
      .filter(result => stoolNeedsReview(result.entry, result.status) || result.entry.markerId === 'occult_blood'),
  }
}

/**
 * The report areas each gut finding adds evidence to. An area keeps its blood
 * score; it shows the higher of its blood status and these findings, labelled
 * with the stool source.
 */
export const GUT_AREAS: Record<string, GutFindingId[]> = {
  digestion: ['pathogen', 'h_pylori', 'beneficial', 'overgrowth', 'yeast_parasites', 'digestion', 'barrier'],
  protein_digestion: ['digestion'],
  inflammation: ['inflammation'],
  chronic_inflammation: ['inflammation'],
  immune: ['immune', 'pathogen'],
  immune_resilience: ['immune'],
}

/** The stool evidence for a report area: the worst related finding, and which findings stood out. */
export function gutEvidence(assessment: GutAssessment, areaId: string) {
  const related = assessment.findings.filter(finding => (GUT_AREAS[areaId] || []).includes(finding.id) && finding.tone !== 'nodata')
  if (!related.length) return null
  const notable = related.filter(finding => finding.tone === 'flag' || finding.tone === 'watch')
  return { tone: worstTone(related.map(finding => finding.tone)), findings: notable }
}
