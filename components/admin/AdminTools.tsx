'use client'

import { useEffect, useRef, useState } from 'react'

type FormatterStatus = 'idle' | 'working' | 'success' | 'error'
type ActiveTool = 'letterhead' | 'meal-plan'

type ToolHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  document: Blob
}

type FormattedDocument = {
  blob: Blob
  downloadName: string
}

type OutputFormat = 'docx' | 'pdf'

const HISTORY_DB_NAME = 'fxmed-admin-tools'
const LETTERHEAD_HISTORY_STORE_NAME = 'letterhead-documents'
const MEAL_PLAN_HISTORY_STORE_NAME = 'meal-plan-documents'

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

function openHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, 2)

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

  useEffect(() => {
    refreshHistory()
    refreshMealPlanHistory()
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
        <div className="grid gap-2 md:grid-cols-2">
          {([
            { id: 'letterhead', label: 'Letterhead Formatter', description: 'Apply FXMed letterhead to DOCX and PDF documents.' },
            { id: 'meal-plan', label: 'Meal Plan Designer', description: 'Turn DOCX meal plans into branded PDFs with food visuals.' },
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

      {activeTool === 'letterhead' ? (
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
      ) : (
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
    </div>
  )
}
