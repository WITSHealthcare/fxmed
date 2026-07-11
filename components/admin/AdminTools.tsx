'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CORE_PANEL_TESTS,
  generateInvestigationFormPdf,
  type InvestigationTest,
} from '@/lib/investigationFormPdf'
import { generateInvestigationResultPdf, type InvestigationResult, type InvestigationResultFlag } from '@/lib/investigationResultPdf'

type FormatterStatus = 'idle' | 'working' | 'success' | 'error'
type ActiveTool = 'letterhead' | 'meal-plan' | 'investigation' | 'investigation-results'

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
}

type InvestigationHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  documentBase64: string
  patient: InvestigationPatient
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
const INVESTIGATION_FORMS_API = '/api/admin/tools/investigation-forms'
const INVESTIGATION_RESULTS_API = '/api/admin/tools/investigation-results'
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

export default function AdminTools() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mealPlanInputRef = useRef<HTMLInputElement | null>(null)
  const investFormRef = useRef<HTMLDivElement | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>('letterhead')
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
  const [investPanelTitle, setInvestPanelTitle] = useState('Core Functional Medicine Panel')
  const [investTests, setInvestTests] = useState<InvestigationTest[]>(() =>
    CORE_PANEL_TESTS.map((test) => ({ ...test }))
  )
  const [investStatus, setInvestStatus] = useState<FormatterStatus>('idle')
  const [investMessage, setInvestMessage] = useState('')
  const [investHistory, setInvestHistory] = useState<InvestigationHistoryItem[]>([])
  const [investHistoryLoading, setInvestHistoryLoading] = useState(true)
  const [resultPatient, setResultPatient] = useState<InvestigationPatient>({ fullName: '', email: '', phone: '', age: '', gender: '' })
  const [resultMeta, setResultMeta] = useState(initialResultMeta)
  const [resultRows, setResultRows] = useState<InvestigationResult[]>([{ test: '', result: '', unit: '', referenceRange: '', flag: '', remark: '' }])
  const [resultStatus, setResultStatus] = useState<FormatterStatus>('idle')
  const [resultMessage, setResultMessage] = useState('')
  const [resultHistory, setResultHistory] = useState<InvestigationResultHistoryItem[]>([])
  const [resultHistoryLoading, setResultHistoryLoading] = useState(true)

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
    setInvestTests(CORE_PANEL_TESTS.map((test) => ({ ...test })))
    setInvestPanelTitle('Core Functional Medicine Panel')
    setInvestStatus('idle')
    setInvestMessage('')
  }

  const clearInvestTests = () => {
    setInvestTests([{ name: '', description: '' }])
    setInvestStatus('idle')
    setInvestMessage('')
  }

  const generateInvestigationForm = async () => {
    const tests = investTests
      .map((test) => ({ name: test.name.trim(), description: test.description.trim() }))
      .filter((test) => test.name)

    if (tests.length === 0) {
      setInvestStatus('error')
      setInvestMessage('Add at least one test with a name before generating the form.')
      return
    }

    setInvestStatus('working')
    setInvestMessage('')

    try {
      const blob = await generateInvestigationFormPdf({
        ...investPatient,
        panelTitle: investPanelTitle,
        tests,
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
          patient: investPatient,
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
    setInvestPatient({ fullName: '', email: '', phone: '', age: '', gender: '' })
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

  const updateResultRow = (index: number, field: keyof InvestigationResult, value: string) => {
    setResultRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const generateResultReport = async () => {
    const results = resultRows.map(row => ({ ...row, test: row.test.trim(), result: row.result.trim() })).filter(row => row.test && row.result)
    if (!resultPatient.fullName.trim()) { setResultStatus('error'); setResultMessage('Enter the patient’s full name.'); return }
    if (!results.length) { setResultStatus('error'); setResultMessage('Add at least one investigation with a test name and result.'); return }
    setResultStatus('working'); setResultMessage('')
    try {
      const blob = await generateInvestigationResultPdf({ ...resultPatient, ...resultMeta, results })
      const base = resultPatient.fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'patient'
      const downloadName = `${base}-fxmed-investigation-results.pdf`
      const documentBase64 = await blobToBase64(blob)
      const response = await fetch(INVESTIGATION_RESULTS_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalName: `${resultPatient.fullName} — Investigation Results`, downloadName, size: blob.size, documentBase64, patient: resultPatient, reportMeta: resultMeta, results }) })
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] p-2 shadow-lg border border-green-deep/10">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {([
            { id: 'letterhead', label: 'Letterhead Formatter', description: 'Apply FXMed letterhead to DOCX and PDF documents.' },
            { id: 'meal-plan', label: 'Meal Plan Designer', description: 'Turn DOCX meal plans into branded PDFs with food visuals.' },
            { id: 'investigation', label: 'Investigation Form', description: 'Generate branded investigation request forms with custom tests.' },
            { id: 'investigation-results', label: 'Investigation Results', description: 'Generate branded patient investigation result PDFs.' },
          ] as const).map((tool) => (
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
            <div className="inline-flex items-center gap-2 bg-green-deep/10 text-green-deep px-3 py-1 rounded-full text-xs font-dm-sans font-semibold mb-4">
              Admin Tool
            </div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">
              Investigation Form Generator
            </h3>
            <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">
              Build a branded FXMed investigation request form with custom patient details and tests, matching the design used on the Functional Health Analysis site. Leave patient fields blank to print a form patients can fill in by hand.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <h4 className="text-sm font-dm-sans font-semibold text-green-deep mb-4">Patient Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Full Name</label>
              <input
                type="text"
                value={investPatient.fullName}
                onChange={(event) => setInvestPatient((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="e.g. Amara Okafor"
                className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none"
              />
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
          </div>

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
        </div>

        <div className="mt-4 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-dm-sans font-semibold text-green-deep">Requested Tests</h4>
              <p className="mt-1 text-xs font-dm-sans text-text-mid">
                Add the investigations to include. Descriptions are optional.
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

          <div className="space-y-3">
            {investTests.map((test, index) => (
              <div key={index} className="rounded-lg border border-green-deep/10 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-dm-sans font-semibold text-text-mid">Test {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeInvestTest(index)}
                    disabled={investTests.length === 1}
                    className="text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent px-2 py-1 rounded font-dm-sans font-semibold text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={test.name}
                  onChange={(event) => updateInvestTest(index, 'name', event.target.value)}
                  placeholder="Test name (e.g. Complete Blood Count (CBC))"
                  className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans font-semibold text-green-deep focus:border-green-deep focus:outline-none"
                />
                <textarea
                  value={test.description}
                  onChange={(event) => updateInvestTest(index, 'description', event.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-text-mid focus:border-green-deep focus:outline-none resize-y"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addInvestTest}
            className="mt-3 border border-dashed border-green-deep/30 text-green-deep hover:bg-green-deep/5 w-full px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            + Add Test
          </button>

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
              Shared investigation request forms saved in the database for all Tools users.
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
        ) : investHistory.length === 0 ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">
            No investigation forms have been generated yet.
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
                {investHistory.map((item) => (
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

          <div className="mt-4 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-4"><div><h4 className="text-sm font-dm-sans font-semibold text-green-deep">Investigation Results</h4><p className="mt-1 text-xs font-dm-sans text-text-mid">A test name and result are required. Other fields are optional.</p></div><button type="button" onClick={() => setResultRows([{ test: '', result: '', unit: '', referenceRange: '', flag: '', remark: '' }])} className="border border-green-deep/20 text-green-deep px-3 py-2 rounded-lg font-dm-sans font-semibold text-xs">Clear</button></div>
            <div className="space-y-3">{resultRows.map((row,index) => <div key={index} className="rounded-lg border border-green-deep/10 bg-white p-3"><div className="flex justify-between mb-2"><span className="text-xs font-dm-sans font-semibold text-text-mid">Result {index + 1}</span><button type="button" disabled={resultRows.length === 1} onClick={() => setResultRows(current => current.filter((_,i) => i !== index))} className="text-red-600 disabled:text-gray-300 text-xs font-semibold">Remove</button></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2"><input value={row.test} onChange={e => updateResultRow(index,'test',e.target.value)} placeholder="Test name *" className="rounded-lg border border-green-deep/15 px-3 py-2 text-sm"/><input value={row.result} onChange={e => updateResultRow(index,'result',e.target.value)} placeholder="Result *" className="rounded-lg border border-green-deep/15 px-3 py-2 text-sm"/><input value={row.unit} onChange={e => updateResultRow(index,'unit',e.target.value)} placeholder="Unit" className="rounded-lg border border-green-deep/15 px-3 py-2 text-sm"/><input value={row.referenceRange} onChange={e => updateResultRow(index,'referenceRange',e.target.value)} placeholder="Reference range" className="rounded-lg border border-green-deep/15 px-3 py-2 text-sm"/><select value={row.flag} onChange={e => updateResultRow(index,'flag',e.target.value as InvestigationResultFlag)} className="rounded-lg border border-green-deep/15 px-3 py-2 text-sm bg-white"><option value="">No flag</option><option>Normal</option><option>High</option><option>Low</option><option>Abnormal</option></select></div><input value={row.remark} onChange={e => updateResultRow(index,'remark',e.target.value)} placeholder="Optional remark" className="mt-2 w-full rounded-lg border border-green-deep/15 px-3 py-2 text-sm"/></div>)}</div>
            <button type="button" onClick={() => setResultRows(current => [...current,{ test: '', result: '', unit: '', referenceRange: '', flag: '', remark: '' }])} className="mt-3 border border-dashed border-green-deep/30 text-green-deep hover:bg-green-deep/5 w-full px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm">+ Add Result</button>
            <label className="block mt-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1">Clinical Notes</label><textarea value={resultMeta.notes} onChange={e => setResultMeta(current => ({ ...current, notes: e.target.value }))} rows={3} placeholder="Optional interpretation or follow-up note" className="w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm resize-y" />
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">{resultMessage ? <p className={`text-sm font-dm-sans ${resultStatus === 'error' ? 'text-red-600' : 'text-green-deep'}`}>{resultMessage}</p> : <span/>}<button type="button" onClick={generateResultReport} disabled={resultStatus === 'working'} className="bg-green-deep hover:bg-green-deep/90 disabled:bg-gray-300 text-cream px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm">{resultStatus === 'working' ? 'Generating...' : 'Generate Results PDF'}</button></div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10"><div className="flex justify-between gap-3 mb-5"><div><h3 className="text-xl font-dm-sans font-semibold text-green-deep">Results History</h3><p className="mt-1 text-sm text-text-mid font-dm-sans">Shared investigation result PDFs saved in the database for all Tools users.</p></div><button type="button" onClick={refreshResultHistory} className="border border-green-deep/20 text-green-deep px-4 py-2 rounded-lg text-sm font-semibold">Refresh</button></div>{resultHistoryLoading ? <p className="text-sm text-text-mid">Loading results history...</p> : resultHistory.length === 0 ? <p className="rounded-xl bg-cream/40 p-4 text-sm text-text-mid">No result reports have been generated yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead><tr className="border-b text-left text-xs uppercase text-text-mid"><th className="py-3">Report</th><th>Generated</th><th>Size</th><th className="text-right">Actions</th></tr></thead><tbody>{resultHistory.map(item => <tr key={item.id} className="border-b"><td className="py-4"><p className="font-semibold text-green-deep">{item.originalName}</p><p className="text-xs text-text-mid">{item.downloadName}</p></td><td className="text-sm text-text-mid">{new Date(item.uploadedAt).toLocaleString()}</td><td className="text-sm text-text-mid">{formatFileSize(item.size)}</td><td><div className="flex justify-end gap-2"><button onClick={() => downloadBlob(base64ToBlob(item.documentBase64),item.downloadName)} className="bg-green-deep text-cream px-3 py-2 rounded-lg text-xs font-semibold">Download</button><button onClick={() => removeResultHistoryItem(item.id)} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold">Delete</button></div></td></tr>)}</tbody></table></div>}</div>
      </>
      )}
    </div>
  )
}
