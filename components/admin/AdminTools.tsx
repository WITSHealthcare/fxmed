'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CORE_PANEL_TESTS,
  INVESTIGATION_CATALOG,
  generateInvestigationFormPdf,
  type InvestigationTest,
} from '@/lib/investigationFormPdf'
import { generateInvestigationResultPdf, type InvestigationResult } from '@/lib/investigationResultPdf'
import InvestigationResultsEditor from './InvestigationResultsEditor'

type FormatterStatus = 'idle' | 'working' | 'success' | 'error'
type ActiveTool = 'letterhead' | 'meal-plan' | 'investigation' | 'investigation-results'
type AdminToolsScope = 'operations' | 'investigations'

type ToolHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  document: Blob
}

type InvestigationPatient = {
  fullName: string
  email: string
  phone: string
  age: string
  gender: string
  emrPatientId?: string
}

type EmrPatientOption = {
  id: string
  mrn: string
  first_name: string
  middle_name?: string | null
  last_name: string
  date_of_birth: string
  sex: string
  email?: string | null
  phone?: string | null
}

type InvestigationPatientContext = EmrPatientOption

type InvestigationHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  documentBase64: string
  patient: InvestigationPatient
  clinicalDetails?: string
  panelTitle: string
  tests: InvestigationTest[]
  createdByEmail?: string
}

type InvestigationResultHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  documentBase64: string
  patient: InvestigationPatient
  reportMeta: typeof initialResultMeta
  results: InvestigationResult[]
  createdByEmail?: string
}

type FormattedDocument = {
  blob: Blob
  downloadName: string
}

type OutputFormat = 'docx' | 'pdf'

const HISTORY_DB_NAME = 'fxmed-admin-tools'
const LETTERHEAD_HISTORY_STORE_NAME = 'letterhead-documents'
const MEAL_PLAN_HISTORY_STORE_NAME = 'meal-plan-documents'
const PARTNER_LABORATORIES = ['Mecure', 'Synlab'] as const
const INVESTIGATION_FORMS_API = '/api/admin/tools/investigation-forms'
const INVESTIGATION_RESULTS_API = '/api/admin/tools/investigation-results'
const EMR_PATIENTS_API = '/api/admin/emr'
const initialResultMeta = { reportTitle: 'Laboratory Investigation Report', specimen: '', collectedAt: '', reportedAt: '', clinician: '', notes: '' }

function makeInvestigationDownloadName(fullName: string) {
  const baseName = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${baseName || 'investigation'}-fxmed-request-form.pdf`
}

function makeDownloadName(filename: string, outputFormat: OutputFormat) {
  const baseName = filename.replace(/\.(docx|pdf)$/i, '').trim() || 'document'
  return `${baseName}-fxmed-letterhead.${outputFormat}`
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function emrPatientName(patient: EmrPatientOption) {
  return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')
}

function formatPatientAge(dob: string, today = new Date()) {
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > today) return ''

  let years = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months--
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`

  const birthUtc = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.floor((todayUtc - birthUtc) / 86_400_000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, contentType = 'application/pdf') {
  const bytes = atob(base64)
  const chunks: BlobPart[] = []

  for (let offset = 0; offset < bytes.length; offset += 1024) {
    const slice = bytes.slice(offset, offset + 1024)
    const values = new Uint8Array(slice.length)
    for (let i = 0; i < slice.length; i += 1) values[i] = slice.charCodeAt(i)
    chunks.push(values.buffer.slice(values.byteOffset, values.byteOffset + values.byteLength) as ArrayBuffer)
  }

  return new Blob(chunks, { type: contentType })
}

function normalizeInvestigationTests(value: unknown): InvestigationTest[] {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }

  if (!Array.isArray(value)) return []

  return value
    .map((test) => {
      const item = test && typeof test === 'object' ? test as Record<string, unknown> : {}
      return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        description: typeof item.description === 'string' ? item.description.trim() : '',
      }
    })
    .filter((test) => test.name)
}

function splitInvestigationList(value: string) {
  const cleanItem = (item: string) => item
    .replace(/^\s*(?:[-•–—*]|☐|☑|✓|\d+[.)])\s*/, '')
    .trim()

  const lines = value.split(/\r?\n/).map(cleanItem).filter(Boolean)
  if (lines.length > 1) return lines

  const source = lines[0] || ''
  if (source.includes(';')) return source.split(';').map(cleanItem).filter(Boolean)

  const items: string[] = []
  let current = ''
  let parentheses = 0
  for (const character of source) {
    if (character === '(') parentheses++
    if (character === ')') parentheses = Math.max(0, parentheses - 1)
    if (character === ',' && parentheses === 0) {
      if (cleanItem(current)) items.push(cleanItem(current))
      current = ''
    } else {
      current += character
    }
  }
  if (cleanItem(current)) items.push(cleanItem(current))
  return items
}

function openHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, 4)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LETTERHEAD_HISTORY_STORE_NAME)) {
        db.createObjectStore(LETTERHEAD_HISTORY_STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(MEAL_PLAN_HISTORY_STORE_NAME)) {
        db.createObjectStore(MEAL_PLAN_HISTORY_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getStoredHistory(storeName: string) {
  const db = await openHistoryDb()

  return new Promise<ToolHistoryItem[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      const items = request.result as ToolHistoryItem[]
      resolve(items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()))
      db.close()
    }
    request.onerror = () => {
      reject(request.error)
      db.close()
    }
  })
}

async function saveHistoryItem(storeName: string, item: ToolHistoryItem) {
  const db = await openHistoryDb()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onsuccess = () => {
      resolve()
      db.close()
    }
    request.onerror = () => {
      reject(request.error)
      db.close()
    }
  })
}

async function deleteHistoryItem(storeName: string, id: string) {
  const db = await openHistoryDb()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
      db.close()
    }
    request.onerror = () => {
      reject(request.error)
      db.close()
    }
  })
}

export default function AdminTools({ scope = 'operations', patientContext }: { scope?: AdminToolsScope; patientContext?: InvestigationPatientContext }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mealPlanInputRef = useRef<HTMLInputElement | null>(null)
  const investFormRef = useRef<HTMLDivElement | null>(null)
  const resultPdfInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>(scope === 'investigations' ? 'investigation-results' : 'letterhead')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<FormatterStatus>('idle')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ToolHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [formattedDocument, setFormattedDocument] = useState<FormattedDocument | null>(null)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf')
  const [selectedMealPlanFile, setSelectedMealPlanFile] = useState<File | null>(null)
  const [mealPlanStatus, setMealPlanStatus] = useState<FormatterStatus>('idle')
  const [mealPlanMessage, setMealPlanMessage] = useState('')
  const [mealPlanHistory, setMealPlanHistory] = useState<ToolHistoryItem[]>([])
  const [mealPlanHistoryLoading, setMealPlanHistoryLoading] = useState(true)
  const [formattedMealPlan, setFormattedMealPlan] = useState<FormattedDocument | null>(null)
  const [investPatient, setInvestPatient] = useState<InvestigationPatient>({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
  })
  const [investPatientMatches, setInvestPatientMatches] = useState<EmrPatientOption[]>([])
  const [selectedEmrPatientId, setSelectedEmrPatientId] = useState<string | null>(null)
  const [investPatientSearchLoading, setInvestPatientSearchLoading] = useState(false)
  const [investPanelTitle, setInvestPanelTitle] = useState('Core Functional Medicine Panel')
  const [investClinicalDetails, setInvestClinicalDetails] = useState('')
  // Partner verification stamp. Off by default: it should only appear on forms
  // actually being taken to the partner laboratory.
  const [investStampOn, setInvestStampOn] = useState(false)
  const [investStampPartner, setInvestStampPartner] = useState('Mecure')
  const [investStampDate, setInvestStampDate] = useState('')
  const [investTests, setInvestTests] = useState<InvestigationTest[]>(() =>
    CORE_PANEL_TESTS.map((test) => ({ name: test.name, description: '' }))
  )
  const [investBulkList, setInvestBulkList] = useState('')
  const [investTestSearch, setInvestTestSearch] = useState('')
  const [investStatus, setInvestStatus] = useState<FormatterStatus>('idle')
  const [investMessage, setInvestMessage] = useState('')
  const [investHistory, setInvestHistory] = useState<InvestigationHistoryItem[]>([])
  const [investHistoryLoading, setInvestHistoryLoading] = useState(true)
  const [resultPatient, setResultPatient] = useState<InvestigationPatient>({ fullName: '', email: '', phone: '', age: '', gender: '' })
  const [resultMeta, setResultMeta] = useState(initialResultMeta)
  const [resultRows, setResultRows] = useState<InvestigationResult[]>([])
  const [resultStatus, setResultStatus] = useState<FormatterStatus>('idle')
  const [resultMessage, setResultMessage] = useState('')
  const [resultHistory, setResultHistory] = useState<InvestigationResultHistoryItem[]>([])
  const [resultHistoryLoading, setResultHistoryLoading] = useState(true)
  const [resultPdfFile, setResultPdfFile] = useState<File | null>(null)
  const [resultExtractionPrompt, setResultExtractionPrompt] = useState('')
  const [resultExtractionStatus, setResultExtractionStatus] = useState<FormatterStatus>('idle')
  const [resultExtractionMessage, setResultExtractionMessage] = useState('')

  const refreshHistory = async () => {
    try {
      setHistory(await getStoredHistory(LETTERHEAD_HISTORY_STORE_NAME))
    } catch (error) {
      console.error('Error loading letterhead history:', error)
      setMessage('Document history could not be loaded in this browser.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const refreshMealPlanHistory = async () => {
    try {
      setMealPlanHistory(await getStoredHistory(MEAL_PLAN_HISTORY_STORE_NAME))
    } catch (error) {
      console.error('Error loading meal-plan history:', error)
      setMealPlanMessage('Meal-plan history could not be loaded in this browser.')
    } finally {
      setMealPlanHistoryLoading(false)
    }
  }

  const refreshInvestigationHistory = async () => {
    try {
      setInvestHistoryLoading(true)
      const response = await fetch(INVESTIGATION_FORMS_API)
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Unable to load investigation forms')
      }
      const data = await response.json()
      const forms = Array.isArray(data.forms) ? data.forms : []
      setInvestHistory(forms.map((form: InvestigationHistoryItem) => ({
        ...form,
        tests: normalizeInvestigationTests(form.tests),
      })))
    } catch (error) {
      console.error('Error loading investigation-form history:', error)
      setInvestMessage('Investigation-form history could not be loaded from the database.')
    } finally {
      setInvestHistoryLoading(false)
    }
  }

  const refreshResultHistory = async () => {
    try {
      setResultHistoryLoading(true)
      const response = await fetch(INVESTIGATION_RESULTS_API)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to load investigation results')
      setResultHistory(Array.isArray(data.reports) ? data.reports : [])
    }
    catch (error) { console.error('Error loading investigation-result history:', error); setResultMessage('Result history could not be loaded from the database.') }
    finally { setResultHistoryLoading(false) }
  }

  useEffect(() => {
    refreshHistory()
    refreshMealPlanHistory()
    refreshInvestigationHistory()
    refreshResultHistory()
  }, [])

  useEffect(() => {
    if (!patientContext) return
    setSelectedEmrPatientId(patientContext.id)
    setInvestPatient({
      fullName: emrPatientName(patientContext),
      email: patientContext.email || '',
      phone: patientContext.phone || '',
      age: formatPatientAge(patientContext.date_of_birth),
      gender: patientContext.sex ? patientContext.sex.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '',
      emrPatientId: patientContext.id,
    })
    setResultPatient({
      fullName: emrPatientName(patientContext),
      email: patientContext.email || '',
      phone: patientContext.phone || '',
      age: formatPatientAge(patientContext.date_of_birth),
      gender: patientContext.sex ? patientContext.sex.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '',
      emrPatientId: patientContext.id,
    })
  }, [patientContext])

  useEffect(() => {
    const search = investPatient.fullName.trim()
    if (activeTool !== 'investigation' || selectedEmrPatientId || search.length < 2) {
      setInvestPatientMatches([])
      setInvestPatientSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setInvestPatientSearchLoading(true)
      try {
        const lookupTerm = search.split(/\s+/)[0]
        const params = new URLSearchParams({ resource: 'patients', search: lookupTerm, status: 'active', pageSize: '100' })
        const response = await fetch(`${EMR_PATIENTS_API}?${params}`, { signal: controller.signal })
        if (!response.ok) {
          setInvestPatientMatches([])
          return
        }
        const data = await response.json()
        const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean)
        const patients = Array.isArray(data.patients) ? data.patients as EmrPatientOption[] : []
        setInvestPatientMatches(patients.filter((patient) => {
          const searchable = `${emrPatientName(patient)} ${patient.mrn} ${patient.phone || ''} ${patient.email || ''}`.toLowerCase()
          return searchTerms.every((term) => searchable.includes(term))
        }))
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setInvestPatientMatches([])
      } finally {
        if (!controller.signal.aborted) setInvestPatientSearchLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeTool, investPatient.fullName, selectedEmrPatientId])

  const selectEmrPatient = (patient: EmrPatientOption) => {
    setSelectedEmrPatientId(patient.id)
    setInvestPatient({
      fullName: emrPatientName(patient),
      email: patient.email || '',
      phone: patient.phone || '',
      age: formatPatientAge(patient.date_of_birth),
      gender: patient.sex ? patient.sex.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '',
    })
    setInvestPatientMatches([])
    setInvestMessage(`Loaded patient details from EMR (${patient.mrn}).`)
  }

  const formatDocument = async () => {
    if (!selectedFile) return

    setStatus('working')
    setMessage('')

    const formData = new FormData()
    formData.append('document', selectedFile)
    formData.append('outputFormat', outputFormat)

    try {
      const response = await fetch('/api/admin/tools/letterhead', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const error = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : null
        const fallbackError = error?.error || await response.text().catch(() => '')
        throw new Error(fallbackError || 'Unable to format this document')
      }

      const blob = await response.blob()
      const downloadName = makeDownloadName(selectedFile.name, outputFormat)
      const historyItem = {
        id: crypto.randomUUID(),
        originalName: selectedFile.name,
        downloadName,
        size: blob.size,
        uploadedAt: new Date().toISOString(),
        document: blob,
      }

      await saveHistoryItem(LETTERHEAD_HISTORY_STORE_NAME, historyItem)
      setHistory((current) => [historyItem, ...current])
      setFormattedDocument({ blob, downloadName })

      setStatus('success')
      setMessage('Formatted document is ready to download and saved to history.')
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Unable to format this document. Please try again.')
    }
  }

  const removeHistoryItem = async (id: string) => {
    try {
      await deleteHistoryItem(LETTERHEAD_HISTORY_STORE_NAME, id)
      setHistory((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Error deleting letterhead history item:', error)
      setMessage('Could not remove this document from history.')
    }
  }

  const formatMealPlan = async () => {
    if (!selectedMealPlanFile) return

    setMealPlanStatus('working')
    setMealPlanMessage('')

    const formData = new FormData()
    formData.append('document', selectedMealPlanFile)

    try {
      const response = await fetch('/api/admin/tools/meal-plan', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const error = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : null
        const fallbackError = error?.error || await response.text().catch(() => '')
        throw new Error(fallbackError || 'Unable to format this meal plan')
      }

      const blob = await response.blob()
      const baseName = selectedMealPlanFile.name.replace(/\.docx$/i, '').trim() || 'meal-plan'
      const downloadName = `${baseName}-fxmed-meal-plan.pdf`
      const historyItem = {
        id: crypto.randomUUID(),
        originalName: selectedMealPlanFile.name,
        downloadName,
        size: blob.size,
        uploadedAt: new Date().toISOString(),
        document: blob,
      }

      await saveHistoryItem(MEAL_PLAN_HISTORY_STORE_NAME, historyItem)
      setMealPlanHistory((current) => [historyItem, ...current])
      setFormattedMealPlan({ blob, downloadName })

      setMealPlanStatus('success')
      setMealPlanMessage('Branded meal-plan PDF is ready to download and saved to history.')
    } catch (error: any) {
      setMealPlanStatus('error')
      setMealPlanMessage(error.message || 'Unable to format this meal plan. Please try again.')
    }
  }

  const removeMealPlanHistoryItem = async (id: string) => {
    try {
      await deleteHistoryItem(MEAL_PLAN_HISTORY_STORE_NAME, id)
      setMealPlanHistory((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Error deleting meal-plan history item:', error)
      setMealPlanMessage('Could not remove this meal-plan document from history.')
    }
  }

  const updateInvestTest = (index: number, field: keyof InvestigationTest, value: string) => {
    setInvestTests((current) =>
      current.map((test, i) => (i === index ? { ...test, [field]: value } : test))
    )
  }

  const addInvestTest = () => {
    setInvestTests((current) => [...current, { name: '', description: '' }])
  }

  const removeInvestTest = (index: number) => {
    setInvestTests((current) => current.filter((_, i) => i !== index))
  }

  const loadCorePanel = () => {
    setInvestTests(CORE_PANEL_TESTS.map((test) => ({ name: test.name, description: '' })))
    setInvestPanelTitle('Core Functional Medicine Panel')
    setInvestStatus('idle')
    setInvestMessage('')
  }

  const clearInvestTests = () => {
    setInvestTests([{ name: '', description: '' }])
    setInvestStatus('idle')
    setInvestMessage('')
  }

  const populateInvestigationList = () => {
    const names = splitInvestigationList(investBulkList)
    if (names.length === 0) {
      setInvestStatus('error')
      setInvestMessage('Paste at least one investigation name to populate the form.')
      return
    }

    setInvestTests((current) => {
      const existing = new Set(current.map((test) => test.name))
      return [...current.filter((test) => test.name.trim()), ...names.filter((name) => !existing.has(name)).map((name) => ({ name, description: '' }))]
    })
    setInvestBulkList('')
    setInvestStatus('idle')
    setInvestMessage(`${names.length} investigation${names.length === 1 ? '' : 's'} populated. Review the list, then generate the form.`)
  }

  const selectedInvestigationNames = useMemo(() => new Set(investTests.map((test) => test.name)), [investTests])
  const filteredInvestigationCatalog = useMemo(() => {
    const query = investTestSearch.trim().toLowerCase()
    if (!query) return INVESTIGATION_CATALOG
    return INVESTIGATION_CATALOG.map((group) => ({ ...group, tests: group.tests.filter((test) => test.toLowerCase().includes(query)) })).filter((group) => group.tests.length)
  }, [investTestSearch])

  const toggleInvestigation = (name: string) => {
    setInvestTests((current) => current.some((test) => test.name === name)
      ? current.filter((test) => test.name !== name)
      : [...current.filter((test) => test.name.trim()), { name, description: '' }])
  }

  const toggleInvestigationGroup = (tests: readonly string[]) => {
    const allSelected = tests.every((name) => selectedInvestigationNames.has(name))
    setInvestTests((current) => allSelected
      ? current.filter((test) => !tests.includes(test.name))
      : [...current.filter((test) => !tests.includes(test.name)), ...tests.map((name) => ({ name, description: '' }))])
  }

  const generateInvestigationForm = async () => {
    const tests = investTests
      .map((test) => ({ name: test.name.trim(), description: '' }))
      .filter((test) => test.name)

    if (tests.length === 0) {
      setInvestStatus('error')
      setInvestMessage('Add at least one test with a name before generating the form.')
      return
    }

    // A stamp without a date verifies nothing, so refuse rather than issue one.
    if (investStampOn && (!investStampDate || !investStampPartner.trim())) {
      setInvestStatus('error')
      setInvestMessage('Choose the partner laboratory and the date the form will be used, or turn the stamp off.')
      return
    }

    const stamp = investStampOn ? { partner: investStampPartner.trim(), validOn: investStampDate } : undefined

    setInvestStatus('working')
    setInvestMessage('')

    try {
      const blob = await generateInvestigationFormPdf({
        ...investPatient,
        clinicalDetails: investClinicalDetails,
        panelTitle: investPanelTitle,
        tests,
        stamp,
      })

      const downloadName = makeInvestigationDownloadName(investPatient.fullName)
      downloadBlob(blob, downloadName)

      const documentBase64 = await blobToBase64(blob)
      const response = await fetch(INVESTIGATION_FORMS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalName: investPatient.fullName.trim() || 'Investigation Request Form',
          downloadName,
          size: blob.size,
          documentBase64,
          patient: { ...investPatient, emrPatientId: selectedEmrPatientId || patientContext?.id, clinicalDetails: investClinicalDetails },
          panelTitle: investPanelTitle,
          tests,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Unable to save this investigation form')
      }

      const data = await response.json()
      setInvestHistory((current) => [data.form, ...current])

      setInvestStatus('success')
      setInvestMessage('Investigation form downloaded and saved to the shared database.')
    } catch (error: any) {
      setInvestStatus('error')
      setInvestMessage(error?.message || 'Unable to generate the investigation form. Please try again.')
    }
  }

  const duplicateInvestForm = (item: InvestigationHistoryItem) => {
    const tests = normalizeInvestigationTests(item.tests)
    if (tests.length === 0) {
      setInvestStatus('error')
      setInvestMessage('This saved form does not include reusable test data. Generate it again once, then it can be duplicated from the shared history.')
      return
    }
    setInvestTests(tests.map((test) => ({ ...test })))
    setInvestPanelTitle(item.panelTitle || 'Core Functional Medicine Panel')
    setInvestClinicalDetails(item.clinicalDetails || '')
    setInvestPatient(patientContext ? {
      fullName: emrPatientName(patientContext),
      email: patientContext.email || '',
      phone: patientContext.phone || '',
      age: formatPatientAge(patientContext.date_of_birth),
      gender: patientContext.sex || '',
      emrPatientId: patientContext.id,
    } : { fullName: '', email: '', phone: '', age: '', gender: '' })
    setSelectedEmrPatientId(patientContext?.id || null)
    setInvestPatientMatches([])
    setInvestStatus('idle')
    setInvestMessage(`Loaded the tests from "${item.originalName}". Enter the new patient's details, then generate.`)
    investFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const removeInvestHistoryItem = async (id: string) => {
    try {
      const response = await fetch(`${INVESTIGATION_FORMS_API}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Unable to delete this investigation form')
      }
      setInvestHistory((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Error deleting investigation-form history item:', error)
      setInvestMessage('Could not remove this form from the database.')
    }
  }

  const extractResultsFromPdf = async () => {
    if (!resultPdfFile || !resultExtractionPrompt.trim()) {
      setResultExtractionStatus('error')
      setResultExtractionMessage('Choose a PDF and specify which results you want to extract.')
      return
    }
    setResultExtractionStatus('working'); setResultExtractionMessage('')
    try {
      const form = new FormData()
      form.append('document', resultPdfFile)
      form.append('instructions', resultExtractionPrompt)
      const response = await fetch(`${INVESTIGATION_RESULTS_API}/extract`, { method: 'POST', body: form })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to extract results')
      const allowedFlags = new Set(['', 'Normal', 'High', 'Low', 'Abnormal'])
      const extracted: InvestigationResult[] = (Array.isArray(data.results) ? data.results : []).map((row: InvestigationResult) => ({ ...row, flag: allowedFlags.has(row.flag) ? row.flag : '' }))
      if (!extracted.length) throw new Error('None of the requested results were found in this PDF.')
      setResultRows(extracted)
      setResultExtractionStatus('success')
      setResultExtractionMessage(`${extracted.length} result${extracted.length === 1 ? '' : 's'} extracted. Review and edit them before generating the final PDF.`)
    } catch (error: any) {
      setResultExtractionStatus('error'); setResultExtractionMessage(error?.message || 'Unable to extract results from this PDF.')
    }
  }

  const generateResultReport = async () => {
    const results = resultRows.map(row => ({ ...row, test: row.test.trim(), result: row.result.trim(), unit: row.unit.trim() }))
    if (!resultPatient.fullName.trim()) { setResultStatus('error'); setResultMessage('Enter the patient’s full name.'); return }
    if (!results.length) { setResultStatus('error'); setResultMessage('Select at least one investigation and enter its result.'); return }
    const incomplete = results.find(row => !row.test || !row.result)
    if (incomplete) { setResultStatus('error'); setResultMessage(incomplete.test ? `Enter a result for ${incomplete.test}, or remove it from the selected tests.` : 'Enter a name and result for every custom test.'); return }
    setResultStatus('working'); setResultMessage('')
    try {
      const blob = await generateInvestigationResultPdf({ ...resultPatient, ...resultMeta, results })
      const base = resultPatient.fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'patient'
      const downloadName = `${base}-fxmed-investigation-results.pdf`
      const documentBase64 = await blobToBase64(blob)
      const response = await fetch(INVESTIGATION_RESULTS_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalName: `${resultPatient.fullName} — Investigation Results`, downloadName, size: blob.size, documentBase64, patient: { ...resultPatient, emrPatientId: patientContext?.id || resultPatient.emrPatientId }, reportMeta: resultMeta, results }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to save investigation results')
      setResultHistory(current => [data.report, ...current]); downloadBlob(blob, downloadName)
      setResultStatus('success'); setResultMessage('Investigation results PDF downloaded and saved to the shared database.')
    } catch (error: any) { setResultStatus('error'); setResultMessage(error?.message || 'Unable to generate the investigation results PDF.') }
  }

  const removeResultHistoryItem = async (id: string) => {
    try { const response = await fetch(`${INVESTIGATION_RESULTS_API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.error || 'Unable to delete report'); setResultHistory(current => current.filter(item => item.id !== id)) }
    catch { setResultMessage('Could not remove this result report from history.') }
  }

  const handlePrimaryAction = () => {
    if (formattedDocument) {
      downloadBlob(formattedDocument.blob, formattedDocument.downloadName)
      return
    }

    formatDocument()
  }

  const regenerateDocument = () => {
    setFormattedDocument(null)
    formatDocument()
  }

  const handleMealPlanPrimaryAction = () => {
    if (formattedMealPlan) {
      downloadBlob(formattedMealPlan.blob, formattedMealPlan.downloadName)
      return
    }

    formatMealPlan()
  }

  const regenerateMealPlan = () => {
    setFormattedMealPlan(null)
    formatMealPlan()
  }

  const visibleInvestHistory = patientContext ? investHistory.filter((item) => {
    if (item.patient.emrPatientId) return item.patient.emrPatientId === patientContext.id
    return item.patient.fullName.trim().toLowerCase() === emrPatientName(patientContext).trim().toLowerCase()
  }) : investHistory
  const visibleResultHistory = patientContext ? resultHistory.filter((item) => {
    if (item.patient.emrPatientId) return item.patient.emrPatientId === patientContext.id
    return item.patient.fullName.trim().toLowerCase() === emrPatientName(patientContext).trim().toLowerCase()
  }) : resultHistory

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] p-2 shadow-lg border border-green-deep/10">
        <div className={`grid gap-2 md:grid-cols-2 ${scope === 'operations' ? 'xl:grid-cols-2' : ''}`}>
          {(scope === 'investigations' ? ([
            { id: 'investigation-results', label: 'Investigation Results', description: 'Generate branded patient investigation result PDFs.' },
            { id: 'investigation', label: 'Investigation Form', description: 'Generate branded investigation request forms with custom tests.' },
          ] as const) : ([
            { id: 'letterhead', label: 'Letterhead Formatter', description: 'Apply FXMed letterhead to DOCX and PDF documents.' },
            { id: 'meal-plan', label: 'Meal Plan Designer', description: 'Turn DOCX meal plans into branded PDFs with food visuals.' },
          ] as const)).map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`text-left rounded-xl p-4 transition-colors ${
                activeTool === tool.id
                  ? 'bg-green-deep text-cream'
                  : 'bg-cream/40 text-green-deep hover:bg-green-deep/5'
              }`}
            >
              <span className="block font-dm-sans font-semibold text-sm">{tool.label}</span>
              <span className={`mt-1 block font-dm-sans text-xs ${activeTool === tool.id ? 'text-cream/80' : 'text-text-mid'}`}>
                {tool.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTool === 'letterhead' && (
      <>
      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-deep/10 text-green-deep px-3 py-1 rounded-full text-xs font-dm-sans font-semibold mb-4">
              Admin Tool
            </div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Letterhead Formatter
            </h3>
            <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">
              Upload a `.docx` file to apply the FXMed letterhead and prepare a branded PDF or DOCX download.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="bg-gold hover:bg-gold-light text-green-deep px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Choose Document
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] || null
            setSelectedFile(file)
            if (file) setOutputFormat('pdf')
            setFormattedDocument(null)
            setStatus('idle')
            setMessage('')
          }}
        />

        <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-dm-sans font-semibold text-green-deep">
                {selectedFile ? selectedFile.name : 'No document selected'}
              </p>
              <p className="mt-1 text-xs font-dm-sans text-text-mid">
                Word `.docx` files only. Choose whether to download the finished document as PDF or DOCX.
              </p>
            </div>

            <div className="flex items-center rounded-lg border border-green-deep/10 bg-white p-1">
              {(['pdf', 'docx'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => {
                    setOutputFormat(format)
                    setFormattedDocument(null)
                    setStatus('idle')
                    setMessage('')
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-dm-sans font-semibold uppercase transition-colors ${
                    outputFormat === format
                      ? 'bg-green-deep text-cream'
                      : 'text-green-deep hover:bg-green-deep/5'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {formattedDocument && (
                <button
                  type="button"
                  onClick={regenerateDocument}
                  disabled={!selectedFile || status === 'working'}
                  aria-label="Regenerate document"
                  title="Regenerate document"
                  className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed w-11 h-11 rounded-lg font-dm-sans font-semibold text-xl transition-colors"
                >
                  ↻
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={!selectedFile || status === 'working'}
                className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-cream px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
              >
                {status === 'working' ? 'Formatting...' : formattedDocument ? 'Download' : 'Format'}
              </button>
            </div>
          </div>

          {message && (
            <p className={`mt-4 text-sm font-dm-sans ${status === 'error' ? 'text-red-600' : 'text-green-deep'}`}>
              {message}
            </p>
          )}

        </div>
      </div>

      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Document History
            </h3>
            <p className="mt-1 text-sm text-text-mid font-dm-sans">
              Previously formatted letterhead documents saved on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshHistory}
            className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            Loading document history...
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            No documents have been formatted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-green-deep/10 text-left">
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Document</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Formatted</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Size</th>
                  <th className="py-3 text-right text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-green-deep/10 last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-dm-sans font-semibold text-green-deep">{item.originalName}</p>
                      <p className="mt-1 text-xs font-dm-sans text-text-mid">{item.downloadName}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {formatFileSize(item.size)}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadBlob(item.document, item.downloadName)}
                          className="bg-green-deep hover:bg-green-deep/90 text-cream px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(item.id)}
                          className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTool === 'meal-plan' && (
      <>
      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-deep/10 text-green-deep px-3 py-1 rounded-full text-xs font-dm-sans font-semibold mb-4">
              AI Tool
            </div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Meal Plan Designer
            </h3>
            <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">
              Upload a `.docx` meal plan and generate a branded FXMed PDF with AI-organized sections and food-item visuals.
            </p>
          </div>

          <button
            type="button"
            onClick={() => mealPlanInputRef.current?.click()}
            className="bg-gold hover:bg-gold-light text-green-deep px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Choose Meal Plan
          </button>
        </div>

        <input
          ref={mealPlanInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] || null
            setSelectedMealPlanFile(file)
            setFormattedMealPlan(null)
            setMealPlanStatus('idle')
            setMealPlanMessage('')
          }}
        />

        <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-dm-sans font-semibold text-green-deep">
                {selectedMealPlanFile ? selectedMealPlanFile.name : 'No meal plan selected'}
              </p>
              <p className="mt-1 text-xs font-dm-sans text-text-mid">
                Word `.docx` meal-plan files only. The finished output downloads as PDF.
              </p>
            </div>

            <div className="rounded-lg border border-green-deep/10 bg-white px-4 py-2 text-sm font-dm-sans font-semibold text-green-deep">
              PDF output
            </div>

            <div className="flex items-center gap-2">
              {formattedMealPlan && (
                <button
                  type="button"
                  onClick={regenerateMealPlan}
                  disabled={!selectedMealPlanFile || mealPlanStatus === 'working'}
                  aria-label="Regenerate meal plan"
                  title="Regenerate meal plan"
                  className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed w-11 h-11 rounded-lg font-dm-sans font-semibold text-xl transition-colors"
                >
                  ↻
                </button>
              )}
              <button
                type="button"
                onClick={handleMealPlanPrimaryAction}
                disabled={!selectedMealPlanFile || mealPlanStatus === 'working'}
                className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-cream px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
              >
                {mealPlanStatus === 'working' ? 'Designing...' : formattedMealPlan ? 'Download' : 'Format'}
              </button>
            </div>
          </div>

          {mealPlanMessage && (
            <p className={`mt-4 text-sm font-dm-sans ${mealPlanStatus === 'error' ? 'text-red-600' : 'text-green-deep'}`}>
              {mealPlanMessage}
            </p>
          )}

          <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm font-dm-sans text-green-deep leading-relaxed">
              Food images are generated with Gemini. If Gemini image quota is unavailable, the PDF still formats the meal plan with branded food tiles.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Meal Plan History
            </h3>
            <p className="mt-1 text-sm text-text-mid font-dm-sans">
              Previously generated meal-plan PDFs saved on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshMealPlanHistory}
            className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {mealPlanHistoryLoading ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            Loading meal-plan history...
          </div>
        ) : mealPlanHistory.length === 0 ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            No meal plans have been generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-green-deep/10 text-left">
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Meal Plan</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Generated</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Size</th>
                  <th className="py-3 text-right text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mealPlanHistory.map((item) => (
                  <tr key={item.id} className="border-b border-green-deep/10 last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-dm-sans font-semibold text-green-deep">{item.originalName}</p>
                      <p className="mt-1 text-xs font-dm-sans text-text-mid">{item.downloadName}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {formatFileSize(item.size)}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadBlob(item.document, item.downloadName)}
                          className="bg-green-deep hover:bg-green-deep/90 text-cream px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMealPlanHistoryItem(item.id)}
                          className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTool === 'investigation' && (
      <>
      <div ref={investFormRef} className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Investigation Form Generator
            </h3>
            <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">
              {patientContext ? 'Patient demographics are taken automatically from the linked EMR record and included in the downloaded PDF.' : 'Select an EMR patient and the investigations they require.'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <h4 className="text-sm font-dm-sans font-semibold text-green-deep mb-4">Patient Information</h4>
          {patientContext ? (
            <div className="rounded-xl border border-green-deep/15 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-dm-sans font-semibold text-green-deep">{emrPatientName(patientContext)}</p><p className="mt-1 text-xs font-dm-sans text-text-mid">{patientContext.mrn} · {formatPatientAge(patientContext.date_of_birth)} · {patientContext.sex ? patientContext.sex.replace(/_/g, ' ') : 'Sex not recorded'}</p></div>
                <span className="rounded-full bg-green-deep/10 px-3 py-1.5 text-xs font-dm-sans font-semibold text-green-deep">Linked EMR patient</span>
              </div>
              <p className="mt-3 text-xs font-dm-sans text-text-mid">Name, date of birth/age, sex, phone and email will be populated automatically in the final PDF.</p>
            </div>
          ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Full Name</label>
              <input
                type="text"
                value={investPatient.fullName}
                onChange={(event) => {
                  setSelectedEmrPatientId(null)
                  setInvestPatient((current) => ({ ...current, fullName: event.target.value }))
                }}
                placeholder="Type name"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={investPatientMatches.length > 0}
                aria-controls="investigation-emr-patient-options"
                className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
              />
              {investPatientSearchLoading && <p className="mt-1 text-xs font-dm-sans text-text-mid">Searching EMR…</p>}
              {investPatientMatches.length > 0 && (
                <div id="investigation-emr-patient-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-green-deep/15 bg-white p-1 shadow-xl">
                  {investPatientMatches.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        selectEmrPatient(patient)
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left hover:bg-cream"
                    >
                      <span className="block text-sm font-dm-sans font-semibold text-green-deep">{emrPatientName(patient)}</span>
                      <span className="mt-0.5 block text-xs font-dm-sans text-text-mid">{patient.mrn} · {patient.phone || patient.email || 'No contact recorded'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Email Address</label>
              <input
                type="email"
                value={investPatient.email}
                onChange={(event) => setInvestPatient((current) => ({ ...current, email: event.target.value }))}
                placeholder="patient@example.com"
                className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Phone Number</label>
              <input
                type="tel"
                value={investPatient.phone}
                onChange={(event) => setInvestPatient((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+234 ..."
                className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Age</label>
                <input
                  type="text"
                  value={investPatient.age}
                  onChange={(event) => setInvestPatient((current) => ({ ...current, age: event.target.value }))}
                  placeholder="e.g. 42"
                  className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Gender</label>
                <input
                  type="text"
                  value={investPatient.gender}
                  onChange={(event) => setInvestPatient((current) => ({ ...current, gender: event.target.value }))}
                  placeholder="e.g. Female"
                  className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
                />
              </div>
            </div>
          </div>}

          <div className="mt-4">
            <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Panel Title</label>
            <input
              type="text"
              value={investPanelTitle}
              onChange={(event) => setInvestPanelTitle(event.target.value)}
              placeholder="Core Functional Medicine Panel"
              className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Clinical Details</label>
            <textarea
              value={investClinicalDetails}
              onChange={(event) => setInvestClinicalDetails(event.target.value)}
              placeholder="Enter relevant symptoms, diagnosis, clinical history, reason for testing, or special instructions"
              rows={4}
              className="w-full resize-y rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
            />
            <p className="mt-1 text-xs font-dm-sans text-text-mid">These details will appear on the generated investigation request PDF.</p>
          </div>

        </div>

        <div className="mt-4 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-dm-sans font-semibold text-green-deep">Requested Tests</h4>
              <p className="mt-1 text-xs font-dm-sans text-text-mid">
                Tick the investigations required for this patient. Only selected items appear on the PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadCorePanel}
                className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
              >
                Load Core Panel
              </button>
              <button
                type="button"
                onClick={clearInvestTests}
                className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-green-deep/15 bg-white p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Search investigations</label>
              <input value={investTestSearch} onChange={(event) => setInvestTestSearch(event.target.value)} placeholder="Search by test name…" className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none" />
            </div>
            <div className="rounded-lg bg-green-deep px-4 py-2.5 text-sm font-dm-sans font-semibold text-cream">{investTests.filter((test) => test.name.trim()).length} selected</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredInvestigationCatalog.map((group) => {
              const groupSelected = group.tests.filter((name) => selectedInvestigationNames.has(name)).length
              return <section key={group.category} className="overflow-hidden rounded-xl border border-green-deep/10 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-green-deep/10 bg-green-deep/[0.04] px-4 py-3">
                  <div><h5 className="text-sm font-dm-sans font-semibold text-green-deep">{group.category}</h5><p className="text-xs text-text-mid">{groupSelected} of {group.tests.length} selected</p></div>
                  <button type="button" onClick={() => toggleInvestigationGroup(group.tests)} className="text-xs font-dm-sans font-semibold text-green-mid hover:text-green-deep">{groupSelected === group.tests.length ? 'Clear group' : 'Select group'}</button>
                </div>
                <div className="divide-y divide-green-deep/[0.07]">
                  {group.tests.map((name) => <label key={name} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-cream/40">
                    <input type="checkbox" checked={selectedInvestigationNames.has(name)} onChange={() => toggleInvestigation(name)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-deep" />
                    <span className="text-sm font-dm-sans text-green-deep">{name}</span>
                  </label>)}
                </div>
              </section>
            })}
          </div>

          {!filteredInvestigationCatalog.length && <p className="rounded-lg border border-green-deep/10 bg-white p-4 text-sm text-text-mid">No investigations match your search.</p>}

          <div className="mt-4 rounded-lg border border-dashed border-green-deep/25 bg-white p-3">
            <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Add custom investigations</label>
            <div className="flex flex-col gap-2 sm:flex-row"><input value={investBulkList} onChange={(event) => setInvestBulkList(event.target.value)} placeholder="Enter one or more tests, separated by commas" className="flex-1 rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none" /><button type="button" onClick={populateInvestigationList} className="rounded-lg bg-green-deep px-4 py-2 text-xs font-dm-sans font-semibold text-cream">Add to selection</button></div>
            {investTests.filter((test) => test.name && !INVESTIGATION_CATALOG.some((group) => group.tests.some((name) => name === test.name))).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{investTests.filter((test) => test.name && !INVESTIGATION_CATALOG.some((group) => group.tests.some((name) => name === test.name))).map((test) => <button key={test.name} type="button" onClick={() => toggleInvestigation(test.name)} className="rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-green-deep">{test.name} ×</button>)}</div>}
          </div>

          <div className="mt-5 rounded-lg border border-green-deep/15 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={investStampOn} onChange={(event) => setInvestStampOn(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-deep" />
              <span><span className="block text-sm font-dm-sans font-semibold text-green-deep">Include partner verification stamp</span><span className="mt-0.5 block text-xs font-dm-sans text-text-mid">Confirms that FXMed authorised this patient for the selected tests at a partner laboratory.</span></span>
            </label>
            {investStampOn && <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Partner Laboratory</label><select value={investStampPartner} onChange={(event) => setInvestStampPartner(event.target.value)} className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none">{PARTNER_LABORATORIES.map((partner) => <option key={partner} value={partner}>{partner}</option>)}</select></div>
              <div><label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Valid On</label><input type="date" value={investStampDate} onChange={(event) => setInvestStampDate(event.target.value)} className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none" /><p className="mt-1 text-xs font-dm-sans text-text-mid">The date the patient will attend for the tests.</p></div>
            </div>}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {investMessage ? (
              <p className={`text-sm font-dm-sans ${investStatus === 'error' ? 'text-red-600' : 'text-green-deep'}`}>
                {investMessage}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={generateInvestigationForm}
              disabled={investStatus === 'working'}
              className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-cream px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
            >
              {investStatus === 'working' ? 'Generating...' : 'Generate Form PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Investigation Form History
            </h3>
            <p className="mt-1 text-sm text-text-mid font-dm-sans">
              {patientContext ? `Previous investigation request forms for ${emrPatientName(patientContext)}.` : 'Shared investigation request forms saved in the database.'}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshInvestigationHistory}
            className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {investHistoryLoading ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            Loading investigation-form history...
          </div>
        ) : visibleInvestHistory.length === 0 ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            {patientContext ? 'No previous investigation forms have been generated for this patient.' : 'No investigation forms have been generated yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-green-deep/10 text-left">
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Patient</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Generated</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Size</th>
                  <th className="py-3 text-right text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvestHistory.map((item) => (
                  <tr key={item.id} className="border-b border-green-deep/10 last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-dm-sans font-semibold text-green-deep">{item.originalName}</p>
                      <p className="mt-1 text-xs font-dm-sans text-text-mid">{item.downloadName}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">
                      {formatFileSize(item.size)}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadBlob(base64ToBlob(item.documentBase64), item.downloadName)}
                          className="bg-green-deep hover:bg-green-deep/90 text-cream px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateInvestForm(item)}
                          title="Reuse these tests for another patient"
                          className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => removeInvestHistoryItem(item.id)}
                          className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTool === 'investigation-results' && (
      <>
        <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
          <div className="inline-flex items-center bg-green-deep/10 text-green-deep px-3 py-1 rounded-full text-xs font-dm-sans font-semibold mb-4">Admin Tool</div>
          <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Investigation Results Generator</h3>
          <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">Create a confidential patient results PDF styled to match the FXMed investigation request form.</p>

          <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
            <h4 className="text-sm font-dm-sans font-semibold text-green-deep mb-4">Patient & Report Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([['fullName','Full Name','Amara Okafor'],['email','Email Address','patient@example.com'],['phone','Phone Number','+234 ...'],['age','Age','42'],['gender','Gender','Female']] as const).map(([field,label,placeholder]) => <div key={field}><label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">{label}</label><input value={resultPatient[field]} onChange={e => setResultPatient(current => ({ ...current, [field]: e.target.value }))} placeholder={placeholder} className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none" /></div>)}
              {([['reportTitle','Report Title'],['specimen','Specimen'],['clinician','Requesting Clinician'],['collectedAt','Collected Date / Time'],['reportedAt','Reported Date / Time']] as const).map(([field,label]) => <div key={field}><label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">{label}</label><input value={resultMeta[field]} onChange={e => setResultMeta(current => ({ ...current, [field]: e.target.value }))} placeholder={field === 'specimen' ? 'e.g. Serum / Whole blood' : ''} className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none" /></div>)}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h4 className="text-sm font-dm-sans font-semibold text-green-deep">Extract Results from a PDF with AI</h4>
                <p className="mt-1 text-xs font-dm-sans text-text-mid">Upload an existing laboratory report and describe the exact tests or panels to import. Extracted results remain editable.</p>
              </div>
              <button type="button" onClick={() => resultPdfInputRef.current?.click()} className="shrink-0 bg-gold hover:bg-gold-light text-green-deep px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm">Choose PDF</button>
            </div>
            <input ref={resultPdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={event => { setResultPdfFile(event.target.files?.[0] || null); setResultExtractionStatus('idle'); setResultExtractionMessage('') }} />
            <div className="mt-3 rounded-lg border border-green-deep/10 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep">{resultPdfFile ? `${resultPdfFile.name} · ${formatFileSize(resultPdfFile.size)}` : 'No PDF selected'}</div>
            <label className="block mt-3 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">What should AI extract?</label>
            <textarea value={resultExtractionPrompt} onChange={event => setResultExtractionPrompt(event.target.value)} rows={3} placeholder="e.g. Extract the complete Full Blood Count panel and HbA1c only. Keep all units and reference ranges." className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans resize-y focus:border-green-deep focus:outline-none" />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {resultExtractionMessage ? <p className={`text-sm font-dm-sans ${resultExtractionStatus === 'error' ? 'text-red-600' : 'text-green-deep'}`}>{resultExtractionMessage}</p> : <span />}
              <button type="button" onClick={extractResultsFromPdf} disabled={!resultPdfFile || !resultExtractionPrompt.trim() || resultExtractionStatus === 'working'} className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 disabled:text-gray-500 text-cream px-5 py-2.5 rounded-lg font-dm-sans font-semibold text-sm">{resultExtractionStatus === 'working' ? 'Extracting...' : 'Extract Requested Results'}</button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
            <InvestigationResultsEditor rows={resultRows} onChange={setResultRows} />
            <label className="block mt-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Clinical Notes</label><textarea value={resultMeta.notes} onChange={e => setResultMeta(current => ({ ...current, notes: e.target.value }))} rows={3} placeholder="Optional interpretation or follow-up note" className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm resize-y" />
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">{resultMessage ? <p className={`text-sm font-dm-sans ${resultStatus === 'error' ? 'text-red-600' : 'text-green-deep'}`}>{resultMessage}</p> : <span/>}<button type="button" onClick={generateResultReport} disabled={resultStatus === 'working'} className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 text-cream px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm">{resultStatus === 'working' ? 'Generating...' : 'Generate Results PDF'}</button></div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10"><div className="flex justify-between gap-3 mb-5"><div><h3 className="text-xl font-dm-sans font-semibold text-green-deep">Results History</h3><p className="mt-1 text-sm text-text-mid font-dm-sans">{patientContext ? `Previous investigation results for ${emrPatientName(patientContext)}.` : 'Shared investigation result PDFs saved in the database.'}</p></div><button type="button" onClick={refreshResultHistory} className="border border-green-deep/20 text-green-deep px-4 py-2 rounded-lg text-sm font-semibold">Refresh</button></div>{resultHistoryLoading ? <p className="text-sm text-text-mid">Loading results history...</p> : visibleResultHistory.length === 0 ? <p className="rounded-xl bg-cream/40 p-4 text-sm text-text-mid">{patientContext ? 'No previous investigation results have been generated for this patient.' : 'No result reports have been generated yet.'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead><tr className="border-b text-left text-xs uppercase text-text-mid"><th className="py-3">Report</th><th>Generated</th><th>Size</th><th className="text-right">Actions</th></tr></thead><tbody>{visibleResultHistory.map(item => <tr key={item.id} className="border-b"><td className="py-4"><p className="font-semibold text-green-deep">{item.originalName}</p><p className="text-xs text-text-mid">{item.downloadName}</p></td><td className="text-sm text-text-mid">{new Date(item.uploadedAt).toLocaleString()}</td><td className="text-sm text-text-mid">{formatFileSize(item.size)}</td><td><div className="flex justify-end gap-2"><button onClick={() => downloadBlob(base64ToBlob(item.documentBase64),item.downloadName)} className="bg-green-deep text-cream px-3 py-2 rounded-lg text-xs font-semibold">Download</button><button onClick={() => removeResultHistoryItem(item.id)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold">Delete</button></div></td></tr>)}</tbody></table></div>}</div>
      </>
      )}
    </div>
  )
}
