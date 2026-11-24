// The FXMed Lab Library: a public page for every marker in the Functional
// Health Analysis catalogue. Everything is drawn from the same sources the lab
// report uses (lib/fmBiomarkers.ts for ranges, lib/fmMarkerInfo.ts for the
// plain-English explanations, lib/fmAssessment.ts for where a marker counts),
// so the website and the report never disagree.

import { AREA_GROUPS, AREAS, CALCULATED_FROM, type AreaGroup } from './fmAssessment'
import { alternateUnits, FM_BIOMARKERS, FM_PANELS, markerById, panelById, type Biomarker, type PanelId } from './fmBiomarkers'
import { MARKER_INFO } from './fmMarkerInfo'

type Pair = [number | null, number | null]

export const LAB_LIBRARY_PATH = '/lab-library'
/** When the library's content last meaningfully changed, for the sitemap. Update with the ranges or explanations. */
export const LAB_LIBRARY_UPDATED = '2026-11-24'

export const markerSlug = (id: string) => id.replace(/_/g, '-')
export const markerPath = (id: string) => `${LAB_LIBRARY_PATH}/${markerSlug(id)}`
export const markerBySlug = (slug: string) => FM_BIOMARKERS.find(marker => markerSlug(marker.id) === slug) || null

/** "mg/dl" as people write it: "mg/dL". */
export function prettyUnit(unit: string) {
  return unit.replace(/dl$/, 'dL').replace(/ml$/, 'mL').replace(/(^|\/)l$/, '$1L').replace(/^l\//, 'L/')
}

/** A unit to print after a number; "index" and "ratio" are left off. */
export const unitSuffix = (unit: string) => /^(index|ratio)$/i.test(unit) ? '' : ` ${unit}`

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

/** The names a lab may print, without ones that only restate the marker's own name. */
export const displayAliases = (marker: Biomarker) => (marker.aliases || []).filter((alias, index, all) =>
  squash(alias) !== squash(marker.name) && all.findIndex(other => squash(other) === squash(alias)) === index)

const trim = (value: number) => Number(value.toPrecision(3)).toString()

/** A range in words: "4.6–6.2", "below 1.5", "above 1.2". A lower limit of 0 reads as "below". */
export function rangeText([low, high]: Pair, factor = 1) {
  const lo = low === null || low === 0 ? null : trim(low * factor)
  const hi = high === null ? null : trim(high * factor)
  if (lo !== null && hi !== null) return `${lo}–${hi}`
  if (hi !== null) return `below ${hi}`
  if (lo !== null) return `above ${lo}`
  return '—'
}

export type RangeRow = { who: string; lab: Pair; fm: Pair }

/** The adult ranges, split by sex where the catalogue does. */
export function rangeRows(marker: Biomarker): RangeRow[] {
  const rows: RangeRow[] = []
  if (marker.female || marker.male) {
    rows.push({ who: 'Women', lab: marker.female?.lab || marker.lab, fm: marker.female?.fm || marker.fm })
    rows.push({ who: 'Men', lab: marker.male?.lab || marker.lab, fm: marker.male?.fm || marker.fm })
  } else rows.push({ who: 'Adults', lab: marker.lab, fm: marker.fm })
  return rows
}

/** The first sentence of a marker's explanation, for cards and descriptions. */
export const shortAbout = (id: string) => (MARKER_INFO[id]?.about || '').split(/(?<=\.)\s/)[0]

/** Markers that are the same test reported another way. */
const SAME_TEST: Record<string, string> = { bun: 'urea', hba1c_ifcc: 'hba1c' }

export type AreaUse = { name: string; group: AreaGroup; direction: 'high' | 'low' | 'any'; key: boolean }

/** The body systems, processes and care plan areas a marker feeds into, strongest first. */
export function areaUses(id: string): AreaUse[] {
  const lookup = SAME_TEST[id] || id
  const uses = new Map<string, AreaUse>()
  for (const area of AREAS) {
    for (const rule of area.rules) {
      if (rule.id !== lookup && rule.id !== id) continue
      const existing = uses.get(area.id)
      const direction = existing && existing.direction !== rule.dir ? 'any' : rule.dir
      uses.set(area.id, { name: area.name, group: area.group, direction, key: (existing?.key ?? false) || rule.weight >= 2 })
    }
  }
  return Array.from(uses.values()).sort((a, b) => Number(b.key) - Number(a.key))
}

export const AREA_GROUP_TITLE = (group: AreaGroup) => AREA_GROUPS[group].title

export type LibraryMarker = {
  id: string
  slug: string
  name: string
  aliases: string[]
  panel: PanelId
  panelName: string
  unit: string
  optimal: string
  summary: string
}

/** Every marker, in catalogue order, for the library index. */
export function libraryMarkers(): LibraryMarker[] {
  return FM_BIOMARKERS.map(marker => ({
    id: marker.id,
    slug: markerSlug(marker.id),
    name: marker.name,
    aliases: marker.aliases || [],
    panel: marker.panel,
    panelName: panelById(marker.panel).name,
    unit: marker.unit,
    optimal: marker.fmFromLab ? 'your lab\'s cut-off' : rangeRows(marker).length > 1
      ? rangeRows(marker).map(row => `${row.who.toLowerCase()} ${rangeText(row.fm)}${unitSuffix(marker.unit)}`).join(' · ')
      : `${rangeText(marker.fm)}${unitSuffix(marker.unit)}`,
    summary: shortAbout(marker.id),
  }))
}

/** Panels that have markers, in report order. */
export const libraryPanels = () => FM_PANELS.filter(panel => FM_BIOMARKERS.some(marker => marker.panel === panel.id))

/** What a calculated marker is worked out from, by name. */
export const calculatedFrom = (id: string) => (CALCULATED_FROM[id] || []).map(input => markerById(input)).filter((marker): marker is Biomarker => !!marker)

/** The marker's results in other common units, for patients whose lab reports them differently. */
export function otherUnits(marker: Biomarker) {
  return alternateUnits(marker.id).map(({ unit, factor }) => ({
    unit: prettyUnit(unit),
    rows: rangeRows(marker).map(row => ({ who: row.who, lab: rangeText(row.lab, factor), fm: marker.fmFromLab ? '—' : rangeText(row.fm, factor) })),
  }))
}

/** Other markers on the same panel, for "related markers". */
export const relatedMarkers = (marker: Biomarker) => FM_BIOMARKERS.filter(item => item.id !== marker.id && (item.panel === marker.panel || marker.alsoIn?.includes(item.panel))).slice(0, 8)
