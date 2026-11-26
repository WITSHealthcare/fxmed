// Results already in a patient's EMR record, ready for a Functional Health Analysis lab report:
// the investigation results saved on their Investigations tab, and the lab
// reports in their documents that have not been read yet.

import { createEntry, defaultRanges, isUsableResult, matchBiomarker, type FmEntry, type Sex } from '@/lib/fmBiomarkers'

export type RecordResult = { test: string; result: string; unit: string; referenceRange: string }

/** A results report saved against the patient. */
export type RecordReport = {
  id: string
  title: string
  collectedAt: string
  reportedAt: string
  /** When the report was first saved in the EMR. */
  createdAt: string
  /** When the report was last saved in the EMR, edits included. */
  savedAt: string
  results: RecordResult[]
}

/** A lab report file in the patient's documents whose results are not saved yet. */
export type RecordFile = { id: string; title: string; mimeType: string; fileSize: number | null; createdAt: string }

export type PatientRecordResults = { reports: RecordReport[]; files: RecordFile[] }

const time = (value: string) => {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * A date as a lab prints it: 2026-03-12, 12/03/2026 (day first, as Nigerian
 * labs print it), 12 Mar 2026 or Mar 12, 2026. Null when it cannot be read.
 */
function printedDate(value: string): number | null {
  const text = (value || '').trim().toLowerCase()
  const month = (name: string) => MONTHS.indexOf(name.slice(0, 3)) + 1
  let match: RegExpMatchArray | null
  let parts: [year: number, month: number, day: number] | null = null
  if ((match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/))) parts = [+match[1], +match[2], +match[3]]
  else if ((match = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/))) parts = [+match[3], +match[2], +match[1]]
  else if ((match = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s/.,-]*([a-z]{3,9})\.?[\s/.,-]*(\d{4})\b/))) parts = [+match[3], month(match[2]), +match[1]]
  else if ((match = text.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/))) parts = [+match[3], month(match[1]), +match[2]]
  if (!parts) return null
  const [year, monthNumber, day] = parts
  if (monthNumber < 1 || monthNumber > 12 || day < 1 || day > 31) return null
  return Date.UTC(year < 100 ? 2000 + year : year, monthNumber - 1, day)
}

/**
 * When a report's readings were taken: the collection date printed on it,
 * else the report date, else when it was first saved. Editing a report later
 * does not make its readings newer.
 */
const readingTime = (report: RecordReport) =>
  printedDate(report.collectedAt) ?? printedDate(report.reportedAt) ?? time(report.createdAt)

/**
 * The most recent reading of every test in the reports, as analysis entries,
 * matched to the FM catalogue where possible, with the reports they came
 * from, newest first. With `since`, only readings saved or edited after it are
 * returned: each still the most recent of its test, so a newer reading
 * elsewhere is never replaced by an older one.
 *
 * Results without a number, such as "Negative", are left out, except for
 * markers labs report in words (H. pylori), which are read as words.
 */
export function latestReadings(reports: RecordReport[], sex: Sex, since: string | null = null) {
  const entries: FmEntry[] = []
  const from: RecordReport[] = []
  const seen = new Set<string>()
  const after = since ? time(since) : -Infinity
  const newestFirst = [...reports].sort((a, b) => readingTime(b) - readingTime(a) || time(b.createdAt) - time(a.createdAt))
  for (const report of newestFirst) {
    const isNew = time(report.savedAt) > after
    let used = false
    for (const row of report.results) {
      const name = (row.test || '').trim()
      const value = (row.result || '').trim()
      const marker = matchBiomarker(name)
      if (!name || !isUsableResult(marker, value)) continue
      const key = marker?.id || name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      if (!isNew) continue
      const unit = (row.unit || '').trim()
      const fallback = marker ? defaultRanges(marker, unit, sex) : null
      entries.push(createEntry(marker, sex, {
        ...(marker ? {} : { name }),
        value,
        unit: unit || marker?.unit || '',
        // The lab's own printed range wins; the catalogue fills a gap.
        labRange: (row.referenceRange || '').trim() || fallback?.lab || '',
        fmRange: fallback?.fm || '',
      }))
      used = true
    }
    if (used) from.push(report)
  }
  return { entries, reports: from }
}

// A lab report is often uploaded as several files (a photo of each page),
// so files added within this many days of the newest are read together.
const FILE_ROUND_DAYS = 14
const MAX_ROUND_FILES = 5
// Under the server's 15 MB limit for reading files together.
const MAX_ROUND_BYTES = 14 * 1024 * 1024
const DAY_MS = 24 * 60 * 60 * 1000

/** The newest lab report files, newest first, as many as can be read together. */
export function latestFiles(files: RecordFile[]) {
  const sorted = [...files].sort((a, b) => time(b.createdAt) - time(a.createdAt))
  const picked: RecordFile[] = []
  let bytes = 0
  for (const file of sorted) {
    if (time(sorted[0].createdAt) - time(file.createdAt) > FILE_ROUND_DAYS * DAY_MS) break
    if (picked.length >= MAX_ROUND_FILES) break
    if (picked.length && bytes + (file.fileSize || 0) > MAX_ROUND_BYTES) break
    picked.push(file)
    bytes += file.fileSize || 0
  }
  return picked
}

/**
 * The newest lab report files in the documents that are worth reading on
 * their own: added after every saved result (so newer than any of them),
 * and, with `since`, after it too.
 */
export function newerFiles(record: PatientRecordResults, since: string | null = null) {
  const after = Math.max(since ? time(since) : -Infinity, ...record.reports.map(report => time(report.createdAt)))
  return latestFiles(record.files).filter(file => time(file.createdAt) > after)
}

/** How many of a report's results can go into the analysis. */
export function usableResults(report: RecordReport) {
  return report.results.filter(row => (row.test || '').trim() && isUsableResult(matchBiomarker(row.test || ''), row.result || '')).length
}
