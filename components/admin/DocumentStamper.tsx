'use client'
/* eslint-disable @next/next/no-img-element -- the page previews and stamp are blob: and data: URLs drawn in the browser */

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CursorClickIcon,
  DownloadSimpleIcon,
  PlusIcon,
  SpinnerGapIcon,
  StampIcon,
  TrashIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { downloadBlob, formatFileSize } from '@/lib/fileDownload'
import {
  MM_TO_PT,
  STAMP_DEFAULT_WIDTH_MM,
  STAMP_INKS,
  STAMP_INK_OPACITY,
  STAMP_MAX_WIDTH_MM,
  STAMP_MIN_WIDTH_MM,
  STAMP_WORDINGS,
  stampAspect,
  todayInLagos,
  type StampDesign,
  type StampInk,
  type StampStyle,
} from '@/lib/stamp/design'
import {
  STAMP_ACCEPT,
  closeStampDocument,
  locateWithAi,
  openStampDocument,
  renderStamp,
  writeStampedDocument,
  type StampDocument,
  type StampPage,
} from '@/lib/stamp/document'
import { distinctRequests, findStampRequests, footprint, placeStamp, type Box, type StampRequest } from '@/lib/stamp/placement'
import { STAMP_HISTORY_STORE, deleteHistoryItem, getStoredHistory, saveHistoryItem, type ToolHistoryItem } from '@/lib/toolHistory'

// Stamps documents with the FXMed stamp where they ask for one. Text PDFs
// are read here in the browser; scanned pages are checked by the server.
// Each stamp can be moved, resized or removed before the copy is made.

type Source = 'text' | 'scan' | 'manual'
type Found = { id: string; page: number; request: StampRequest; source: 'text' | 'scan' }
type Spot = { id: string; page: number; x: number; y: number; width: number; label: string; source: Source; foundId: string | null; adjusted: boolean }
type Notice = { tone: 'info' | 'success' | 'warning' | 'error'; text: string }
type Phase = 'idle' | 'reading' | 'checking' | 'ready' | 'saving'

const SOURCE_LABELS: Record<Source, string> = { text: 'Found in the text', scan: 'Found on the scan', manual: 'Added by hand' }
const NOTICE_STYLES: Record<Notice['tone'], string> = {
  info: 'border-green-deep/10 bg-cream/60 text-green-deep',
  success: 'border-green-light/40 bg-green-light/10 text-green-deep',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-700',
}

const defaultWidth = (style: StampStyle) => STAMP_DEFAULT_WIDTH_MM[style] * MM_TO_PT
const toMm = (points: number) => Math.round(points / MM_TO_PT)
const byPosition = (a: Spot, b: Spot) => a.page - b.page || a.y - b.y || a.x - b.x
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function spotBox(spot: Pick<Spot, 'x' | 'y' | 'width'>, style: StampStyle): Box {
  return footprint({ x: spot.x, y: spot.y, width: spot.width, height: spot.width * stampAspect(style) })
}

/** Keeps a stamp's centre where the whole stamp stays on the page. */
function clampToPage(x: number, y: number, width: number, height: number, page: StampPage) {
  const clamp = (value: number, size: number, max: number) => size >= max ? max / 2 : Math.min(Math.max(value, size / 2), max - size / 2)
  return { x: clamp(x, width, page.width), y: clamp(y, height, page.height) }
}

/** Puts a stamp at each request, avoiding the stamps in `keep`. */
function placeFound(doc: StampDocument, found: Found[], style: StampStyle, keep: Spot[] = []): Spot[] {
  const width = defaultWidth(style)
  const height = width * stampAspect(style)
  const placed: Spot[] = []
  for (const page of doc.pages) {
    const taken = keep.filter(spot => spot.page === page.number).map(spot => spotBox(spot, style))
    const text = page.runs.map(run => ({ left: run.left, top: run.top, right: run.left + run.width, bottom: run.top + run.height }))
    for (const item of found.filter(entry => entry.page === page.number)) {
      const spot = placeStamp({ ink: page.ink, page, request: item.request, size: { width, height }, round: style === 'round', taken, text })
      taken.push(footprint(spot))
      placed.push({ id: item.id, page: page.number, x: spot.x, y: spot.y, width: spot.width, label: item.request.label, source: item.source, foundId: item.id, adjusted: false })
    }
  }
  return placed
}

export default function DocumentStamper() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const docRef = useRef<StampDocument | null>(null)
  const runRef = useRef(0)
  const drag = useRef<{ id: string; pointer: number; startX: number; startY: number; x: number; y: number; ptPerPx: number } | null>(null)

  const [design, setDesign] = useState<StampDesign>(() => ({ style: 'round', ink: 'green', date: todayInLagos(), wording: '' }))
  const [artwork, setArtwork] = useState('')
  const [doc, setDoc] = useState<StampDocument | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [found, setFound] = useState<Found[]>([])
  const [spots, setSpots] = useState<Spot[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState<ToolHistoryItem[]>([])
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  const busy = phase === 'reading' || phase === 'checking' || phase === 'saving'
  const selected = spots.find(spot => spot.id === selectedId) || null
  const aspect = stampAspect(design.style)

  // The stamp artwork for the preview, redrawn when the design changes.
  useEffect(() => {
    let cancelled = false
    renderStamp(design, 720)
      .then(canvas => { if (!cancelled) setArtwork(canvas.toDataURL('image/png')) })
      .catch(() => { if (!cancelled) setArtwork('') })
    return () => { cancelled = true }
  }, [design])

  const refreshHistory = () => {
    getStoredHistory(STAMP_HISTORY_STORE)
      .then(items => { setHistory(items); setHistoryState('ready') })
      .catch(() => setHistoryState('unavailable'))
  }
  useEffect(() => { refreshHistory() }, [])

  // Page previews are held as object URLs; release them when finished with.
  useEffect(() => () => { closeStampDocument(docRef.current); docRef.current = null }, [])

  const reset = () => {
    runRef.current += 1
    closeStampDocument(docRef.current)
    docRef.current = null
    setDoc(null)
    setFound([])
    setSpots([])
    setSelectedId(null)
    setAdding(false)
    setPhase('idle')
    setProgress('')
    setNotice(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const openFile = async (file: File) => {
    reset()
    const run = runRef.current
    setPhase('reading')
    setProgress('Opening the document…')
    let opened: StampDocument
    try {
      opened = await openStampDocument(file, (done, total) => {
        if (runRef.current === run) setProgress(`Reading page ${done} of ${total}…`)
      })
    } catch (error: any) {
      if (runRef.current !== run) return
      setPhase('idle')
      setNotice({ tone: 'error', text: error?.message || 'This document could not be opened.' })
      return
    }
    if (runRef.current !== run) { closeStampDocument(opened); return }
    docRef.current = opened
    setDoc(opened)

    // Text pages are searched for labels such as "Hospital stamp". Scanned
    // pages, and pages that only mention a stamp in passing, get a closer look.
    const results: Found[] = []
    const closerLook: StampPage[] = []
    const nearness = defaultWidth(design.style) * 0.8
    for (const page of opened.pages) {
      if (!page.hasText) { closerLook.push(page); continue }
      const requests = findStampRequests(page.runs)
      const labels = distinctRequests(requests.filter(request => request.strong), nearness)
      labels.forEach((request, index) => results.push({ id: `p${page.number}-text-${index}`, page: page.number, request, source: 'text' }))
      if (!labels.length && requests.length) closerLook.push(page)
    }

    const warnings: string[] = []
    if (closerLook.length) {
      setPhase('checking')
      setProgress(`Checking ${plural(closerLook.length, 'scanned page')} for a stamp box…`)
      try {
        const { requests, skipped } = await locateWithAi(closerLook)
        if (runRef.current !== run) return
        requests.forEach((list, pageNumber) => {
          distinctRequests(list, nearness).forEach((request, index) => results.push({ id: `p${pageNumber}-scan-${index}`, page: pageNumber, request, source: 'scan' }))
        })
        if (skipped.length) warnings.push(`Pages ${skipped.join(', ')} were not checked, as only ${closerLook.length - skipped.length} scanned pages can be checked at once.`)
      } catch (error: any) {
        if (runRef.current !== run) return
        warnings.push(error?.message || 'The scanned pages could not be checked.')
      }
    }

    results.sort((a, b) => a.page - b.page)
    const placed = placeFound(opened, results, design.style).sort(byPosition)
    setFound(results)
    setSpots(placed)
    setSelectedId(placed[0]?.id || null)
    setPhase('ready')
    setProgress('')
    if (placed.length) {
      const pages = Array.from(new Set(placed.map(spot => spot.page)))
      setNotice({
        tone: warnings.length ? 'warning' : 'success',
        text: [`Found ${plural(placed.length, 'place')} asking for a stamp, on ${pages.length === 1 ? `page ${pages[0]}` : `pages ${pages.join(', ')}`}. Check each stamp below; drag one to move it.`, ...warnings].join(' '),
      })
    } else {
      setAdding(true)
      setNotice({
        tone: warnings.length ? 'warning' : 'info',
        text: [...warnings, 'No place asking for a stamp was found. Click on the page where the stamp should go.'].join(' '),
      })
    }
  }

  const chooseFile = (file: File | undefined | null) => {
    if (file && !busy) openFile(file)
  }

  const changeDesign = (change: Partial<StampDesign>) => {
    const next = { ...design, ...change }
    setDesign(next)
    if (!doc || !change.style || change.style === design.style) return
    // A new shape: resize every stamp, and re-place those not moved by hand.
    const ratio = defaultWidth(next.style) / defaultWidth(design.style)
    const kept = spots.filter(spot => spot.adjusted || !spot.foundId).map(spot => {
      const width = spot.width * ratio
      const page = doc.pages[spot.page - 1]
      return { ...spot, width, ...clampToPage(spot.x, spot.y, width, width * stampAspect(next.style), page) }
    })
    const replace = found.filter(item => spots.some(spot => spot.foundId === item.id && !spot.adjusted))
    setSpots([...kept, ...placeFound(doc, replace, next.style, kept)].sort(byPosition))
  }

  const updateSpot = (id: string, change: (spot: Spot, page: StampPage) => Partial<Spot>) => {
    if (!doc) return
    setSpots(current => current.map(spot => {
      if (spot.id !== id) return spot
      const page = doc.pages[spot.page - 1]
      const next = { ...spot, ...change(spot, page), adjusted: true }
      return { ...next, ...clampToPage(next.x, next.y, next.width, next.width * aspect, page) }
    }))
  }

  const removeSpot = (id: string) => {
    setSpots(current => current.filter(spot => spot.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const resetSpots = () => {
    if (!doc) return
    const placed = placeFound(doc, found, design.style).sort(byPosition)
    setSpots(placed)
    setSelectedId(placed[0]?.id || null)
  }

  const clickPage = (event: MouseEvent<HTMLDivElement>, page: StampPage) => {
    if (!adding) { setSelectedId(null); return }
    const frame = event.currentTarget.getBoundingClientRect()
    const width = defaultWidth(design.style)
    const point = clampToPage(
      (event.clientX - frame.left) / frame.width * page.width,
      (event.clientY - frame.top) / frame.height * page.height,
      width, width * aspect, page,
    )
    const spot: Spot = { id: newId(), page: page.number, ...point, width, label: 'Placed by hand', source: 'manual', foundId: null, adjusted: true }
    setSpots(current => [...current, spot].sort(byPosition))
    setSelectedId(spot.id)
    setAdding(false)
  }

  const startDrag = (event: PointerEvent<HTMLDivElement>, spot: Spot, page: StampPage) => {
    if (event.button !== 0 || busy) return
    event.stopPropagation()
    const frame = pageRefs.current[page.number]
    if (!frame) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: spot.id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: spot.x, y: spot.y, ptPerPx: page.width / frame.clientWidth }
    setSelectedId(spot.id)
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    const dx = (event.clientX - current.startX) * current.ptPerPx
    const dy = (event.clientY - current.startY) * current.ptPerPx
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return
    updateSpot(current.id, () => ({ x: current.x + dx, y: current.y + dy }))
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) drag.current = null
  }

  const nudge = (event: KeyboardEvent<HTMLDivElement>, spot: Spot) => {
    const step = event.shiftKey ? 10 : 2
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      updateSpot(spot.id, current => ({ x: current.x + move[0], y: current.y + move[1] }))
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      removeSpot(spot.id)
    } else if (event.key === 'Escape') {
      setSelectedId(null)
    }
  }

  const showSpot = (spot: Spot) => {
    setSelectedId(spot.id)
    pageRefs.current[spot.page]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const download = async () => {
    if (!doc || !spots.length || busy) return
    setPhase('saving')
    try {
      const result = await writeStampedDocument(doc, design, spots)
      downloadBlob(result.blob, result.downloadName)
      const item: ToolHistoryItem = {
        id: newId(),
        originalName: doc.file.name,
        downloadName: result.downloadName,
        size: result.blob.size,
        uploadedAt: new Date().toISOString(),
        document: result.blob,
      }
      let saved = true
      try {
        await saveHistoryItem(STAMP_HISTORY_STORE, item)
        setHistory(current => [item, ...current])
      } catch {
        saved = false
      }
      setNotice({
        tone: result.note ? 'warning' : 'success',
        text: [`Downloaded ${result.downloadName} with ${plural(spots.length, 'stamp')}.`, result.note, saved ? 'A copy is kept in the history below.' : ''].filter(Boolean).join(' '),
      })
    } catch (error: any) {
      setNotice({ tone: 'error', text: error?.message || 'The stamped document could not be made. Please try again.' })
    } finally {
      setPhase('ready')
    }
  }

  const removeHistoryItem = async (id: string) => {
    try {
      await deleteHistoryItem(STAMP_HISTORY_STORE, id)
      setHistory(current => current.filter(item => item.id !== id))
    } catch {
      setNotice({ tone: 'error', text: 'This document could not be removed from the history.' })
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  const outputLabel = doc?.kind === 'image' ? 'image' : 'PDF'

  return (
    <div className="space-y-6">
      <div
        className={`bg-white rounded-[20px] p-6 shadow-lg border transition-colors ${dragOver ? 'border-gold ring-2 ring-gold/40' : 'border-green-deep/10'}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-deep/10 text-green-deep px-3 py-1 rounded-full text-xs font-dm-sans font-semibold mb-4">
              <StampIcon size={14} weight="bold" /> Admin Tool
            </div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Document Stamp</h3>
            <p className="mt-2 max-w-2xl text-text-mid font-dm-sans leading-relaxed">
              Upload a PDF or a scanned page. The tool finds where the document asks for a stamp, such as a "Hospital stamp" box, and places the FXMed stamp there. Check it, adjust it if needed, then download the stamped copy.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 bg-gold hover:bg-gold-light disabled:opacity-60 disabled:cursor-not-allowed text-green-deep px-5 py-3 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            <UploadSimpleIcon size={18} weight="bold" /> {doc ? 'Choose Another' : 'Choose Document'}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={STAMP_ACCEPT}
          className="hidden"
          onChange={event => chooseFile(event.target.files?.[0])}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
            <div>
              <p className="text-sm font-dm-sans font-semibold text-green-deep">
                {doc ? doc.file.name : 'No document selected'}
              </p>
              <p className="mt-1 text-xs font-dm-sans text-text-mid">
                {doc
                  ? `${plural(doc.pages.length, 'page')} · ${formatFileSize(doc.file.size)}`
                  : 'PDF, PNG, JPG or WEBP, up to 25 MB. You can also drop a file here.'}
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Stamp</legend>
              <div className="inline-flex rounded-lg border border-green-deep/10 bg-white p-1">
                {([['round', 'Round seal'], ['rectangle', 'Rectangle']] as const).map(([style, label]) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={design.style === style}
                    disabled={busy}
                    onClick={() => changeDesign({ style })}
                    className={`px-4 py-2 rounded-md text-sm font-dm-sans font-semibold transition-colors ${design.style === style ? 'bg-green-deep text-cream' : 'text-green-deep hover:bg-green-deep/5'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Ink</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STAMP_INKS) as StampInk[]).map(ink => (
                  <button
                    key={ink}
                    type="button"
                    aria-pressed={design.ink === ink}
                    onClick={() => changeDesign({ ink })}
                    className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm font-dm-sans font-semibold text-green-deep transition-colors ${design.ink === ink ? 'border-green-deep ring-2 ring-gold/50' : 'border-green-deep/15 hover:border-green-mid'}`}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: STAMP_INKS[ink].color }} />
                    {STAMP_INKS[ink].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Date on the stamp</span>
                <input type="date" className="input" value={design.date} onChange={event => changeDesign({ date: event.target.value })} />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Wording</span>
                <select className="input" value={design.wording} onChange={event => changeDesign({ wording: event.target.value })}>
                  {STAMP_WORDINGS.map(wording => <option key={wording} value={wording}>{wording || 'None'}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-green-deep/10 bg-white p-4">
            {artwork
              ? <img src={artwork} alt="Preview of the FXMed stamp" className={design.style === 'round' ? 'h-48 w-48' : 'w-full max-w-[240px]'} style={{ opacity: STAMP_INK_OPACITY }} />
              : <div className="h-48 w-48 animate-pulse rounded-full bg-cream" />}
            <p className="mt-3 text-center text-xs font-dm-sans text-text-mid">
              Printed about {STAMP_DEFAULT_WIDTH_MM[design.style]} mm wide
            </p>
          </div>
        </div>

        {(phase === 'reading' || phase === 'checking') && (
          <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-green-deep/10 bg-cream/60 px-4 py-3 text-sm font-dm-sans text-green-deep">
            <SpinnerGapIcon size={18} className="animate-spin" /> {progress}
          </p>
        )}
        {notice && phase !== 'reading' && phase !== 'checking' && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-dm-sans leading-relaxed ${NOTICE_STYLES[notice.tone]}`}>
            {notice.tone === 'success' ? <CheckCircleIcon size={18} className="mt-0.5 shrink-0" /> : <WarningCircleIcon size={18} className="mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </p>
        )}
      </div>

      {doc && phase !== 'reading' && (
        <div className="bg-white rounded-[20px] shadow-lg border border-green-deep/10">
          <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-t-[20px] border-b border-green-deep/10 bg-white/95 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAdding(current => !current)}
                disabled={busy}
                aria-pressed={adding}
                className={adding ? 'primary' : 'secondary'}
              >
                {adding ? <CursorClickIcon size={16} weight="bold" /> : <PlusIcon size={16} weight="bold" />}
                {adding ? 'Click on a page…' : 'Add stamp'}
              </button>
              {found.length > 0 && spots.some(spot => spot.adjusted || !spot.foundId) && (
                <button type="button" onClick={resetSpots} disabled={busy} className="secondary">
                  <ArrowCounterClockwiseIcon size={16} weight="bold" /> Reset stamps
                </button>
              )}
              {selected && (
                <div className="flex flex-wrap items-center gap-3 rounded-full border border-green-deep/10 bg-cream/50 py-1.5 pl-4 pr-1.5">
                  <label className="flex items-center gap-2 text-sm font-dm-sans text-green-deep">
                    <span className="font-semibold">Size</span>
                    <input
                      type="range"
                      min={STAMP_MIN_WIDTH_MM}
                      max={STAMP_MAX_WIDTH_MM}
                      step={1}
                      value={toMm(selected.width)}
                      onChange={event => updateSpot(selected.id, () => ({ width: Number(event.target.value) * MM_TO_PT }))}
                      className="w-28 accent-green-deep"
                      aria-label="Stamp width in millimetres"
                    />
                    <span className="w-12 tabular-nums">{toMm(selected.width)} mm</span>
                  </label>
                  <button type="button" onClick={() => removeSpot(selected.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-dm-sans font-semibold text-red-600 hover:bg-red-50">
                    <TrashIcon size={15} weight="bold" /> Remove
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={download} disabled={busy || !spots.length} className="primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
              {phase === 'saving' ? <SpinnerGapIcon size={16} className="animate-spin" /> : <DownloadSimpleIcon size={16} weight="bold" />}
              {phase === 'saving' ? 'Stamping…' : `Download stamped ${outputLabel}`}
            </button>
          </div>

          <div className="grid gap-6 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-6">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h4 className="text-sm font-dm-sans font-semibold text-green-deep">{spots.length ? plural(spots.length, 'stamp') : 'No stamps yet'}</h4>
              <ul className="mt-3 space-y-2">
                {spots.map(spot => (
                  <li key={spot.id}>
                    <button
                      type="button"
                      onClick={() => showSpot(spot)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${spot.id === selectedId ? 'border-green-deep bg-green-deep/5' : 'border-green-deep/10 hover:border-green-mid'}`}
                    >
                      <span className="block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Page {spot.page}</span>
                      <span className="mt-0.5 block truncate text-sm font-dm-sans font-semibold text-green-deep">{spot.label || 'Stamp'}</span>
                      <span className="mt-0.5 block text-xs font-dm-sans text-text-mid">{SOURCE_LABELS[spot.source]}{spot.adjusted && spot.source !== 'manual' ? ', adjusted' : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-dm-sans leading-relaxed text-text-mid">
                Drag a stamp to move it. Select one to resize or remove it, or use the arrow keys to nudge it.
              </p>
            </aside>

            <div className="space-y-6">
              {doc.pages.map(page => (
                <section key={page.number} aria-label={`Page ${page.number}`}>
                  <p className="mb-2 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">
                    Page {page.number} of {doc.pages.length}{!page.hasText && doc.kind === 'pdf' ? ' · scanned' : ''}
                  </p>
                  <div
                    ref={element => { pageRefs.current[page.number] = element }}
                    onClick={event => clickPage(event, page)}
                    className={`relative mx-auto w-full max-w-[820px] select-none overflow-hidden border border-green-deep/15 bg-white shadow-sm ${adding ? 'cursor-crosshair ring-2 ring-gold/60' : ''}`}
                    style={{ aspectRatio: `${page.width} / ${page.height}` }}
                  >
                    <img src={page.preview} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
                    {artwork && spots.filter(spot => spot.page === page.number).map(spot => {
                      const height = spot.width * aspect
                      const isSelected = spot.id === selectedId
                      return (
                        <div
                          key={spot.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Stamp on page ${page.number}: ${spot.label}. Drag or use the arrow keys to move it; Delete removes it.`}
                          onPointerDown={event => startDrag(event, spot, page)}
                          onPointerMove={moveDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          onClick={event => { event.stopPropagation(); setSelectedId(spot.id) }}
                          onKeyDown={event => nudge(event, spot)}
                          onFocus={() => setSelectedId(spot.id)}
                          className={`absolute cursor-move touch-none outline-none ${isSelected ? 'z-10' : ''}`}
                          style={{
                            left: `${(spot.x - spot.width / 2) / page.width * 100}%`,
                            top: `${(spot.y - height / 2) / page.height * 100}%`,
                            width: `${spot.width / page.width * 100}%`,
                            height: `${height / page.height * 100}%`,
                          }}
                        >
                          <img src={artwork} alt="" draggable={false} className="pointer-events-none h-full w-full" style={{ opacity: STAMP_INK_OPACITY, mixBlendMode: 'multiply' }} />
                          {isSelected && <>
                            <span className={`pointer-events-none absolute -inset-1 border-2 border-dashed border-gold ${design.style === 'round' ? 'rounded-full' : 'rounded-md'}`} />
                            <button
                              type="button"
                              onPointerDown={event => event.stopPropagation()}
                              onClick={event => { event.stopPropagation(); removeSpot(spot.id) }}
                              aria-label="Remove this stamp"
                              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-green-deep text-white shadow hover:bg-red-600"
                            >
                              <XIcon size={14} weight="bold" />
                            </button>
                          </>}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Stamped Documents</h3>
            <p className="mt-1 text-sm text-text-mid font-dm-sans">Previously stamped documents saved on this browser.</p>
          </div>
          <button
            type="button"
            onClick={refreshHistory}
            className="border border-green-deep/20 text-green-deep hover:bg-green-deep/5 px-4 py-2 rounded-lg font-dm-sans font-semibold text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {historyState === 'loading' ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">Loading stamped documents...</div>
        ) : historyState === 'unavailable' ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">History is not available in this browser.</div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-green-deep/10 bg-cream/40 p-4 text-sm font-dm-sans text-text-mid">No documents have been stamped yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-green-deep/10 text-left">
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Document</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Stamped</th>
                  <th className="py-3 pr-4 text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Size</th>
                  <th className="py-3 text-right text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} className="border-b border-green-deep/10 last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-dm-sans font-semibold text-green-deep">{item.originalName}</p>
                      <p className="mt-1 text-xs font-dm-sans text-text-mid">{item.downloadName}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">{new Date(item.uploadedAt).toLocaleString()}</td>
                    <td className="py-4 pr-4 text-sm font-dm-sans text-text-mid">{formatFileSize(item.size)}</td>
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
    </div>
  )
}
