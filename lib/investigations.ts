// Investigation orders and results, as the EMR API returns them and the
// clinical workspace shows them. Shared by the server routes and the UI.
//
// An order is an investigation request form (investigation_forms). It waits
// for results until a results report (investigation_results) is saved against
// it. The lab's own report, when uploaded, is an EMR document linked to the
// order.

import { resultTestKey } from './investigationResultCatalog'
import type { InvestigationResult, InvestigationResultFlag } from './investigationResultPdf'

export type InvestigationOrderStatus = 'awaiting_results' | 'completed' | 'cancelled'

export type InvestigationPatientSnapshot = {
  fullName: string
  email: string
  phone: string
  age: string
  gender: string
}

export type InvestigationOrder = {
  id: string
  panelTitle: string
  tests: string[]
  clinicalDetails: string
  requestingClinician: string
  /** Null for forms made before orders were tracked. */
  status: InvestigationOrderStatus | null
  createdAt: string
  completedAt: string | null
  createdByEmail: string | null
  downloadName: string
  patientId: string | null
  patient: InvestigationPatientSnapshot
  /** Present when the patient record is joined in. */
  mrn?: string
}

export type InvestigationReportMeta = {
  reportTitle: string
  specimen: string
  collectedAt: string
  reportedAt: string
  clinician: string
  notes: string
}

export type InvestigationReport = {
  id: string
  orderId: string | null
  patientId: string | null
  patient: InvestigationPatientSnapshot
  reportMeta: InvestigationReportMeta
  results: InvestigationResult[]
  downloadName: string
  createdAt: string
  updatedAt: string | null
  createdByEmail: string | null
}

export type LabReportFile = {
  id: string
  orderId: string | null
  title: string
  originalName: string
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

/** Columns for listing orders. The stored PDF is fetched only on download. */
export const ORDER_COLUMNS = 'id,download_name,patient,panel_title,tests,status,completed_at,created_at,created_by_email,emr_patient_id'
export const REPORT_COLUMNS = 'id,download_name,patient,report_meta,results,emr_patient_id,investigation_form_id,created_at,updated_at,created_by_email'

export const DEFAULT_REPORT_TITLE = 'Laboratory Investigation Report'
export const RESULT_FLAGS: InvestigationResultFlag[] = ['Normal', 'High', 'Low', 'Abnormal']

const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const object = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return {} }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function normalizePatientSnapshot(value: unknown): InvestigationPatientSnapshot {
  const item = object(value)
  return { fullName: text(item.fullName, 240), email: text(item.email, 240), phone: text(item.phone, 80), age: text(item.age, 40), gender: text(item.gender, 40) }
}

export function normalizeReportMeta(value: unknown): InvestigationReportMeta {
  const item = object(value)
  return {
    reportTitle: text(item.reportTitle, 240) || DEFAULT_REPORT_TITLE,
    specimen: text(item.specimen, 240),
    collectedAt: text(item.collectedAt, 80),
    reportedAt: text(item.reportedAt, 80),
    clinician: text(item.clinician, 240),
    notes: text(item.notes, 8000),
  }
}

/** Rows without a test name or a result are dropped: they report nothing. */
export function normalizeResults(value: unknown): InvestigationResult[] {
  if (!Array.isArray(value)) return []
  return value.map(entry => {
    const item = object(entry)
    const flag = text(item.flag) as InvestigationResultFlag
    return {
      section: text(item.section, 160),
      test: text(item.test, 240),
      result: text(item.result, 2000),
      unit: text(item.unit, 80),
      referenceRange: text(item.referenceRange, 240),
      flag: RESULT_FLAGS.includes(flag) ? flag : '',
      remark: text(item.remark, 2000),
    }
  }).filter(row => row.test && row.result)
}

function testNames(value: unknown): string[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return [] }
  }
  if (!Array.isArray(value)) return []
  return value.map(test => text(object(test).name, 240)).filter(Boolean)
}

export function mapOrderRow(row: Record<string, any>): InvestigationOrder {
  const patient = object(row.patient)
  const record = object(row.emr_patient)
  return {
    id: row.id,
    panelTitle: text(row.panel_title) || 'Investigation request',
    tests: testNames(row.tests),
    clinicalDetails: text(patient.clinicalDetails, 8000),
    requestingClinician: text(patient.requestingClinician, 240),
    status: row.status || null,
    createdAt: row.created_at,
    completedAt: row.completed_at || null,
    createdByEmail: row.created_by_email || null,
    downloadName: text(row.download_name) || 'fxmed-investigation-request-form.pdf',
    patientId: row.emr_patient_id || null,
    patient: normalizePatientSnapshot(patient),
    ...(typeof record.mrn === 'string' ? { mrn: record.mrn } : {}),
  }
}

export function mapReportRow(row: Record<string, any>): InvestigationReport {
  return {
    id: row.id,
    orderId: row.investigation_form_id || null,
    patientId: row.emr_patient_id || null,
    patient: normalizePatientSnapshot(row.patient),
    reportMeta: normalizeReportMeta(row.report_meta),
    results: normalizeResults(row.results),
    downloadName: text(row.download_name) || 'fxmed-investigation-results.pdf',
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    createdByEmail: row.created_by_email || null,
  }
}

export function mapLabReportFile(row: Record<string, any>): LabReportFile {
  return {
    id: row.id,
    orderId: row.investigation_form_id || null,
    title: row.title,
    originalName: row.original_name,
    mimeType: row.mime_type || null,
    fileSize: row.file_size ?? null,
    createdAt: row.created_at,
  }
}

/** A filesystem-safe base for download names, from the patient's name. */
export function downloadBase(fullName: string, fallback: string) {
  return fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback
}

/**
 * Lab results merged into what is already entered. Values already typed are
 * kept; tests still blank are replaced by what the lab reported, and the ones
 * the lab did not report are returned as missing.
 */
export function mergeLabResults(current: InvestigationResult[], extracted: InvestigationResult[]) {
  const merged = current.filter(row => row.result.trim())
  const blank = current.filter(row => row.test.trim() && !row.result.trim())
  const keys = new Set(merged.map(row => resultTestKey(row.test)))
  let kept = 0
  for (const row of extracted) {
    const key = resultTestKey(row.test)
    if (keys.has(key)) { kept++; continue }
    keys.add(key)
    const expected = blank.find(item => resultTestKey(item.test) === key)
    merged.push(expected ? { ...row, section: expected.section || row.section } : row)
  }
  const found = new Set(extracted.map(row => resultTestKey(row.test)))
  return { rows: merged, kept, missing: blank.map(row => row.test).filter(test => !found.has(resultTestKey(test))) }
}
