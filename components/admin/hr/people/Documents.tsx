'use client'

import { useState } from 'react'
import { documentTypes, labelOf, restrictedDocumentTypes, type DocumentType } from '@/lib/hr'
import { documentStatuses, hrDocumentMimeTypes } from '@/lib/hr-people'
import type { FileDocument } from './types'
import { Badge, Empty, Field, buttonPrimary, buttonSecondary, call, formatDay, peopleApi } from './ui'

const api = `${peopleApi}/documents`
const adminIssued: DocumentType[] = ['contract', 'offer_letter', 'payslip', 'letter']

export default function Documents({ employeeId, documents, admin, canUpload, onChange, onError }: { employeeId: string; documents: FileDocument[]; admin: boolean; canUpload: boolean; onChange: () => void; onError: (message: string) => void }) {
  const [type, setType] = useState<DocumentType>('certificate'); const [title, setTitle] = useState(''); const [file, setFile] = useState<File | null>(null); const [restricted, setRestricted] = useState(false); const [busy, setBusy] = useState(false)
  const forced = restrictedDocumentTypes.includes(type)
  async function run(action: () => Promise<unknown>) { setBusy(true); onError(''); try { await action(); onChange() } catch (error) { onError((error as Error).message) } setBusy(false) }
  async function open(doc: FileDocument) { try { const { url } = await call<{ url: string }>(`${api}?id=${doc.id}`); window.open(url, '_blank', 'noopener,noreferrer') } catch (error) { onError((error as Error).message) } }
  function upload() {
    if (!file) return onError('Choose a file to upload.')
    const form = new FormData(); form.set('file', file); form.set('document_type', type); form.set('title', title); if (admin) { form.set('employee_id', employeeId); form.set('is_restricted', String(restricted)) }
    return run(async () => { await call(api, 'POST', form); setFile(null); setTitle('') })
  }
  return <div>
    {!documents.length ? <Empty>No documents on file yet.</Empty> : <div className="divide-y">{documents.map((doc) => <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-green-deep">{doc.title}</p><Badge tone={doc.status === 'verified' ? 'bg-green-50 text-green-700' : doc.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}>{labelOf(documentStatuses, doc.status)}</Badge>{doc.is_restricted && <Badge tone="bg-purple-50 text-purple-700">Restricted</Badge>}</div>
        <p className="mt-1 text-xs text-gray-500">{labelOf(documentTypes, doc.document_type)} · added {formatDay(doc.created_at)}{doc.original_seen_at ? ` · original seen ${formatDay(doc.original_seen_at)}` : ''}{doc.verified_at ? ` · verified ${formatDay(doc.verified_at)} (${doc.verification_method})` : ''}{admin && doc.retention_until ? ` · keep until ${formatDay(doc.retention_until)}` : ''}</p></div>
      <div className="flex flex-wrap gap-2">{doc.can_open ? <button onClick={() => open(doc)} className={buttonSecondary}>Open</button> : <span className="text-xs text-gray-500">Held by People Ops</span>}
        {admin && <>{!doc.original_seen_at && <button disabled={busy} onClick={() => run(() => call(api, 'PATCH', { id: doc.id, action: 'original_seen' }))} className={buttonSecondary}>Original seen</button>}
          {doc.status !== 'verified' && <button disabled={busy} onClick={() => { const method = prompt('How was it verified? (e.g. council portal, institution letter)'); if (method) run(() => call(api, 'PATCH', { id: doc.id, action: 'verify', verification_method: method })) }} className={buttonSecondary}>Verify</button>}
          {doc.status === 'uploaded' && <button disabled={busy} onClick={() => run(() => call(api, 'PATCH', { id: doc.id, action: 'reject', verification_method: prompt('Reason for rejecting (optional)') || '' }))} className={buttonSecondary}>Reject</button>}
          {!restrictedDocumentTypes.includes(doc.document_type) && <button disabled={busy} onClick={() => run(() => call(api, 'PATCH', { id: doc.id, document_type: doc.document_type, title: doc.title, retention_until: doc.retention_until, is_restricted: !doc.is_restricted }))} className={buttonSecondary}>{doc.is_restricted ? 'Unrestrict' : 'Restrict'}</button>}
          <button disabled={busy} onClick={() => { const reason = prompt(`Delete the file "${doc.title}"? The file is removed and the deletion is logged. Give the reason or retention rule:`); if (reason) run(() => call(`${api}?id=${doc.id}&reason=${encodeURIComponent(reason)}`, 'DELETE')) }} className="px-2 text-xs font-bold text-red-600">Delete</button></>}
      </div></div>)}</div>}
    {canUpload && <div className="border-t bg-[#fbfaf6] p-6"><h4 className="font-bold text-green-deep">Upload a document</h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-3"><Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className="input">{documentTypes.filter((t) => admin || !adminIssued.includes(t.value)).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Title" hint="optional"><input maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={file?.name || 'e.g. NIN slip'} /></Field>
        <Field label="File" hint="PDF, image or Word, up to 15 MB"><input type="file" accept={hrDocumentMimeTypes.join(',')} onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" /></Field></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-mid">{forced ? 'Health and background documents are always restricted: only People Ops and the MD can open them.' : admin ? <label className="flex items-center gap-2"><input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />Restricted (People Ops and MD only)</label> : 'Your line manager cannot see your documents.'}</p><button disabled={busy || !file} onClick={upload} className={buttonPrimary}>{busy ? 'Uploading…' : 'Upload'}</button></div>
    </div>}
  </div>
}
