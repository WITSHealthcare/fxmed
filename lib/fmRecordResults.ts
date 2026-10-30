// Results already in a patient's EMR record, ready for an FM lab analysis:
// the investigation results saved on their Investigations tab, and the lab
// reports in their documents that have not been read yet.

import { createEntry, defaultRanges, matchBiomarker, type FmEntry, type Sex } from '@/lib/fmBiomarkers'

export type RecordResult = { test: string; result: string; unit: string; referenceRange: string }

/** A results report saved against the patient. */
export type RecordReport = {
  id: string
  title: string
  collectedAt: string
  reportedAt: string
  /** When the report was saved in the EMR. */
  savedAt: string
  results: RecordResult[]
}

/** A lab report file in the patient's documents whose results are not saved yet. */
export type RecordFile = { id: string; title: string; mimeType: string; fileSize: number | null; createdAt: string }

export type PatientRecordResults = { reports: RecordReport[]; files: RecordFile[] }

/** Reports saved within this many days of the newest count as one round of tests. */
const ROUND_DAYS = 31

const time = (value: string) => {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * The most recent round of tests: the newest report, and any others saved
 * within a month of it (a round is often reported in parts), newest first.
 */
export function latestRound(reports: RecordReport[]) {
  const sorted = [...reports].sort((a, b) => time(b.savedAt) - time(a.savedAt))
  if (!sorted.length) return []
  const newest = time(sorted[0].savedAt)
  return sorted.filter(report => newest - time(report.savedAt) <= ROUND_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * The reports' results as analysis entries, matched to the FM catalogue where
 * possible. Where a test appears in more than one report, the newest result
 * is used. Results without a number, such as "Negative", are left out, as the
 * analysis compares numbers against ranges.
 */
export function entriesFromReports(reports: RecordReport[], sex: Sex): FmEntry[] {
  const entries: FmEntry[] = []
  const seen = new Set<string>()
  const newestFirst = [...reports].sort((a, b) => time(b.savedAt) - time(a.savedAt))
  for (const report of newestFirst) {
    for (const row of report.results) {
      const name = (row.test || '').trim()
      const value = (row.result || '').trim()
      if (!name || !/\d/.test(value)) continue
      const marker = matchBiomarker(name)
      const key = marker?.id || name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
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
    }
  }
  return entries
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
 * What to bring into a new analysis on its own: the latest saved results, or,
 * when the newest lab report in the documents has no saved results and is
 * more recent than them, that report, to be read.
 */
export function newestResults(record: PatientRecordResults): { reports: RecordReport[]; files: RecordFile[] } {
  const reports = latestRound(record.reports)
  const files = latestFiles(record.files)
  const reportTime = reports.length ? time(reports[0].savedAt) : -Infinity
  const fileTime = files.length ? time(files[0].createdAt) : -Infinity
  return fileTime > reportTime ? { reports: [], files } : { reports, files: [] }
}

/** How many of a report's results can go into the analysis. */
export function usableResults(report: RecordReport) {
  return report.results.filter(row => (row.test || '').trim() && /\d/.test(row.result || '')).length
}
