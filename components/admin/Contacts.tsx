'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AddressBookIcon, MapPinIcon } from '@phosphor-icons/react'

type ContactStatus = 'new' | 'contacted' | 'enrolled' | 'archived'

type Contact = {
  id: string
  full_name: string
  phone: string
  email?: string | null
  gender?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  health_concern?: string | null
  conditions?: string | null
  medications?: string | null
  blood_pressure?: string | null
  blood_sugar?: string | null
  outreach_event?: string | null
  status: ContactStatus
  notes?: string | null
  created_at: string
  updated_at: string
}

const STATUS_FILTERS: Array<'all' | ContactStatus> = ['all', 'new', 'contacted', 'enrolled', 'archived']

const statusBadge: Record<ContactStatus, string> = {
  new: 'bg-gold text-green-deep',
  contacted: 'bg-blue-100 text-blue-700',
  enrolled: 'bg-green-deep text-white',
  archived: 'bg-gray-200 text-gray-700',
}

function calcAge(dob?: string | null): string {
  if (!dob) return ''
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age >= 0 && age < 130 ? `${age} yrs` : ''
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [clinicalSaving, setClinicalSaving] = useState(false)
  const [clinicalMessage, setClinicalMessage] = useState('')

  const createClinicalPatient = async (contact: Contact) => {
    if (!contact.date_of_birth) { setClinicalMessage('Add the contact date of birth before creating a clinical record.'); return }
    const parts = contact.full_name.trim().split(/\s+/)
    setClinicalSaving(true)
    setClinicalMessage('')
    const sex = contact.gender?.toLowerCase() === 'female' || contact.gender?.toLowerCase() === 'male' ? contact.gender.toLowerCase() : 'unknown'
    const response = await fetch('/api/admin/emr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'patients', contact_id: contact.id, first_name: parts[0], last_name: parts.slice(1).join(' ') || 'Unknown', date_of_birth: contact.date_of_birth, sex, phone: contact.phone, email: contact.email, address: contact.address, city: contact.city, state: contact.state }) })
    const result = await response.json()
    setClinicalMessage(response.ok ? `Clinical record ${result.record.mrn} created.` : result.error || 'Unable to create clinical record.')
    setClinicalSaving(false)
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/contacts')
      if (!response.ok) throw new Error('Failed to fetch contacts')
      const { contacts: data } = await response.json()
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Keep the selected contact / notes draft in sync with refreshed data.
  useEffect(() => {
    if (selected) {
      const fresh = contacts.find((c) => c.id === selected.id) || null
      setSelected(fresh)
      setNotesDraft(fresh?.notes || '')
    }
  }, [contacts]) // eslint-disable-line react-hooks/exhaustive-deps

  const events = useMemo(() => {
    const set = new Set<string>()
    contacts.forEach((c) => { if (c.outreach_event) set.add(c.outreach_event) })
    return Array.from(set).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    return contacts.filter((c) =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (eventFilter === 'all' || c.outreach_event === eventFilter)
    )
  }, [contacts, statusFilter, eventFilter])

  const updateStatus = async (id: string, status: ContactStatus) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  const saveNotes = async (id: string) => {
    setSavingNotes(true)
    try {
      const response = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: notesDraft }),
      })
      if (!response.ok) throw new Error('Failed to save notes')
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, notes: notesDraft } : c)))
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setSavingNotes(false)
    }
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete contact')
      setContacts((prev) => prev.filter((c) => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const exportCsv = () => {
    const cols: Array<keyof Contact> = [
      'full_name', 'phone', 'email', 'gender', 'date_of_birth', 'marital_status',
      'address', 'city', 'state', 'health_concern', 'conditions', 'medications',
      'blood_pressure', 'blood_sugar', 'outreach_event', 'status', 'notes', 'created_at',
    ]
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = cols.join(',')
    const rows = filtered.map((c) => cols.map((col) => escape(c[col])).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const newCount = contacts.filter((c) => c.status === 'new').length

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-2xl font-dm-sans font-bold text-green-deep">Contacts</h3>
        <div className="flex items-center gap-4">
          <span className="bg-gold text-green-deep text-sm font-semibold px-3 py-1 rounded-full">
            {newCount} new
          </span>
          <button onClick={exportCsv} className="font-dm-sans text-green-deep text-sm font-medium hover:text-green-mid">
            Export CSV
          </button>
          <button onClick={fetchContacts} className="font-dm-sans text-green-deep text-sm font-medium hover:text-green-mid">
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full font-dm-sans text-sm font-medium capitalize transition-all ${
              statusFilter === status ? 'bg-green-deep text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
        {events.length > 0 && (
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="ml-auto px-3 py-2 rounded-lg border border-gray-300 font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-green-deep"
          >
            <option value="all">All outreaches</option>
            {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
          <p className="font-dm-sans text-text-mid">Loading contacts…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AddressBookIcon size={58} weight="duotone" className="mx-auto mb-4 text-green-mid" />
          <h3 className="text-xl font-dm-sans font-bold text-green-deep mb-2">No contacts</h3>
          <p className="font-dm-sans text-text-mid">
            Registrations from the <span className="font-semibold">/register</span> page will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelected(c); setNotesDraft(c.notes || '') }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selected?.id === c.id ? 'border-green-deep bg-green-deep/5'
                    : c.status === 'new' ? 'border-gold bg-gold/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-dm-sans font-semibold text-green-deep">{c.full_name}</h4>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusBadge[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <p className="font-dm-sans text-text-mid text-sm">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
                {c.outreach_event && (
                  <p className="mt-1 flex items-center gap-1 font-dm-sans text-xs text-text-mid"><MapPinIcon size={14} weight="fill" />{c.outreach_event}</p>
                )}
                <p className="font-dm-sans text-text-mid text-xs mt-1">{formatDate(c.created_at)}</p>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div className="bg-cream rounded-xl p-6 lg:sticky lg:top-6 self-start max-h-[70vh] overflow-y-auto">
            {selected ? (
              <div>
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div>
                    <h4 className="font-dm-sans font-bold text-green-deep text-xl">{selected.full_name}</h4>
                    {calcAge(selected.date_of_birth) && (
                      <p className="font-dm-sans text-text-mid text-sm">{calcAge(selected.date_of_birth)}{selected.gender ? ` · ${selected.gender}` : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selected.status}
                      onChange={(e) => updateStatus(selected.id, e.target.value as ContactStatus)}
                      className="px-3 py-1 rounded-lg border border-gray-300 font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-green-deep"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button onClick={() => deleteContact(selected.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                </div>

                <DetailSection title="Contact">
                  <DetailRow label="Phone" value={selected.phone} />
                  <DetailRow label="Email" value={selected.email} />
                </DetailSection>

                <DetailSection title="Biodata">
                  <DetailRow label="Gender" value={selected.gender} />
                  <DetailRow label="Date of birth" value={selected.date_of_birth} />
                  <DetailRow label="Marital status" value={selected.marital_status} />
                </DetailSection>

                <DetailSection title="Location">
                  <DetailRow label="Address" value={selected.address} />
                  <DetailRow label="City / Area" value={selected.city} />
                  <DetailRow label="State" value={selected.state} />
                </DetailSection>

                <DetailSection title="Health">
                  <DetailRow label="Main concern" value={selected.health_concern} />
                  <DetailRow label="Conditions" value={selected.conditions} />
                  <DetailRow label="Medications" value={selected.medications} />
                  <DetailRow label="Blood pressure" value={selected.blood_pressure} />
                  <DetailRow label="Blood sugar" value={selected.blood_sugar} />
                </DetailSection>

                <DetailSection title="Outreach">
                  <DetailRow label="Event" value={selected.outreach_event} />
                  <DetailRow label="Registered" value={formatDate(selected.created_at)} />
                </DetailSection>

                <button onClick={() => createClinicalPatient(selected)} disabled={clinicalSaving} className="primary w-full disabled:opacity-50">{clinicalSaving ? 'Creating record…' : 'Create clinical patient'}</button>
                {clinicalMessage && <p className="mt-2 rounded-lg bg-white p-3 text-sm text-text-mid">{clinicalMessage}</p>}

                <div className="mt-4">
                  <label className="block font-dm-sans font-semibold text-green-deep text-sm mb-2">Notes</label>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-green-deep bg-white"
                    placeholder="Add follow-up notes…"
                  />
                  <button
                    onClick={() => saveNotes(selected.id)}
                    disabled={savingNotes || notesDraft === (selected.notes || '')}
                    className="mt-2 bg-green-deep text-white px-4 py-2 rounded-lg font-dm-sans text-sm font-medium hover:bg-green-mid disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingNotes ? 'Saving…' : 'Save notes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AddressBookIcon size={42} weight="duotone" className="mx-auto mb-2 text-green-mid" />
                <p className="font-dm-sans text-text-mid">Select a contact to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h5 className="font-dm-sans font-bold text-green-deep text-sm uppercase tracking-wide mb-2">{title}</h5>
      <div className="bg-white rounded-lg p-3 space-y-1">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="font-dm-sans text-text-mid">{label}</span>
      <span className="font-dm-sans text-green-deep font-medium text-right break-words">{value || '—'}</span>
    </div>
  )
}
