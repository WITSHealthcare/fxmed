'use client'

import { useEffect, useState } from 'react'
import type { InvestigationOrder, InvestigationReport } from '@/lib/investigations'

// The Health Analysis details for a patient the team added, filled in from
// their patient record rather than from the online form. The record is loaded
// each time the details are opened, so they always show it as it is now.

const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const when = (value: unknown) => {
  if (!value) return ''
  const text = String(value)
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text)
  return Number.isNaN(parsed.getTime()) ? text : day.format(parsed)
}
const words = (value: unknown) => String(value || '').replace(/_/g, ' ')
const capital = (value: unknown) => { const text = words(value); return text ? text.charAt(0).toUpperCase() + text.slice(1) : '' }
const flagged = (flag: string) => flag === 'High' || flag === 'Low' || flag === 'Abnormal'

function ageOf(dob?: string | null) {
  if (!dob) return ''
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--
  return years >= 0 ? `${years} years` : ''
}

// Styled like the online-form sections, with "Not recorded" for gaps.
function Section({ title, fields, columns = 2 }: { title: string; fields: Array<[string, string]>; columns?: 1 | 2 }) {
  return <div className="mb-8">
    <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">{title}</h3>
    <div className={`grid grid-cols-1 gap-4 rounded-lg bg-cream p-4 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
      {fields.map(([label, value]) => <div key={label}>
        <p className="font-dm-sans text-sm text-text-mid">{label}</p>
        <p className={`font-dm-sans whitespace-pre-wrap ${value ? 'font-medium text-gray-900' : 'italic text-gray-400'}`}>{value || 'Not recorded'}</p>
      </div>)}
    </div>
  </div>
}

export default function HealthAnalysisFromRecord({ patientId, onOpenRecord }: { patientId: string; onOpenRecord?: () => void }) {
  const [chart, setChart] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/emr?resource=patient&patientId=${patientId}`)
      .then(async response => {
        const result = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok) setChart(result)
        else setError(result.error || 'The patient record could not be loaded.')
      })
      .catch(() => { if (!cancelled) setError('The patient record could not be loaded.') })
    return () => { cancelled = true }
  }, [patientId])

  if (error) return <p role="alert" className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 font-dm-sans text-sm text-red-700">{error}</p>
  if (!chart) return <div className="mb-8 flex items-center gap-3 rounded-lg bg-cream p-6 font-dm-sans text-sm text-text-mid"><span className="h-5 w-5 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" />Loading the patient record…</div>
  return <RecordView chart={chart} onOpenRecord={onOpenRecord} />
}

/** The sections, from a patient chart as the EMR API returns it. */
export function RecordView({ chart, onOpenRecord }: { chart: Record<string, any>; onOpenRecord?: () => void }) {
  const p = chart.patient || {}
  const encounters: any[] = chart.encounters || []
  // The most recent encounter that recorded this field, with when it was.
  const latest = (field: string) => {
    const encounter = encounters.find(item => String(item[field] || '').trim())
    return encounter ? `${encounter[field]}\n(${capital(encounter.encounter_type)}, ${when(encounter.started_at || encounter.created_at)})` : ''
  }
  const vitals = (chart.vitals || [])[0]
  const vitalsText = vitals ? `${[
    vitals.systolic_bp && vitals.diastolic_bp && `BP ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg`,
    vitals.heart_rate && `heart rate ${vitals.heart_rate} bpm`, vitals.weight_kg && `weight ${vitals.weight_kg} kg`,
    vitals.bmi && `BMI ${vitals.bmi}`, vitals.blood_glucose && `glucose ${vitals.blood_glucose}`,
  ].filter(Boolean).join(' · ') || 'No readings'}\n(${when(vitals.recorded_at)})` : ''
  const activeMedications = (chart.medications || []).filter((item: any) => item.status === 'active')
    .map((item: any) => `${[item.medication_name, item.strength].filter(Boolean).join(' ')}: ${[item.dose, words(item.route), item.frequency].filter(Boolean).join(', ')}`).join('\n')
  const allergies = (chart.allergies || []).filter((item: any) => item.status === 'active')
    .map((item: any) => `${item.allergen}${item.reaction ? ` (${item.reaction})` : ''}`).join('\n')
  const conditions = (chart.diagnoses || []).filter((item: any) => item.status === 'active')
    .map((item: any) => `${item.diagnosis_name}${item.icd10_code ? ` [${item.icd10_code}]` : ''}, since ${when(item.diagnosed_at)}`).join('\n')
  const carePlans = (chart.carePlans || []).filter((item: any) => item.status === 'active')
    .map((item: any) => `${item.title}${item.goals ? `: ${item.goals}` : ''}`).join('\n\n')
  const today = new Date().toISOString().slice(0, 10)
  const nextAppointment = (chart.appointments || []).filter((item: any) => item.preferred_date >= today && item.status !== 'cancelled')
    .sort((a: any, b: any) => a.preferred_date.localeCompare(b.preferred_date))[0]
  const openFollowUps = (chart.tasks || []).filter((item: any) => item.status === 'pending' || item.status === 'in_progress')
    .map((item: any) => `${item.title}${item.due_at ? `, due ${when(item.due_at)}` : ''}`).join('\n')

  const orders: InvestigationOrder[] = chart.investigationOrders || []
  const reports: InvestigationReport[] = chart.investigationReports || []
  const awaiting = orders.filter(order => order.status === 'awaiting_results')
  const orderTitle = (id: string | null) => orders.find(order => order.id === id)?.panelTitle

  return <>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 p-4">
      <p className="font-dm-sans text-sm text-green-deep">Filled in from {[p.first_name, p.last_name].filter(Boolean).join(' ')}'s patient record ({p.mrn}), as it is now.</p>
      {onOpenRecord && <button type="button" onClick={onOpenRecord} className="rounded-full bg-green-deep px-4 py-2 font-dm-sans text-xs font-semibold text-white hover:bg-green-mid">Open patient record</button>}
    </div>

    <Section title="Patient Information" fields={[
      ['Name', [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')],
      ['MRN', p.mrn],
      ['Age/Sex', [ageOf(p.date_of_birth), capital(p.sex)].filter(Boolean).join(' • ')],
      ['Date of birth', when(p.date_of_birth)],
      ['Email', p.email],
      ['Phone', p.phone],
      ['Address', [p.address, p.city, p.state].filter(Boolean).join(', ')],
      ['Blood group / genotype', [p.blood_group, p.genotype].filter(Boolean).join(' / ')],
    ]} />

    <Section title="Health Concerns" columns={1} fields={[
      ['Primary concern', latest('chief_complaint')],
      ['History of presenting illness', latest('history_presenting_illness')],
      ['Clinical assessment', latest('clinical_assessment')],
    ]} />

    <Section title="Lifestyle and Vital Signs" fields={[
      ['Social history', latest('social_history')],
      ['Latest vital signs', vitalsText],
    ]} />

    <Section title="Medical History" fields={[
      ['Current medications', activeMedications],
      ['Allergies', allergies],
      ['Existing conditions', conditions],
      ['Past medical history', latest('past_medical_history')],
      ['Past surgeries', latest('surgical_history')],
      ['Family history', latest('family_history')],
    ]} />

    <Section title="Health Goals and Plan" fields={[
      ['Care plan goals', carePlans],
      ['Treatment plan', latest('treatment_plan')],
      ['Open follow-ups', openFollowUps],
      ['Next appointment', nextAppointment ? `${when(nextAppointment.preferred_date)}${nextAppointment.preferred_time ? ` at ${nextAppointment.preferred_time}` : ''}, ${words(nextAppointment.consultation_type)}` : ''],
    ]} />

    <div className="mb-8">
      <h3 className="font-dm-sans font-bold text-green-deep text-lg mb-4">Investigations</h3>
      {!reports.length && !awaiting.length && <p className="rounded-lg bg-cream p-4 font-dm-sans italic text-gray-400">No investigation results recorded</p>}
      {awaiting.length > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <p className="font-dm-sans text-sm font-semibold text-amber-800">Awaiting results</p>
        <ul className="mt-1 space-y-1">{awaiting.map(order => <li key={order.id} className="font-dm-sans text-sm text-gray-900">{order.panelTitle}, ordered {when(order.createdAt)} ({order.tests.length} test{order.tests.length === 1 ? '' : 's'})</li>)}</ul>
      </div>}
      <div className="space-y-4">{reports.map(report => <div key={report.id} className="rounded-lg bg-cream p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-dm-sans font-semibold text-green-deep">{orderTitle(report.orderId) || report.reportMeta.reportTitle}</h4>
          <span className="font-dm-sans text-xs text-text-mid">{report.reportMeta.reportedAt ? `Reported ${report.reportMeta.reportedAt} · ` : ''}saved {when(report.updatedAt || report.createdAt)}</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-green-deep/10 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-green-deep/10 text-left text-xs uppercase tracking-wide text-text-mid"><th className="px-3 py-2 font-semibold">Test</th><th className="px-3 py-2 font-semibold">Result</th><th className="px-3 py-2 font-semibold">Reference range</th><th className="px-3 py-2 font-semibold">Flag</th></tr></thead>
            <tbody>{report.results.map((row, index) => <tr key={`${row.test}-${index}`} className={`border-b border-green-deep/5 last:border-0 ${flagged(row.flag) ? 'bg-red-50/50' : ''}`}>
              <td className="px-3 py-2 font-dm-sans font-medium text-gray-900">{row.test}</td>
              <td className={`px-3 py-2 font-dm-sans font-semibold ${flagged(row.flag) ? 'text-red-700' : 'text-gray-900'}`}>{row.result}{row.unit ? ` ${row.unit}` : ''}</td>
              <td className="px-3 py-2 font-dm-sans text-text-mid">{row.referenceRange || '—'}</td>
              <td className={`px-3 py-2 font-dm-sans text-xs font-bold ${flagged(row.flag) ? 'text-red-700' : 'text-text-mid'}`}>{row.flag || '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {report.reportMeta.notes && <p className="mt-3 font-dm-sans text-sm text-gray-700"><span className="font-semibold">Clinical notes:</span> {report.reportMeta.notes}</p>}
      </div>)}</div>
    </div>
  </>
}
