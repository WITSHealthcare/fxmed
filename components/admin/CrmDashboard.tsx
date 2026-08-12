'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  useDroppable,
  MouseSensor,
  TouchSensor
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Stage = "Outreach" | "Follow Up" | "Enrolment" | "Onboarding" | "Active"
type NavItem = "overview" | "pipeline" | "coordinator" | "documents" | "reporting" | "ai-agent"
type Risk = "High" | "Medium" | "Low"
type CrmView = "clinical" | "financial"

type Note = {
  text: string
  timestamp: string
}

type Patient = {
  id: string
  name: string
  age: number
  program: string
  risk: Risk
  stage: Stage
  source: string
  specifySource?: string
  specify_source?: string
  owner: string
  phone: string
  email: string
  lastTouch: string
  nextStep: string
  nextDate: string
  progress: number
  tags: string[]
  preferred: string
  appointment: string
  consentStatus: string
  documentCount: number
  reminderStatus: string
  notes?: Note[]
  note?: string // Temporary field for edit modal
}

type Task = {
  id: number
  title: string
  priority: "High" | "Medium" | "Low"
  due: string
  owner: string
}

type Appointment = {
  id: number
  patientId: string
  title: string
  date: string
  time: string
  mode: string
  owner: string
}

type WebsiteAppointment = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  home_address: string
  consultation_type: 'telemedicine' | 'home-visit'
  preferred_date: string
  preferred_time: string
  symptoms: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  teams_meeting_url?: string | null
  ms_booking_appointment_id?: string | null
  created_at: string
  updated_at: string
}

type DocumentItem = {
  name: string
  category: string
  status: string
}

type Reminder = {
  id: number
  type: string
  patientId: string
  channel: string
  status: string
  sendAt: string
}

type AgentMessage = {
  role: "assistant" | "user"
  text: string
}

type AgentSuggestion = {
  title: string
  detail: string
  action: string
}

type FinancialSection = "dashboard" | "tasks" | "pipeline" | "scenarios"

type RevenueStreamPlan = {
  id: string
  name: string
  target: number
  secured: number
  source_type: "default" | "manual" | "specific-source"
  hidden?: boolean
}

type FinancialTaskItem = {
  id: string
  title: string
  due_date: string
  category: "corporate" | "government" | "elderly" | "hmo" | "premium" | "ops"
  done: boolean
  priority: "High" | "Medium" | "Low"
}

type FinancialTaskBucket = {
  id: "overdue" | "today" | "week" | "later" | "done"
  label: string
  tasks: FinancialTaskItem[]
}

type FinancialDealStatus = "cold" | "warm" | "hot" | "won"
type FinancialDeal = {
  id: string
  company: string
  type: string
  value: number
  status: FinancialDealStatus
  notes: string
}

type FinancialExpense = {
  id: string
  description: string
  amount: number
  expense_date: string
}

const financialTaskCategories: Array<{ id: "all" | FinancialTaskItem["category"]; label: string }> = [
  { id: "all", label: "All" },
  { id: "corporate", label: "Corporate" },
  { id: "government", label: "Government" },
  { id: "elderly", label: "Elderly Care" },
  { id: "hmo", label: "HMO" },
  { id: "premium", label: "Premium" },
  { id: "ops", label: "Ops" },
]

const financialTaskCategoryLabels = financialTaskCategories.reduce((labels, category) => {
  labels[category.id] = category.label
  return labels
}, {} as Record<"all" | FinancialTaskItem["category"], string>)

const priorityRank: Record<FinancialTaskItem["priority"], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const formatTaskDate = (value: string) => {
  return parseDateInput(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getDayDiff = (value: string, todayValue = formatDateInput(new Date())) => {
  const due = parseDateInput(value).getTime()
  const today = parseDateInput(todayValue).getTime()
  return Math.round((due - today) / 86400000)
}

const getRelativeDueLabel = (value: string, todayValue = formatDateInput(new Date())) => {
  const diff = getDayDiff(value, todayValue)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff <= 7) return `${diff}d left`
  return formatTaskDate(value)
}

const sortFinancialTasks = (tasks: FinancialTaskItem[]) => {
  return [...tasks].sort((a, b) => {
    const dateDiff = a.due_date.localeCompare(b.due_date)
    if (dateDiff !== 0) return dateDiff
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.title.localeCompare(b.title)
  })
}

interface CrmDashboardProps {
  patients: Patient[]
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>
  crmView: CrmView
  showLeadModal: boolean
  setShowLeadModal: (show: boolean) => void
  leadForm: {
    name: string
    phone: string
    email: string
    source: string
    specifySource: string
    program: string
    owner: string
    risk: Risk
    consent: boolean
  }
  setLeadForm: (form: any) => void
  createLead: () => Promise<void>
}

const patientsSeed: Patient[] = [
  {
    id: "FX001",
    name: "Amara Okafor",
    age: 52,
    program: "Cardiometabolic Care",
    risk: "High",
    stage: "Outreach",
    source: "Physician Referral",
    specifySource: "",
    owner: "Tola",
    phone: "(713) 555-0189",
    email: "amara@sample.com",
    lastTouch: "Today",
    nextStep: "Call to discuss enrollment",
    nextDate: "Mar 24",
    progress: 15,
    tags: ["Hypertension", "Prediabetes"],
    preferred: "Phone",
    appointment: "Mar 24 • 10:30 AM",
    consentStatus: "Pending",
    documentCount: 2,
    reminderStatus: "Urgent",
  },
  {
    id: "FX002",
    name: "Chinedu Adeyemi",
    age: 46,
    program: "Executive Concierge",
    risk: "Medium",
    stage: "Enrolment",
    source: "Website Lead",
    specifySource: "",
    owner: "Maya",
    phone: "(832) 555-0127",
    email: "chinedu@sample.com",
    lastTouch: "Yesterday",
    nextStep: "Send consent forms",
    nextDate: "Mar 25",
    progress: 35,
    tags: ["Busy executive", "Needs labs"],
    preferred: "Email",
    appointment: "Mar 25 • 1:00 PM",
    consentStatus: "Sent",
    documentCount: 4,
    reminderStatus: "Scheduled",
  },
  {
    id: "FX003",
    name: "Nneka Johnson",
    age: 39,
    program: "Weight & Metabolic Reset",
    risk: "Low",
    stage: "Onboarding",
    source: "Community Event",
    specifySource: "",
    owner: "Tola",
    phone: "(281) 555-0110",
    email: "nneka@sample.com",
    lastTouch: "2 days ago",
    nextStep: "Complete intake questionnaire",
    nextDate: "Mar 26",
    progress: 60,
    tags: ["Postpartum", "Nutrition"],
    preferred: "Text",
    appointment: "Mar 26 • 11:15 AM",
    consentStatus: "Signed",
    documentCount: 6,
    reminderStatus: "Scheduled",
  },
  {
    id: "FX004",
    name: "Kemi Brown",
    age: 58,
    program: "Cardiometabolic Care",
    risk: "High",
    stage: "Follow Up",
    source: "Hospital Partner",
    specifySource: "",
    owner: "Ade",
    phone: "(346) 555-0141",
    email: "kemi@sample.com",
    lastTouch: "Today",
    nextStep: "Review BP logs and refill needs",
    nextDate: "Mar 24",
    progress: 85,
    tags: ["Diabetes", "RPM"],
    preferred: "Phone",
    appointment: "Mar 24 • 3:45 PM",
    consentStatus: "Signed",
    documentCount: 8,
    reminderStatus: "Sent",
  },
  {
    id: "FX005",
    name: "Tunde Ellis",
    age: 50,
    program: "Executive Concierge",
    risk: "Medium",
    stage: "Active",
    source: "Employer Partnership",
    specifySource: "",
    owner: "Maya",
    phone: "(713) 555-0172",
    email: "tunde@sample.com",
    lastTouch: "3 days ago",
    nextStep: "Schedule quarterly check-in",
    nextDate: "Mar 29",
    progress: 100,
    tags: ["Travel-heavy", "Preventive"],
    preferred: "Email",
    appointment: "Mar 29 • 9:00 AM",
    consentStatus: "Signed",
    documentCount: 10,
    reminderStatus: "Scheduled",
  },
  {
    id: "FX006",
    name: "Folake Mensah",
    age: 61,
    program: "Weight & Metabolic Reset",
    risk: "High",
    stage: "Enrolment",
    source: "Past Patient Referral",
    specifySource: "",
    owner: "Ade",
    phone: "(832) 555-0193",
    email: "folake@sample.com",
    lastTouch: "Yesterday",
    nextStep: "Verify insurance and payment option",
    nextDate: "Mar 24",
    progress: 40,
    tags: ["Obesity", "Sleep issues"],
    preferred: "Phone",
    appointment: "Mar 24 • 4:30 PM",
    consentStatus: "Sent",
    documentCount: 3,
    reminderStatus: "Urgent",
  },
]

const tasksSeed: Task[] = [
  { id: 1, title: "Call 6 high-risk outreach leads", priority: "High", due: "Today", owner: "Tola" },
  { id: 2, title: "Review incomplete onboarding forms", priority: "Medium", due: "Today", owner: "Ade" },
  { id: 3, title: "Send welcome packet to new enrollees", priority: "Medium", due: "Tomorrow", owner: "Maya" },
  { id: 4, title: "Prepare follow-up list for RPM patients", priority: "High", due: "Tomorrow", owner: "Ade" },
]

const appointmentsSeed: Appointment[] = [
  { id: 1, patientId: "FX001", title: "Enrollment Call", date: "Mar 24", time: "10:30 AM", mode: "Phone", owner: "Tola" },
  { id: 2, patientId: "FX004", title: "Follow-Up Review", date: "Mar 24", time: "3:45 PM", mode: "Virtual", owner: "Ade" },
  { id: 3, patientId: "FX006", title: "Benefits Verification", date: "Mar 24", time: "4:30 PM", mode: "Phone", owner: "Ade" },
  { id: 4, patientId: "FX002", title: "Consent Walkthrough", date: "Mar 25", time: "1:00 PM", mode: "Virtual", owner: "Maya" },
  { id: 5, patientId: "FX003", title: "Onboarding Session", date: "Mar 26", time: "11:15 AM", mode: "In Person", owner: "Tola" },
  { id: 6, patientId: "FX005", title: "Quarterly Concierge Check-In", date: "Mar 29", time: "9:00 AM", mode: "Virtual", owner: "Maya" },
]

const documentsSeed: Record<string, DocumentItem[]> = {
  FX001: [
    { name: "Referral Summary.pdf", category: "Referral", status: "Received" },
    { name: "Consent Packet.pdf", category: "Consent", status: "Pending Signature" },
  ],
  FX002: [
    { name: "Membership Agreement.pdf", category: "Consent", status: "Sent" },
    { name: "Insurance Intake.pdf", category: "Enrollment", status: "Received" },
    { name: "Executive Labs Order.pdf", category: "Clinical", status: "Ready" },
  ],
  FX003: [
    { name: "Onboarding Questionnaire.pdf", category: "Onboarding", status: "Completed" },
    { name: "Nutrition Starter Guide.pdf", category: "Education", status: "Shared" },
  ],
  FX004: [
    { name: "RPM Device Consent.pdf", category: "Consent", status: "Signed" },
    { name: "BP Log March.pdf", category: "Monitoring", status: "Updated" },
  ],
  FX005: [{ name: "Quarterly Review.pdf", category: "Follow-Up", status: "Ready" }],
  FX006: [{ name: "Benefits Verification.pdf", category: "Enrollment", status: "Pending" }],
}

const remindersSeed: Reminder[] = [
  { id: 1, type: "Consent Reminder", patientId: "FX001", channel: "SMS", status: "Queued", sendAt: "Today • 5:00 PM" },
  { id: 2, type: "Appointment Reminder", patientId: "FX004", channel: "Call", status: "Sent", sendAt: "Today • 2:00 PM" },
  { id: 3, type: "Lab Completion Reminder", patientId: "FX002", channel: "Email", status: "Scheduled", sendAt: "Tomorrow • 8:00 AM" },
  { id: 4, type: "Follow-up Check-in", patientId: "FX006", channel: "SMS", status: "Queued", sendAt: "Tomorrow • 9:30 AM" },
]

const revenueStreamSeed: RevenueStreamPlan[] = [
  { id: "corporate", name: "Corporate Wellness Screenings", target: 27000000, secured: 0, source_type: "default" },
  { id: "government", name: "Government Pilot (LASPEC)", target: 12000000, secured: 0, source_type: "default" },
  { id: "elderly", name: "Elderly Care Retainers", target: 9000000, secured: 0, source_type: "default" },
  { id: "hmo", name: "HMO Partnerships", target: 6000000, secured: 0, source_type: "default" },
  { id: "premium", name: "Premium Founding Members", target: 9000000, secured: 0, source_type: "default" },
  { id: "self-referral", name: "Self Referral", target: 10000000, secured: 0, source_type: "default" },
]

const mergeRevenueStreamDefaults = (streams: RevenueStreamPlan[]) => {
  const streamIds = new Set(streams.map((stream) => stream.id))
  const missingDefaults = revenueStreamSeed.filter((stream) => !streamIds.has(stream.id))
  return [...streams, ...missingDefaults]
}

const financialDealSeed: FinancialDeal[] = [
  { id: "d1", company: "GTBank", type: "Corporate", value: 2500000, status: "warm", notes: "CHRO meeting scheduled" },
  { id: "d2", company: "LASPEC", type: "Government", value: 6000000, status: "cold", notes: "Awaiting intro" },
  { id: "d3", company: "The Haven", type: "Elderly Care", value: 450000, status: "warm", notes: "Site visit planned" },
  { id: "d4", company: "Hygeia HMO", type: "HMO", value: 1500000, status: "hot", notes: "Proposal sent" },
]

const specificSourceTagPrefix = "Specific Source: "

const getSpecificSource = (patient: Patient) => {
  const directSource = (patient.specifySource || patient.specify_source || "").trim()
  if (directSource) return directSource

  const sourceTag = patient.tags?.find((tag) => tag.startsWith(specificSourceTagPrefix))
  return sourceTag?.slice(specificSourceTagPrefix.length).trim() || ""
}

const getSpecificSourceStreamId = (specificSource: string) => {
  return `specific-source-${specificSource.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
}

const selfReferralStreamId = "self-referral"
const defaultSpecificSourceStreamTarget = 10000000

const parseMoneyInput = (value: string) => {
  const parsed = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export default function CrmDashboard({
  patients,
  setPatients,
  crmView,
  showLeadModal,
  setShowLeadModal,
  leadForm,
  setLeadForm,
  createLead
}: CrmDashboardProps) {
  const [selectedId, setSelectedId] = useState<string>(patients[0]?.id || "")
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("All")
  const [riskFilter, setRiskFilter] = useState<string>("All")
  const [activeSection, setActiveSection] = useState<NavItem>("overview")
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showAgentPanel, setShowAgentPanel] = useState(true)
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    { role: "assistant", text: "Welcome to FXMED CRM! I can help you manage patient outreach, track consent status, and optimize your enrollment pipeline. What would you like to focus on today?" }
  ])

  // Appointments state
  const [appointments, setAppointments] = useState<WebsiteAppointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [financialSection, setFinancialSection] = useState<FinancialSection>("dashboard")
  const [revenueStreams, setRevenueStreams] = useState<RevenueStreamPlan[]>(revenueStreamSeed)
  const [financialTasks, setFinancialTasks] = useState<FinancialTaskItem[]>([])
  const [financialTaskFilter, setFinancialTaskFilter] = useState<"all" | FinancialTaskItem["category"]>("all")
  const [financialTaskDateFilter, setFinancialTaskDateFilter] = useState("")
  const [financialDeals, setFinancialDeals] = useState<FinancialDeal[]>(financialDealSeed)
  const [financialExpenses, setFinancialExpenses] = useState<FinancialExpense[]>([])
  const [openRevenueMenuId, setOpenRevenueMenuId] = useState<string | null>(null)
  const [showNewStreamModal, setShowNewStreamModal] = useState(false)
  const [editingRevenueTarget, setEditingRevenueTarget] = useState<{
    id: string
    type: "planned" | "specific-source"
    name: string
    value: string
  } | null>(null)
  const [newStreamForm, setNewStreamForm] = useState({ name: "", target: "", secured: "" })
  const [newExpenseForm, setNewExpenseForm] = useState({ description: "", amount: "" })
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    due_date: formatDateInput(new Date()),
    priority: "Medium" as FinancialTaskItem["priority"],
    category: "ops" as FinancialTaskItem["category"],
  })
  const [newDeal, setNewDeal] = useState({
    company: "",
    type: "Corporate",
    value: "",
    status: "cold" as FinancialDealStatus,
    notes: "",
  })

  // Drag and drop state
  const [activeDragPatient, setActiveDragPatient] = useState<Patient | null>(null)

  // Patient detail modal state
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [savingPatient, setSavingPatient] = useState(false)

  const fetchRevenueStreams = async () => {
    try {
      const response = await fetch('/api/financial/revenue-streams')
      if (!response.ok) throw new Error('Failed to fetch revenue streams')

      const { streams } = await response.json()
      setRevenueStreams(mergeRevenueStreamDefaults(streams || revenueStreamSeed))
    } catch (error) {
      console.error('Error fetching revenue streams:', error)
      setRevenueStreams(revenueStreamSeed)
    }
  }

  const fetchFinancialExpenses = async () => {
    try {
      const response = await fetch('/api/financial/expenses')
      if (!response.ok) throw new Error('Failed to fetch expenses')

      const { expenses } = await response.json()
      setFinancialExpenses(expenses || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setFinancialExpenses([])
    }
  }

  const fetchFinancialTasks = async () => {
    try {
      const response = await fetch('/api/financial/tasks')
      if (!response.ok) throw new Error('Failed to fetch financial tasks')

      const { tasks } = await response.json()
      setFinancialTasks(tasks || [])
    } catch (error) {
      console.error('Error fetching financial tasks:', error)
      setFinancialTasks([])
    }
  }

  const fetchFinancialDeals = async () => {
    try {
      const response = await fetch('/api/financial/deals')
      if (!response.ok) throw new Error('Failed to fetch financial deals')

      const { deals } = await response.json()
      setFinancialDeals((deals || []).map((deal: FinancialDeal) => ({
        ...deal,
        value: Number(deal.value || 0),
      })))
    } catch (error) {
      console.error('Error fetching financial deals:', error)
      setFinancialDeals(financialDealSeed)
    }
  }

  useEffect(() => {
    if (crmView === 'financial') {
      fetchRevenueStreams()
      fetchFinancialExpenses()
      fetchFinancialTasks()
      fetchFinancialDeals()
    }
  }, [crmView])

  // Fetch appointments from Supabase
  const fetchAppointments = async () => {
    setAppointmentsLoading(true)
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) throw new Error('Failed to fetch appointments')
      
      const { appointments: data } = await response.json()
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      // Fallback to empty array if API fails
      setAppointments([])
    } finally {
      setAppointmentsLoading(false)
    }
  }

  const updateAppointmentPaymentStatus = async (appointmentId: string, paymentStatus: WebsiteAppointment["payment_status"]) => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, payment_status: paymentStatus } : appointment
      )
    )

    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, payment_status: paymentStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update payment status')
      }

      const { appointment: updatedAppointment } = await response.json()
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId ? updatedAppointment : appointment
        )
      )
    } catch (error) {
      console.error('Error updating payment status:', error)
      fetchAppointments()
    }
  }

  const [creatingTeamsMeetingId, setCreatingTeamsMeetingId] = useState<string | null>(null)

  const createTeamsMeeting = async (appointmentId: string) => {
    setCreatingTeamsMeetingId(appointmentId)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/teams-meeting`, {
        method: 'POST',
      })

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Failed to create Teams meeting' }))
        throw new Error(error)
      }

      const { appointment: updatedAppointment } = await response.json()
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId ? updatedAppointment : appointment
        )
      )
    } catch (error) {
      console.error('Error creating Teams meeting:', error)
      alert(error instanceof Error ? error.message : 'Failed to create Teams meeting')
    } finally {
      setCreatingTeamsMeetingId(null)
    }
  }

  // Fetch appointments when calendar section is active
  useEffect(() => {
    if (crmView === 'financial') {
      fetchAppointments()
    }
  }, [activeSection, crmView])

  // Handle edit patient
  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient)
  }

  // Handle archive patient
  const handleArchivePatient = async (patient: Patient) => {
    try {
      const response = await fetch('/api/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: patient.id, status: 'archived' })
      })
      if (response.ok) {
        setPatients(prev => prev.filter(p => p.id !== patient.id))
      }
    } catch (error) {
      console.error('Error archiving patient:', error)
    }
  }

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const navItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "pipeline", label: "Pipeline", icon: "📈" },
    { id: "coordinator", label: "Coordinator", icon: "👥" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "reporting", label: "Reporting", icon: "📋" },
    { id: "ai-agent", label: "AI Agent", icon: "🤖" },
  ]

  const pipelineStages: Stage[] = ["Outreach", "Follow Up", "Enrolment", "Onboarding", "Active"]

  // Move patient stage via API
  const movePatientStage = async (patient: Patient, direction: number) => {
    const currentIndex = pipelineStages.indexOf(patient.stage)
    const newIndex = Math.max(0, Math.min(pipelineStages.length - 1, currentIndex + direction))
    const newStage = pipelineStages[newIndex]

    try {
      const response = await fetch('/api/crm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: patient.id,
          stage: newStage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update patient stage')
      }

      const { patient: updatedPatient } = await response.json()
      
      // Update local state with the updated patient
      setPatients((prev) => prev.map((p) => p.id === patient.id ? updatedPatient : p))
    } catch (error) {
      console.error('Error updating patient stage:', error)
      // Fallback to local state update if API fails
      setPatients((prev) => prev.map((p) => 
        p.id === patient.id ? { ...p, stage: newStage } : p
      ))
    }
  }

  // Move patient to specific stage (for drag-and-drop)
  const movePatientToStage = async (patientId: string, newStage: Stage) => {
    const patient = patients.find((p) => p.id === patientId)
    if (!patient || patient.stage === newStage) return

    try {
      const response = await fetch('/api/crm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: patientId,
          stage: newStage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to update patient stage')
      }

      const { patient: updatedPatient } = await response.json()
      
      // Update local state with the updated patient
      setPatients((prev) => prev.map((p) => p.id === patientId ? updatedPatient : p))
    } catch (error) {
      console.error('Error updating patient stage:', error)
      // Fallback to local state update if API fails
      setPatients((prev) => prev.map((p) => 
        p.id === patientId ? { ...p, stage: newStage } : p
      ))
    }
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveDragPatient(null)

    if (!over) return

    const patientId = active.id as string
    const overId = over.id as string

    // Check if dropped on a stage column directly
    if (pipelineStages.includes(overId as Stage)) {
      movePatientToStage(patientId, overId as Stage)
      return
    }

    // Dropped on another patient, find their stage
    const targetPatient = patients.find((p) => p.id === overId)
    if (targetPatient) {
      movePatientToStage(patientId, targetPatient.stage)
      return
    }

    // Try to find stage from data attribute
    const stageData = over.data?.current?.stage || over.data?.current?.sortable?.containerId
    if (stageData && pipelineStages.includes(stageData as Stage)) {
      movePatientToStage(patientId, stageData as Stage)
    }
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const patient = patients.find((p) => p.id === event.active.id)
    if (patient) {
      setActiveDragPatient(patient)
    }
  }

  // Filter patients based on search and filters
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch = patient.name.toLowerCase().includes(search.toLowerCase()) ||
                          patient.program.toLowerCase().includes(search.toLowerCase()) ||
                          patient.owner.toLowerCase().includes(search.toLowerCase())
      const matchesStage = stageFilter === "All" || patient.stage === stageFilter
      const matchesRisk = riskFilter === "All" || patient.risk === riskFilter

      return matchesSearch && matchesStage && matchesRisk
    })
  }, [patients, search, stageFilter, riskFilter])

  const selectedPatient = filteredPatients.find((p) => p.id === selectedId) ?? filteredPatients[0] ?? patients[0]
  const selectedDocuments = documentsSeed[selectedPatient?.id] ?? []
  const coordinatorPatients = patients.filter((p) => p.owner === selectedPatient?.owner)

  const dashboard = useMemo(() => {
    const total = patients.length
    const dueToday = patients.filter((p) => p.nextDate === "Mar 24").length
    const signedConsents = patients.filter((p) => p.consentStatus === "Signed").length
    const highRisk = patients.filter((p) => p.risk === "High").length
    const active = patients.filter((p) => p.stage === "Active").length
    const enrollment = patients.filter((p) => p.stage === "Enrolment").length
    const onboarding = patients.filter((p) => p.stage === "Onboarding").length
    return {
      total,
      dueToday,
      highRisk,
      signedConsents,
      active,
      enrollment,
      onboarding,
      consentRate: Math.round((signedConsents / total) * 100),
      conversionRate: Math.round((active / total) * 100),
      outreachBacklog: patients.filter((p) => p.stage === "Outreach").length,
    }
  }, [patients])

  const coordinatorStats = useMemo(() => {
    const owners = Array.from(new Set(patients.map(p => p.owner)))
    return owners.map(owner => {
      const ownerPatients = patients.filter(p => p.owner === owner)
      return {
        owner,
        total: ownerPatients.length,
        highRisk: ownerPatients.filter(p => p.risk === "High").length,
        dueToday: ownerPatients.filter(p => p.nextDate === "Mar 24").length,
      }
    })
  }, [patients])

  const financialDashboard = useMemo(() => {
    const totalAppointments = appointments.length
    const paidAppointments = appointments.filter((appointment) => appointment.payment_status === 'paid')
    const pendingAppointments = appointments.filter((appointment) => appointment.payment_status === 'pending')
    const failedAppointments = appointments.filter((appointment) => appointment.payment_status === 'failed')
    const telemedicineCount = appointments.filter((appointment) => appointment.consultation_type === 'telemedicine').length
    const homeVisitCount = appointments.filter((appointment) => appointment.consultation_type === 'home-visit').length

    const estimatedRevenue = paidAppointments.reduce((sum, appointment) => {
      return sum + (appointment.consultation_type === 'telemedicine' ? 25000 : 85000)
    }, 0)

    const outstandingRevenue = pendingAppointments.reduce((sum, appointment) => {
      return sum + (appointment.consultation_type === 'telemedicine' ? 25000 : 85000)
    }, 0)

    return {
      totalAppointments,
      paidCount: paidAppointments.length,
      pendingCount: pendingAppointments.length,
      failedCount: failedAppointments.length,
      telemedicineCount,
      homeVisitCount,
      estimatedRevenue,
      outstandingRevenue,
      websiteBookingRevenue: estimatedRevenue + outstandingRevenue,
      collectionRate: totalAppointments > 0 ? Math.round((paidAppointments.length / totalAppointments) * 100) : 0,
    }
  }, [appointments])

  const financialExecution = useMemo(() => {
    const startingCapital = 150000000
    const monthlyBurn = 30000000
    const revenueSecured = revenueStreams.reduce((sum, stream) => {
      if (stream.hidden) return sum
      return sum + (stream.id === selfReferralStreamId ? financialDashboard.websiteBookingRevenue : Number(stream.secured || 0))
    }, 0)
    const cashCollected = financialDashboard.estimatedRevenue
    const loggedExpenses = financialExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    const endingCash90 = startingCapital - 90000000 + cashCollected - loggedExpenses
    const runwayMonths = Math.max(0, (startingCapital - monthlyBurn + cashCollected - loggedExpenses) / monthlyBurn)
    const taskDone = financialTasks.filter((task) => task.done).length
    const taskTotal = financialTasks.length
    const taskCompletion = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0

    const monthlyRecurringRevenue = Math.round(
      Number(revenueStreams.find((stream) => stream.id === "elderly")?.secured || 0) * 0.4 +
      Number(revenueStreams.find((stream) => stream.id === "hmo")?.secured || 0) * 0.5 +
      Number(revenueStreams.find((stream) => stream.id === "premium")?.secured || 0) / 12
    )

    return {
      startingCapital,
      monthlyBurn,
      revenueSecured,
      cashCollected,
      endingCash90,
      runwayMonths,
      taskDone,
      taskTotal,
      taskCompletion,
      bookingConversionRate: financialDashboard.collectionRate,
      monthlyRecurringRevenue,
      loggedExpenses,
    }
  }, [revenueStreams, financialTasks, financialExpenses, financialDashboard.estimatedRevenue, financialDashboard.websiteBookingRevenue, financialDashboard.collectionRate])

  const revenueStreamCards = useMemo(() => {
    return revenueStreams.filter((stream) => !stream.hidden).map((stream) => ({
      type: stream.source_type === "specific-source" ? "specific-source" as const : "planned" as const,
      id: stream.id,
      name: stream.name,
      target: Number(stream.target || 0),
      secured: stream.id === selfReferralStreamId ? financialDashboard.websiteBookingRevenue : Number(stream.secured || 0),
    }))
  }, [revenueStreams, financialDashboard.websiteBookingRevenue])

  useEffect(() => {
    if (crmView !== 'financial') return

    const syncSpecificSourceStreams = async () => {
      const existingIds = new Set(revenueStreams.map((stream) => stream.id))
      const specificSources = Array.from(
        new Set(
          patients
            .map((patient) => getSpecificSource(patient))
            .filter((specificSource) => specificSource.length > 0)
        )
      )

      const missingStreams = specificSources
        .map((specificSource) => ({
          id: getSpecificSourceStreamId(specificSource),
          name: specificSource,
        }))
        .filter((stream) => !existingIds.has(stream.id))

      if (missingStreams.length === 0) return

      const createdStreams = await Promise.all(
        missingStreams.map(async (stream) => {
          const response = await fetch('/api/financial/revenue-streams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: stream.id,
              name: stream.name,
              target: defaultSpecificSourceStreamTarget,
              secured: 0,
              source_type: 'specific-source',
            }),
          })

          if (!response.ok) throw new Error('Failed to create specific source stream')
          const { stream: createdStream } = await response.json()
          return createdStream
        })
      )

      setRevenueStreams((prev) => mergeRevenueStreamDefaults([...prev, ...createdStreams]))
    }

    syncSpecificSourceStreams().catch((error) => {
      console.error('Error syncing specific source streams:', error)
    })
  }, [crmView, patients, revenueStreams])

  const filteredFinancialTasks = useMemo(() => {
    return sortFinancialTasks(financialTasks.filter((task) => {
      const matchesDate = !financialTaskDateFilter || task.due_date === financialTaskDateFilter
      const matchesCategory = financialTaskFilter === "all" || task.category === financialTaskFilter
      return matchesDate && matchesCategory
    }))
  }, [financialTasks, financialTaskDateFilter, financialTaskFilter])

  const financialTaskBuckets = useMemo<FinancialTaskBucket[]>(() => {
    const today = formatDateInput(new Date())
    const buckets: FinancialTaskBucket[] = [
      { id: "overdue", label: "Overdue", tasks: [] },
      { id: "today", label: "Today", tasks: [] },
      { id: "week", label: "Next 7 Days", tasks: [] },
      { id: "later", label: "Later", tasks: [] },
      { id: "done", label: "Completed", tasks: [] },
    ]

    filteredFinancialTasks.forEach((task) => {
      if (task.done) {
        buckets[4].tasks.push(task)
        return
      }

      const dayDiff = getDayDiff(task.due_date, today)
      if (dayDiff < 0) buckets[0].tasks.push(task)
      else if (dayDiff === 0) buckets[1].tasks.push(task)
      else if (dayDiff <= 7) buckets[2].tasks.push(task)
      else buckets[3].tasks.push(task)
    })

    return buckets.filter((bucket) => bucket.tasks.length > 0)
  }, [filteredFinancialTasks])

  const financialTaskInsights = useMemo(() => {
    const today = formatDateInput(new Date())
    const openTasks = financialTasks.filter((task) => !task.done)
    const highPriorityOpen = openTasks.filter((task) => task.priority === "High").length
    const overdue = openTasks.filter((task) => getDayDiff(task.due_date, today) < 0).length
    const nextTask = sortFinancialTasks(openTasks)[0]

    return {
      highPriorityOpen,
      overdue,
      nextTask,
      nextDueLabel: nextTask ? getRelativeDueLabel(nextTask.due_date, today) : "None",
    }
  }, [financialTasks])

  const financialPipeline = useMemo(() => {
    const totalValue = financialDeals.reduce((sum, deal) => sum + deal.value, 0)
    const wonDeals = financialDeals.filter((deal) => deal.status === "won")
    const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0)
    const conversionRate = financialDeals.length > 0 ? Math.round((wonDeals.length / financialDeals.length) * 100) : 0
    return { totalValue, wonValue, conversionRate, wonCount: wonDeals.length }
  }, [financialDeals])

  const patchRevenueStream = async (id: string, updates: Partial<RevenueStreamPlan>) => {
    const response = await fetch('/api/financial/revenue-streams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })

    if (!response.ok) throw new Error('Failed to update revenue stream')

    const { stream } = await response.json()
    setRevenueStreams((prev) => prev.map((item) => item.id === id ? stream : item))
    return stream
  }

  const updateRevenueStream = async (id: RevenueStreamPlan["id"], value: number) => {
    const secured = Math.max(0, value)
    setRevenueStreams((prev) =>
      prev.map((stream) => stream.id === id ? { ...stream, secured } : stream)
    )
    try {
      await patchRevenueStream(id, { secured })
    } catch (error) {
      console.error('Error updating secured amount:', error)
      fetchRevenueStreams()
    }
  }

  const updateRevenueStreamTarget = async (id: RevenueStreamPlan["id"], value: number) => {
    const target = Math.max(0, value)
    setRevenueStreams((prev) =>
      prev.map((stream) => stream.id === id ? { ...stream, target } : stream)
    )
    try {
      await patchRevenueStream(id, { target })
    } catch (error) {
      console.error('Error updating target:', error)
      fetchRevenueStreams()
    }
  }

  const saveRevenueTarget = () => {
    if (!editingRevenueTarget) return

    const value = Number(editingRevenueTarget.value)
    updateRevenueStreamTarget(editingRevenueTarget.id, value)

    setEditingRevenueTarget(null)
  }

  const deleteRevenueStream = async (id: string, type: "planned" | "specific-source") => {
    if (type === "specific-source") {
      setRevenueStreams((prev) => prev.map((stream) => stream.id === id ? { ...stream, hidden: true } : stream))
      try {
        await patchRevenueStream(id, { hidden: true })
      } catch (error) {
        console.error('Error hiding revenue stream:', error)
        fetchRevenueStreams()
      }
    } else {
      setRevenueStreams((prev) => prev.filter((stream) => stream.id !== id))
      try {
        const response = await fetch(`/api/financial/revenue-streams?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete revenue stream')
      } catch (error) {
        console.error('Error deleting revenue stream:', error)
        fetchRevenueStreams()
      }
    }

    setOpenRevenueMenuId(null)
  }

  const addRevenueStream = async () => {
    const name = newStreamForm.name.trim()
    if (!name) return

    try {
      const response = await fetch('/api/financial/revenue-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
          name,
          target: Math.max(0, Number(newStreamForm.target) || 0),
          secured: Math.max(0, Number(newStreamForm.secured) || 0),
          source_type: 'manual',
        }),
      })

      if (!response.ok) throw new Error('Failed to add revenue stream')
      const { stream } = await response.json()
      setRevenueStreams((prev) => [...prev, stream])
      setNewStreamForm({ name: "", target: "", secured: "" })
      setShowNewStreamModal(false)
    } catch (error) {
      console.error('Error adding revenue stream:', error)
    }
  }

  const addFinancialExpense = async () => {
    const description = newExpenseForm.description.trim()
    const amount = Math.max(0, parseMoneyInput(newExpenseForm.amount))
    if (!description || amount <= 0) return

    try {
      const response = await fetch('/api/financial/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `expense-${Date.now()}`,
          description,
          amount,
          expense_date: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to log expense')
      }
      const { expense } = await response.json()
      setFinancialExpenses((prev) => [expense, ...prev])
      setNewExpenseForm({ description: "", amount: "" })
    } catch (error) {
      console.error('Error logging expense:', error)
      alert(`Error logging expense: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const deleteFinancialExpense = async (expenseId: string) => {
    setFinancialExpenses((prev) => prev.filter((expense) => expense.id !== expenseId))
    try {
      const response = await fetch(`/api/financial/expenses?id=${encodeURIComponent(expenseId)}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete expense')
    } catch (error) {
      console.error('Error deleting expense:', error)
      fetchFinancialExpenses()
    }
  }

  const toggleFinancialTask = async (taskId: string) => {
    const task = financialTasks.find((item) => item.id === taskId)
    if (!task) return

    const done = !task.done
    setFinancialTasks((prev) =>
      prev.map((item) => item.id === taskId ? { ...item, done } : item)
    )

    try {
      const response = await fetch('/api/financial/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, done }),
      })
      if (!response.ok) throw new Error('Failed to update task status')
      const { task: updatedTask } = await response.json()
      setFinancialTasks((prev) => prev.map((item) => item.id === taskId ? updatedTask : item))
    } catch (error) {
      console.error('Error updating financial task:', error)
      fetchFinancialTasks()
    }
  }

  const addFinancialTask = async () => {
    const title = newTaskForm.title.trim()
    if (!title || !newTaskForm.due_date) return

    try {
      const response = await fetch('/api/financial/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `task-${Date.now()}`,
          title,
          due_date: newTaskForm.due_date,
          priority: newTaskForm.priority,
          category: newTaskForm.category,
          done: false,
        }),
      })

      if (!response.ok) throw new Error('Failed to create task')
      const { task } = await response.json()
      setFinancialTasks((prev) => sortFinancialTasks([...prev, task]))
      setNewTaskForm({
        title: "",
        due_date: formatDateInput(new Date()),
        priority: "Medium",
        category: "ops",
      })
    } catch (error) {
      console.error('Error creating financial task:', error)
      alert(`Error creating task: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const deleteFinancialTask = async (taskId: string) => {
    const task = financialTasks.find((item) => item.id === taskId)
    if (!task) return
    if (!confirm(`Delete "${task.title}"?`)) return

    setFinancialTasks((prev) => prev.filter((task) => task.id !== taskId))
    try {
      const response = await fetch(`/api/financial/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete task')
    } catch (error) {
      console.error('Error deleting financial task:', error)
      fetchFinancialTasks()
    }
  }

  const addFinancialDeal = async () => {
    const company = newDeal.company.trim()
    const type = newDeal.type.trim()
    if (!company || !type) return

    const parsedValue = Number(newDeal.value)
    const dealValue = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0

    try {
      const response = await fetch('/api/financial/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `deal-${Date.now()}`,
          company,
          type,
          value: dealValue,
          status: newDeal.status,
          notes: newDeal.notes.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save opportunity')
      }

      const { deal } = await response.json()
      setFinancialDeals((prev) => [...prev, { ...deal, value: Number(deal.value || 0) }])
      setNewDeal({ company: "", type: "Corporate", value: "", status: "cold", notes: "" })
    } catch (error) {
      console.error('Error saving financial deal:', error)
      alert(`Error saving opportunity: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  // Helper functions
  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case "Outreach": return "bg-yellow-100 text-yellow-800"
      case "Follow Up": return "bg-orange-100 text-orange-800"
      case "Enrolment": return "bg-blue-100 text-blue-800"
      case "Onboarding": return "bg-purple-100 text-purple-800"
      case "Active": return "bg-emerald-100 text-emerald-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Droppable Column Component
  interface DroppableColumnProps {
    stage: Stage
    children: React.ReactNode
    patientCount: number
  }

  const DroppableColumn = ({ stage, children, patientCount }: DroppableColumnProps) => {
    const { isOver, setNodeRef } = useDroppable({
      id: stage,
      data: {
        stage,
        type: 'column'
      }
    })

    return (
      <div
        ref={setNodeRef}
        className={`bg-white rounded-[16px] p-6 shadow-sm border-2 min-h-[200px] transition-colors ${
          isOver ? 'border-gold bg-gold/5' : 'border-green-deep/10'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-dm-sans font-semibold text-green-deep">{stage}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium font-dm-sans ${getStageColor(stage)}`}>
            {patientCount}
          </span>
        </div>
        {children}
      </div>
    )
  }

  // Draggable Patient Card Component
  interface DraggablePatientCardProps {
    patient: Patient
    onViewDetails: (patient: Patient) => void
    onEdit?: (patient: Patient) => void
    onArchive?: (patient: Patient) => void
  }

  const DraggablePatientCard = ({ patient, onViewDetails, onEdit, onArchive }: DraggablePatientCardProps) => {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: patient.id,
      data: {
        patient,
        stage: patient.stage,
        type: 'patient'
      }
    })

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowMenu(false)
        }
      }
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [showMenu])

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: isDragging ? 'grabbing' : 'grab'
    }

    // Handle click to view details (only if not dragging and not clicking menu)
    const handleClick = () => {
      if (!isDragging && !showMenu) {
        onViewDetails(patient)
      }
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow cursor-pointer relative"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium font-dm-sans text-sm">{patient.name}</p>
            <p className="text-xs text-gray-600 font-dm-sans">{patient.program}</p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onViewDetails(patient)
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-dm-sans text-green-deep hover:bg-gray-50 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit?.(patient)
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-dm-sans text-green-deep hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    if (confirm(`Archive ${patient.name}?`)) {
                      onArchive?.(patient)
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-dm-sans text-red-600 hover:bg-red-50 transition-colors"
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="text-xs bg-gray-100 px-2 py-1 rounded font-dm-sans"
            disabled={patient.stage === pipelineStages[0]}
            onClick={(e) => {
              e.stopPropagation()
              movePatientStage(patient, -1)
            }}
          >
            ←
          </button>
          <button
            className="text-xs bg-green-deep text-white px-2 py-1 rounded font-dm-sans"
            disabled={patient.stage === pipelineStages[pipelineStages.length - 1]}
            onClick={(e) => {
              e.stopPropagation()
              movePatientStage(patient, 1)
            }}
          >
            →
          </button>
        </div>
      </div>
    )
  }

  const getRiskColor = (risk: Risk) => {
    switch (risk) {
      case "High": return "text-red-600"
      case "Medium": return "text-yellow-600"
      case "Low": return "text-green-600"
      default: return "text-gray-600"
    }
  }

  // CRM Action Handlers
  const runAgentAction = (prompt: string) => {
    const lower = prompt.toLowerCase()
    let response = `${selectedPatient?.name} is currently in ${selectedPatient?.stage} with ${selectedPatient?.risk?.toLowerCase()} risk and next action: ${selectedPatient?.nextStep}.`

    if (lower.includes("brief") || lower.includes("summarize")) {
      response = `${selectedPatient?.name} summary: ${selectedPatient?.program}, ${selectedPatient?.risk?.toLowerCase()} risk, owned by ${selectedPatient?.owner}. Main blocker: ${selectedPatient?.nextStep}. Consent status is ${selectedPatient?.consentStatus?.toLowerCase()} and next touchpoint is ${selectedPatient?.appointment}.`
    } else if (lower.includes("outreach") || lower.includes("draft")) {
      response = `Draft message: Hi ${selectedPatient?.name?.split(" ")[0]}, this is ${selectedPatient?.owner} from FXMED. I'm reaching out to help with your next step: ${selectedPatient?.nextStep}. Please reply with a good time today so we can keep your care plan moving.`
    } else if (lower.includes("consent")) {
      response = `Recommended consent recovery workflow: send reminder via ${selectedPatient?.preferred?.toLowerCase()}, follow with a same-day coordinator call, and escalate if consent remains ${selectedPatient?.consentStatus?.toLowerCase()} after 24 hours.`
    } else if (lower.includes("calendar") || lower.includes("schedule")) {
      response = `Best schedule recommendation: keep the next appointment on ${selectedPatient?.appointment}, then queue a follow-up reminder 24 hours before and a coordinator task for same-day confirmation.`
    } else if (lower.includes("document") || lower.includes("audit")) {
      response = `${selectedPatient?.name} currently has ${selectedPatient?.documentCount} documents on file. Priority review items should focus on consent status (${selectedPatient?.consentStatus}) and any onboarding or clinical packets still missing.`
    } else if (lower.includes("kpi") || lower.includes("metric") || lower.includes("report")) {
      response = `Current KPI view: consent completion is ${dashboard.consentRate}%, conversion is ${dashboard.conversionRate}%, and outreach backlog is ${dashboard.outreachBacklog}. Biggest improvement opportunity is moving enrollment patients into onboarding faster.`
    }

    setAgentMessages((prev) => [...prev, { role: "user", text: prompt }, { role: "assistant", text: response }])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        {crmView === "clinical" ? (
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as NavItem)}
                className={`px-4 py-3 rounded-lg font-dm-sans text-[0.9rem] font-medium transition-colors whitespace-nowrap ${
                  activeSection === item.id
                    ? 'bg-green-deep text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-mid font-dm-sans py-2">
            Financial CRM focuses on payments, collections, and booking revenue.
          </div>
        )}

        <div className="flex items-center gap-3">
          {crmView === "clinical" && (
            <button
              onClick={() => setShowLeadModal(true)}
              className="px-4 py-3 bg-gold text-green-deep rounded-lg font-dm-sans font-semibold text-[0.9rem] hover:bg-gold-light transition-colors shadow-sm whitespace-nowrap"
            >
              + New Lead
            </button>
          )}
        </div>
      </div>

      {crmView === "financial" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { id: "dashboard", label: "Command Dashboard" },
              { id: "tasks", label: "Task Planner" },
              { id: "pipeline", label: "Sales Pipeline" },
              { id: "scenarios", label: "Scenarios" },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setFinancialSection(section.id as FinancialSection)}
                className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
                  financialSection === section.id
                    ? "bg-green-deep text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {financialSection === "dashboard" && (
            <>
              {financialExecution.runwayMonths < 5 && (
                <div className={`rounded-lg p-4 text-sm font-dm-sans border ${
                  financialExecution.runwayMonths < 3
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-yellow-50 border-yellow-200 text-yellow-700"
                }`}>
                  {financialExecution.runwayMonths < 3
                    ? "Critical: runway is below 3 months. Prioritize fastest-closing deals and contingency funding."
                    : "Runway has dropped below 5 months. Accelerate collections and short-cycle contracts."}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid font-dm-sans mb-2">Contracts Secured</p>
                  <p className="text-2xl font-bold text-green-deep">₦{financialExecution.revenueSecured.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid font-dm-sans mb-2">Cash Collected</p>
                  <p className="text-2xl font-bold text-green-600">₦{financialExecution.cashCollected.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid font-dm-sans mb-2">Cash Runway</p>
                  <p className="text-2xl font-bold text-gold">{financialExecution.runwayMonths.toFixed(1)} mo</p>
                </div>
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid font-dm-sans mb-2">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-deep">{financialExecution.bookingConversionRate}%</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Revenue Streams</h3>
                  </div>
                  <div className="space-y-4">
                    {revenueStreamCards.map((stream) => {
                      const progress = stream.target > 0 ? Math.min(100, (stream.secured / stream.target) * 100) : 0
                      return (
                        <div key={stream.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold font-dm-sans text-green-deep">{stream.name}</p>
                            <div className="relative flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Target ₦{stream.target.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenRevenueMenuId(openRevenueMenuId === stream.id ? null : stream.id)}
                                className="h-8 w-8 rounded-full text-lg leading-none text-gray-500 hover:bg-gray-100 hover:text-green-deep"
                                aria-label={`Open options for ${stream.name}`}
                              >
                                ⋮
                              </button>
                              {openRevenueMenuId === stream.id && (
                                <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRevenueTarget({
                                        id: stream.id,
                                        type: stream.type,
                                        name: stream.name,
                                        value: String(stream.target),
                                      })
                                      setOpenRevenueMenuId(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm font-dm-sans text-green-deep hover:bg-gray-50"
                                  >
                                    Edit target
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteRevenueStream(stream.id, stream.type)}
                                    className="w-full px-3 py-2 text-left text-sm font-dm-sans text-red-600 hover:bg-red-50"
                                  >
                                    Delete stream
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-green-mid rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Secured</label>
                            <input
                              type="number"
                              min={0}
                              value={stream.secured}
                              disabled={stream.id === selfReferralStreamId}
                              onChange={(event) => {
                                if (stream.id === selfReferralStreamId) return

                                const value = Number(event.target.value)
                                updateRevenueStream(stream.id, value)
                              }}
                              className="w-36 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewStreamModal(true)}
                    className="mt-4 w-full rounded-lg border border-dashed border-green-deep/30 px-4 py-3 font-dm-sans font-semibold text-green-deep hover:bg-green-deep/5"
                  >
                    Add New Stream
                  </button>
                </div>

                <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
                  <h3 className="text-xl font-dm-sans font-semibold text-green-deep mb-4">Survival Math</h3>
                  <div className="space-y-2 text-sm font-dm-sans">
                    <div className="flex justify-between"><span>Starting Capital</span><span>₦{financialExecution.startingCapital.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>90-Day Burn</span><span className="text-red-600">₦90,000,000</span></div>
                    <div className="flex justify-between"><span>Revenue Collected</span><span className="text-green-600">₦{financialExecution.cashCollected.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Logged Expenses</span><span className="text-red-600">₦{financialExecution.loggedExpenses.toLocaleString()}</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Projected Ending Cash (Day 90)</p>
                    <p className={`text-3xl font-bold ${
                      financialExecution.endingCash90 >= 110000000
                        ? "text-green-600"
                        : financialExecution.endingCash90 >= 95000000
                          ? "text-gold"
                          : "text-red-600"
                    }`}>
                      ₦{financialExecution.endingCash90.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      MRR: ₦{financialExecution.monthlyRecurringRevenue.toLocaleString()} / month (breakeven target ₦30,000,000)
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-dm-sans font-semibold text-green-deep mb-3">Expenses</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newExpenseForm.description}
                        onChange={(event) => setNewExpenseForm({ ...newExpenseForm, description: event.target.value })}
                        placeholder="Expense description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={newExpenseForm.amount}
                          onChange={(event) => setNewExpenseForm({ ...newExpenseForm, amount: event.target.value })}
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={addFinancialExpense}
                          disabled={!newExpenseForm.description.trim() || parseMoneyInput(newExpenseForm.amount) <= 0}
                          className="px-4 py-2 bg-green-deep text-white rounded-lg text-sm font-dm-sans font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Log
                        </button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {financialExpenses.slice(0, 5).map((expense) => (
                          <div key={expense.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                            <div>
                              <p className="text-sm font-dm-sans font-medium text-green-deep">{expense.description}</p>
                              <p className="text-xs text-gray-500">{new Date(expense.expense_date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-dm-sans text-red-600">₦{expense.amount.toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => deleteFinancialExpense(expense.id)}
                                className="text-xs text-gray-500 hover:text-red-600"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        ))}
                        {financialExpenses.length === 0 && (
                          <p className="text-sm text-gray-500 font-dm-sans">No expenses logged yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Recent Financial Bookings</h3>
                  <button
                    onClick={fetchAppointments}
                    disabled={appointmentsLoading}
                    className="px-4 py-2 bg-green-deep text-white rounded-lg font-dm-sans hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {appointmentsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                <div className="space-y-3">
                  {appointments.slice(0, 8).map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-dm-sans font-semibold text-green-deep">
                          {appointment.first_name} {appointment.last_name}
                        </p>
                        <span className="text-sm font-dm-sans text-gray-600">
                          ₦{(appointment.consultation_type === 'telemedicine' ? 25000 : 85000).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-dm-sans">
                        <span className={`px-2 py-1 rounded ${
                          appointment.consultation_type === 'telemedicine' ? 'bg-green-100 text-green-800' : 'bg-gold text-green-deep'
                        }`}>
                          {appointment.consultation_type === 'telemedicine' ? 'Telemedicine' : 'Home Visit'}
                        </span>
                        <select
                          value={appointment.payment_status || 'pending'}
                          onChange={(event) =>
                            updateAppointmentPaymentStatus(
                              appointment.id,
                              event.target.value as WebsiteAppointment["payment_status"]
                            )
                          }
                          className={`px-2 py-1 rounded border-0 text-xs font-dm-sans focus:outline-none focus:ring-2 focus:ring-gold ${
                          (appointment.payment_status || 'pending') === 'paid' ? 'bg-green-100 text-green-800' :
                          (appointment.payment_status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                        </select>
                        <span className="text-gray-500">
                          {new Date(appointment.preferred_date).toLocaleDateString()}
                        </span>
                      </div>
                      {appointment.consultation_type === 'telemedicine' && (
                        <div className="mt-2">
                          {appointment.teams_meeting_url ? (
                            <a
                              href={appointment.teams_meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-dm-sans text-blue-600 hover:underline break-all"
                            >
                              Teams meeting link
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => createTeamsMeeting(appointment.id)}
                              disabled={creatingTeamsMeetingId === appointment.id}
                              className="text-xs font-dm-sans px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                              {creatingTeamsMeetingId === appointment.id ? 'Creating...' : 'Create Teams meeting'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!appointmentsLoading && appointments.length === 0 && (
                    <p className="text-sm text-gray-500 font-dm-sans">No booking records available yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {financialSection === "tasks" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-lg border border-green-deep/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Task Planner</h3>
                    <p className="text-sm text-gray-500">Prioritize revenue, partnership, and operating follow-through.</p>
                  </div>
                  <span className="text-sm text-gray-500">{filteredFinancialTasks.filter((task) => task.done).length}/{filteredFinancialTasks.length} complete</span>
                </div>
                <div className="grid gap-3 md:grid-cols-4 mb-3">
                  <input
                    value={newTaskForm.title}
                    onChange={(event) => setNewTaskForm({ ...newTaskForm, title: event.target.value })}
                    placeholder="Add a financial task"
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(event) => setNewTaskForm({ ...newTaskForm, due_date: event.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={addFinancialTask}
                    disabled={!newTaskForm.title.trim() || !newTaskForm.due_date}
                    className="px-4 py-2 bg-green-deep text-white rounded-lg text-sm font-dm-sans font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Task
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 mb-5">
                  <select
                    value={newTaskForm.priority}
                    onChange={(event) => setNewTaskForm({ ...newTaskForm, priority: event.target.value as FinancialTaskItem["priority"] })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                  <select
                    value={newTaskForm.category}
                    onChange={(event) => setNewTaskForm({ ...newTaskForm, category: event.target.value as FinancialTaskItem["category"] })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {financialTaskCategories.filter((category) => category.id !== "all").map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    type="date"
                    value={financialTaskDateFilter}
                    onChange={(event) => setFinancialTaskDateFilter(event.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setFinancialTaskDateFilter("")}
                    className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    All dates
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {financialTaskCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setFinancialTaskFilter(category.id)}
                      className={`px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
                        financialTaskFilter === category.id ? "bg-gold text-green-deep" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-5">
                  {financialTaskBuckets.map((bucket) => (
                    <div key={bucket.id}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-dm-sans font-semibold uppercase tracking-wide text-gray-500">{bucket.label}</h4>
                        <span className="text-xs text-gray-400">{bucket.tasks.length}</span>
                      </div>
                      <div className="space-y-3">
                        {bucket.tasks.map((task) => (
                          <div key={task.id} className={`flex items-start gap-3 border rounded-lg p-3 ${
                            !task.done && getDayDiff(task.due_date) < 0 ? "border-red-200 bg-red-50" : "border-gray-200"
                          }`}>
                            <button
                              type="button"
                              aria-label={task.done ? "Mark task incomplete" : "Mark task complete"}
                              onClick={() => toggleFinancialTask(task.id)}
                              className={`w-5 h-5 rounded border mt-0.5 shrink-0 text-[11px] leading-4 ${task.done ? "bg-green-600 border-green-600 text-white" : "border-gray-300"}`}
                            >
                              {task.done ? "✓" : ""}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-sm font-dm-sans ${task.done ? "line-through text-gray-400" : "text-green-deep"}`}>{task.title}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  task.priority === "High" ? "bg-red-100 text-red-700" :
                                  task.priority === "Medium" ? "bg-gold/20 text-green-deep" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {getRelativeDueLabel(task.due_date)} • {formatTaskDate(task.due_date)} • {financialTaskCategoryLabels[task.category]}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Delete ${task.title}`}
                              onClick={() => deleteFinancialTask(task.id)}
                              className="text-xs text-gray-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredFinancialTasks.length === 0 && (
                    <p className="text-sm text-gray-500">No tasks for this date/filter yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg border border-green-deep/10">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-3">Execution Summary</h3>
                <p className="text-3xl font-bold text-green-deep mb-1">{financialExecution.taskCompletion}%</p>
                <p className="text-sm text-gray-500 mb-4">overall task completion</p>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-green-mid" style={{ width: `${financialExecution.taskCompletion}%` }} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Tasks</span><span>{financialExecution.taskTotal}</span></div>
                  <div className="flex justify-between"><span>Completed</span><span>{financialExecution.taskDone}</span></div>
                  <div className="flex justify-between"><span>Open</span><span>{financialExecution.taskTotal - financialExecution.taskDone}</span></div>
                  <div className="flex justify-between"><span>High Priority Open</span><span>{financialTaskInsights.highPriorityOpen}</span></div>
                  <div className="flex justify-between"><span>Overdue</span><span className={financialTaskInsights.overdue > 0 ? "text-red-600 font-semibold" : ""}>{financialTaskInsights.overdue}</span></div>
                </div>
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Next deadline</p>
                  {financialTaskInsights.nextTask ? (
                    <>
                      <p className="text-sm font-dm-sans font-semibold text-green-deep">{financialTaskInsights.nextTask.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{financialTaskInsights.nextDueLabel} • {financialTaskInsights.nextTask.priority} Priority</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No open tasks.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {financialSection === "pipeline" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid mb-2">Pipeline Value</p>
                  <p className="text-2xl font-bold text-green-deep">₦{financialPipeline.totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid mb-2">Deals Won</p>
                  <p className="text-2xl font-bold text-green-600">₦{financialPipeline.wonValue.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
                  <p className="text-sm text-text-mid mb-2">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gold">{financialPipeline.conversionRate}%</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10 space-y-3">
                  <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Active Opportunities</h3>
                  {financialDeals.map((deal) => (
                    <div key={deal.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium text-green-deep">{deal.company}</p>
                        <span className="text-sm text-gray-600">₦{deal.value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{deal.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          deal.status === "won" ? "bg-green-100 text-green-700" :
                          deal.status === "hot" ? "bg-red-100 text-red-700" :
                          deal.status === "warm" ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {deal.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{deal.notes}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
                  <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-3">Add Opportunity</h3>
                  <div className="space-y-3">
                    <input value={newDeal.company} onChange={(event) => setNewDeal((prev) => ({ ...prev, company: event.target.value }))} placeholder="Company name" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <input value={newDeal.type} onChange={(event) => setNewDeal((prev) => ({ ...prev, type: event.target.value }))} placeholder="Type (Corporate/Government/...)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <input type="number" value={newDeal.value} onChange={(event) => setNewDeal((prev) => ({ ...prev, value: event.target.value }))} placeholder="Deal value (NGN)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <select value={newDeal.status} onChange={(event) => setNewDeal((prev) => ({ ...prev, status: event.target.value as FinancialDealStatus }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
                      <option value="won">Won</option>
                    </select>
                    <textarea value={newDeal.notes} onChange={(event) => setNewDeal((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <button
                      onClick={addFinancialDeal}
                      disabled={!newDeal.company.trim() || !newDeal.type.trim()}
                      className="px-4 py-2 bg-gold text-green-deep rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Opportunity
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {financialSection === "scenarios" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="bg-white rounded-[20px] p-6 border-2 border-green-500/30">
                <p className="text-xs uppercase tracking-wide text-green-600 mb-2">Best Case</p>
                <p className="text-3xl font-bold text-green-600 mb-1">₦77M</p>
                <p className="text-sm text-gray-500 mb-4">90-day revenue</p>
                <p className="text-sm text-gray-600">Strong corporate close rate, LASPEC pilot lands, premium slots fill quickly.</p>
              </div>
              <div className="bg-white rounded-[20px] p-6 border-2 border-yellow-500/30">
                <p className="text-xs uppercase tracking-wide text-yellow-700 mb-2">Base Case</p>
                <p className="text-3xl font-bold text-yellow-700 mb-1">₦65M</p>
                <p className="text-sm text-gray-500 mb-4">90-day revenue</p>
                <p className="text-sm text-gray-600">Core channels perform steadily; runway extends but execution pace must stay high.</p>
              </div>
              <div className="bg-white rounded-[20px] p-6 border-2 border-red-500/30">
                <p className="text-xs uppercase tracking-wide text-red-600 mb-2">Worst Case</p>
                <p className="text-3xl font-bold text-red-600 mb-1">₦40M</p>
                <p className="text-sm text-gray-500 mb-4">90-day revenue</p>
                <p className="text-sm text-gray-600">Institutional deals stall; trigger contingency plan and bridge-capital strategy.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {crmView === "clinical" && activeSection === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* KPI Cards */}
          <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Total Patients</h3>
                <span className="text-2xl font-bold text-green-deep">{dashboard.total}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Active</span>
                  <span className="font-medium text-green-600">{dashboard.active}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Enrolling</span>
                  <span className="font-medium text-blue-600">{dashboard.enrollment}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Onboarding</span>
                  <span className="font-medium text-purple-600">{dashboard.onboarding}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Consent Rate</h3>
                <span className="text-2xl font-bold text-green-deep">{dashboard.consentRate}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Signed</span>
                  <span className="font-medium text-green-600">{dashboard.signedConsents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Pending</span>
                  <span className="font-medium text-yellow-600">{dashboard.total - dashboard.signedConsents}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Conversion Rate</h3>
                <span className="text-2xl font-bold text-green-deep">{dashboard.conversionRate}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Active Patients</span>
                  <span className="font-medium text-green-600">{dashboard.active}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Outreach Backlog</span>
                  <span className="font-medium text-red-600">{dashboard.outreachBacklog}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Priority Alerts</h3>
                <span className="text-2xl font-bold text-red-600">{dashboard.highRisk}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">High Risk</span>
                  <span className="font-medium text-red-600">{dashboard.highRisk}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-mid">Due Today</span>
                  <span className="font-medium text-blue-600">{dashboard.dueToday}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Tasks */}
          <div className="space-y-6">
            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-4">Today's Tasks</h3>
              <div className="space-y-3">
                {tasksSeed.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      task.priority === "High" ? "bg-red-500" :
                      task.priority === "Medium" ? "bg-yellow-500" : "bg-green-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium font-dm-sans">{task.title}</p>
                      <p className="text-xs text-gray-500 font-dm-sans">{task.owner} • {task.due}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-dm-sans font-semibold text-green-deep">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-dm-sans text-[0.9rem] hover:bg-gray-200 transition-colors">
                  Generate Report
                </button>
                <button className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-dm-sans text-[0.9rem] hover:bg-gray-200 transition-colors">
                  Send Reminders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {crmView === "clinical" && activeSection === "pipeline" && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-6 lg:grid-cols-5">
            {pipelineStages.map((stage) => {
              const stagePatients = patients.filter((p) => p.stage === stage)
              return (
                <DroppableColumn key={stage} stage={stage} patientCount={stagePatients.length}>
                  <SortableContext
                    items={stagePatients.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {stagePatients.map((patient) => (
                        <DraggablePatientCard 
                          key={patient.id} 
                          patient={patient} 
                          onViewDetails={setViewingPatient}
                          onEdit={handleEditPatient}
                          onArchive={handleArchivePatient}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              )
            })}
          </div>
          <DragOverlay>
            {activeDragPatient ? (
              <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-lg opacity-90 cursor-grabbing">
                <p className="font-medium font-dm-sans text-sm">{activeDragPatient.name}</p>
                <p className="text-xs text-gray-600 font-dm-sans">{activeDragPatient.program}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {crmView === "clinical" && activeSection === "coordinator" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
            <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-4">Coordinator Workload</h3>
            <div className="space-y-3">
              {coordinatorStats.map((item) => (
                <div key={item.owner} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium font-dm-sans">{item.owner}</p>
                    <span className="text-sm text-gray-600 font-dm-sans">{item.total} patients</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-red-50 rounded p-2 text-center">
                      <p className="text-red-700 font-medium font-dm-sans">{item.highRisk}</p>
                      <p className="text-xs text-red-600 font-dm-sans">High Risk</p>
                    </div>
                    <div className="bg-yellow-50 rounded p-2 text-center">
                      <p className="text-yellow-700 font-medium font-dm-sans">{item.dueToday}</p>
                      <p className="text-xs text-yellow-600 font-dm-sans">Due Today</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPatient && (
            <div className="bg-white rounded-[16px] p-6 shadow-sm border border-green-deep/10">
              <h3 className="text-lg font-dm-sans font-semibold text-green-deep mb-4">{selectedPatient.owner} Worklist</h3>
              <div className="space-y-3">
                {coordinatorPatients.slice(0, 5).map((patient) => (
                  <div key={patient.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium font-dm-sans text-sm">{patient.name}</p>
                        <p className="text-xs text-gray-600 font-dm-sans">{patient.stage} • {patient.nextStep}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium font-dm-sans ${
                        patient.risk === "High" ? "bg-red-100 text-red-800" :
                        patient.risk === "Medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {patient.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Agent Panel */}
      {crmView === "clinical" && showAgentPanel && activeSection === "ai-agent" && (
        <div className="bg-white rounded-[20px] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-dm-sans font-bold text-green-deep">
                AI Assistant
              </h2>
              <p className="text-text-mid mt-1">
                Get intelligent insights and recommendations for patient management
              </p>
            </div>
            <button
              onClick={() => setShowAgentPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-50 rounded-[16px] p-4">
                <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => runAgentAction("brief")}
                    className="px-3 py-2 bg-white rounded-lg text-sm font-dm-sans hover:bg-gray-100 transition-colors border"
                  >
                    Patient Summary
                  </button>
                  <button
                    onClick={() => runAgentAction("outreach")}
                    className="px-3 py-2 bg-white rounded-lg text-sm font-dm-sans hover:bg-gray-100 transition-colors border"
                  >
                    Draft Message
                  </button>
                  <button
                    onClick={() => runAgentAction("consent")}
                    className="px-3 py-2 bg-white rounded-lg text-sm font-dm-sans hover:bg-gray-100 transition-colors border"
                  >
                    Consent Help
                  </button>
                  <button
                    onClick={() => runAgentAction("calendar")}
                    className="px-3 py-2 bg-white rounded-lg text-sm font-dm-sans hover:bg-gray-100 transition-colors border"
                  >
                    Schedule Advice
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agentMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-green-deep text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}>
                      <p className="text-sm font-dm-sans">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-[16px] p-4">
                <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Patient Context</h3>
                {selectedPatient && (
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedPatient.name}</p>
                    <p><strong>Stage:</strong> {selectedPatient.stage}</p>
                    <p><strong>Risk:</strong> <span className={getRiskColor(selectedPatient.risk)}>{selectedPatient.risk}</span></p>
                    <p><strong>Next Step:</strong> {selectedPatient.nextStep}</p>
                    <p><strong>Consent:</strong> {selectedPatient.consentStatus}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-[16px] p-4">
                <h3 className="font-dm-sans font-semibold text-green-deep mb-2">Smart Suggestions</h3>
                <div className="space-y-2">
                  {selectedPatient && (
                    <>
                      {selectedPatient.consentStatus === "Pending" && (
                        <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                          <p className="text-xs font-dm-sans text-yellow-800">
                            Send consent reminder via {selectedPatient.preferred.toLowerCase()}
                          </p>
                        </div>
                      )}
                      {selectedPatient.risk === "High" && selectedPatient.stage === "Outreach" && (
                        <div className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                          <p className="text-xs font-dm-sans text-red-800">
                            Priority: High-risk patient needs immediate outreach
                          </p>
                        </div>
                      )}
                      {selectedPatient.documentCount === 0 && (
                        <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                          <p className="text-xs font-dm-sans text-blue-800">
                            Upload intake forms and consent documents
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Lead Creation Modal */}
      {crmView === "clinical" && showLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-dm-sans font-bold text-green-deep">Add New Lead</h3>
              <button onClick={() => setShowLeadModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Name *</label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({...leadForm, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="Patient name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Phone</label>
                  <input
                    type="tel"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Email</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({...leadForm, email: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({...leadForm, source: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  >
                    <option>Website Lead</option>
                    <option>Referral</option>
                    <option>Social Media</option>
                    <option>Event</option>
                    <option>Advertisement</option>
                  </select>
                </div>
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Program</label>
                  <select
                    value={leadForm.program}
                    onChange={(e) => setLeadForm({...leadForm, program: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  >
                    <option>Cardiometabolic Care</option>
                    <option>Hormonal Health</option>
                    <option>Nutritional Medicine</option>
                    <option>Preventive Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Specify Source</label>
                <input
                  type="text"
                  value={leadForm.specifySource}
                  onChange={(e) => setLeadForm({...leadForm, specifySource: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="e.g. Dr. Smith, Instagram, Lagos health fair"
                />
              </div>

              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Priority</label>
                <select
                  value={leadForm.risk}
                  onChange={(e) => setLeadForm({...leadForm, risk: e.target.value as Risk})}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leadForm.consent}
                  onChange={(e) => setLeadForm({...leadForm, consent: e.target.checked})}
                  className="w-4 h-4 rounded border-green-deep/20"
                />
                <label className="font-dm-sans text-sm text-text-mid">
                  Consent packet sent
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeadModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-green-deep/20 font-dm-sans hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createLead}
                disabled={!leadForm.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-green-deep text-white font-dm-sans hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRevenueTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-dm-sans font-bold text-green-deep">Edit Target</h3>
                <p className="text-sm text-gray-500 font-dm-sans mt-1">{editingRevenueTarget.name}</p>
              </div>
              <button onClick={() => setEditingRevenueTarget(null)} className="text-gray-500 hover:text-gray-700">
                X
              </button>
            </div>

            <label className="block font-dm-sans font-medium text-green-deep mb-1">Target</label>
            <input
              type="number"
              min={0}
              value={editingRevenueTarget.value}
              onChange={(event) => setEditingRevenueTarget({ ...editingRevenueTarget, value: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingRevenueTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-dm-sans hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRevenueTarget}
                className="flex-1 px-4 py-2 bg-gold text-green-deep rounded-lg font-dm-sans font-semibold hover:bg-gold/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewStreamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-xl max-w-md w-full mx-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-xl font-dm-sans font-bold text-green-deep">Add New Stream</h3>
              <button onClick={() => setShowNewStreamModal(false)} className="text-gray-500 hover:text-gray-700">
                X
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Stream Name</label>
                <input
                  type="text"
                  value={newStreamForm.name}
                  onChange={(event) => setNewStreamForm({ ...newStreamForm, name: event.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  placeholder="e.g. Instagram, Partner Clinics"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Target</label>
                  <input
                    type="number"
                    min={0}
                    value={newStreamForm.target}
                    onChange={(event) => setNewStreamForm({ ...newStreamForm, target: event.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Secured</label>
                  <input
                    type="number"
                    min={0}
                    value={newStreamForm.secured}
                    onChange={(event) => setNewStreamForm({ ...newStreamForm, secured: event.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewStreamModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-dm-sans hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addRevenueStream}
                disabled={!newStreamForm.name.trim()}
                className="flex-1 px-4 py-2 bg-gold text-green-deep rounded-lg font-dm-sans font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {viewingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-dm-sans font-bold text-green-deep">Patient Details</h3>
              <button 
                onClick={() => setViewingPatient(null)} 
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 rounded-full bg-green-deep/10 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-dm-sans font-semibold text-green-deep">{viewingPatient.name}</h4>
                  <p className="text-text-mid">{viewingPatient.program}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStageColor(viewingPatient.stage)}`}>
                      {viewingPatient.stage}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      viewingPatient.risk === 'High' ? 'bg-red-100 text-red-800' :
                      viewingPatient.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {viewingPatient.risk} Priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-1">Phone</label>
                  <p className="font-dm-sans text-green-deep">{viewingPatient.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-1">Email</label>
                  <p className="font-dm-sans text-green-deep">{viewingPatient.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-1">Age</label>
                  <p className="font-dm-sans text-green-deep">{viewingPatient.age} years</p>
                </div>
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-1">Source</label>
                  <p className="font-dm-sans text-green-deep">{viewingPatient.source}</p>
                </div>
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-1">Specify Source</label>
                  <p className="font-dm-sans text-green-deep">
                    {getSpecificSource(viewingPatient) || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-gray-50 rounded-[16px] p-4 space-y-3">
                <h5 className="font-dm-sans font-semibold text-green-deep">Status</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-dm-sans text-gray-600">Consent Status</label>
                    <p className="font-dm-sans text-sm text-green-deep">{viewingPatient.consentStatus}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-dm-sans text-gray-600">Last Touch</label>
                    <p className="font-dm-sans text-sm text-green-deep">{viewingPatient.lastTouch}</p>
                  </div>
                </div>

                {/* Notes - Inside Status Section */}
                <div className="pt-3 border-t border-gray-200">
                  <label className="block text-xs font-dm-sans font-medium text-gray-600 mb-2">Notes</label>
                  {viewingPatient.notes && viewingPatient.notes.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {[...viewingPatient.notes].reverse().map((note, i) => (
                        <div key={i} className="bg-yellow-50 rounded-lg p-2 border-l-4 border-gold">
                          <p className="font-dm-sans text-sm text-green-deep">{note.text}</p>
                          <p className="font-dm-sans text-xs text-gray-500 mt-1">
                            {new Date(note.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-dm-sans text-sm text-gray-400 italic">No notes yet</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {viewingPatient.tags && viewingPatient.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-dm-sans font-medium text-gray-600 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {viewingPatient.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gold/20 text-green-deep rounded-full text-xs font-dm-sans">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setViewingPatient(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-green-deep/20 font-dm-sans hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-dm-sans font-bold text-green-deep">Edit Patient</h3>
              <button 
                onClick={() => setEditingPatient(null)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Name</label>
                <input
                  type="text"
                  value={editingPatient.name}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  onChange={(e) => setEditingPatient({...editingPatient, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingPatient.phone}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    onChange={(e) => setEditingPatient({...editingPatient, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Email</label>
                  <input
                    type="email"
                    value={editingPatient.email}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    onChange={(e) => setEditingPatient({...editingPatient, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Program</label>
                <select
                  value={editingPatient.program}
                  onChange={(e) => setEditingPatient({...editingPatient, program: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                >
                  <option>Cardiometabolic Care</option>
                  <option>Hormonal Health</option>
                  <option>Nutritional Medicine</option>
                  <option>Preventive Care</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Stage</label>
                  <select
                    value={editingPatient.stage}
                    onChange={(e) => setEditingPatient({...editingPatient, stage: e.target.value as Stage})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  >
                    {pipelineStages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-1">Priority</label>
                  <select
                    value={editingPatient.risk}
                    onChange={(e) => setEditingPatient({...editingPatient, risk: e.target.value as Risk})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-dm-sans font-medium text-green-deep mb-1">Add Note</label>
                <textarea
                  value={editingPatient.note || ''}
                  placeholder="Add a note about this patient..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  onChange={(e) => setEditingPatient({...editingPatient, note: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">This note will be saved with the current date and time.</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingPatient(null)}
                  disabled={savingPatient}
                  className="flex-1 px-4 py-2 rounded-lg border border-green-deep/20 font-dm-sans hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setSavingPatient(true)
                    try {
                      // Build updated patient with new note
                      const updatedPatientData = {
                        ...editingPatient,
                        name: editingPatient.name,
                        phone: editingPatient.phone,
                        email: editingPatient.email,
                        program: editingPatient.program,
                        stage: editingPatient.stage,
                        risk: editingPatient.risk,
                      }
                      
                      // Add note if provided
                      if (editingPatient.note && editingPatient.note.trim()) {
                        const newNote = {
                          text: editingPatient.note.trim(),
                          timestamp: new Date().toISOString()
                        }
                        updatedPatientData.notes = [
                          ...(editingPatient.notes || []),
                          newNote
                        ]
                        // Clear the note field
                        delete updatedPatientData.note
                      }

                      const response = await fetch('/api/crm', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedPatientData)
                      })
                      
                      if (response.ok) {
                        const data = await response.json()
                        const updatedPatient = data.patient || data
                        setPatients(prev => prev.map(p => p.id === updatedPatient.id ? {...updatedPatient, notes: updatedPatientData.notes} : p))
                        setEditingPatient(null)
                      } else {
                        const errorText = await response.text()
                        console.error('API error:', errorText)
                      }
                    } catch (error) {
                      console.error('Error updating patient:', error)
                    } finally {
                      setSavingPatient(false)
                    }
                  }}
                  disabled={savingPatient}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-deep text-white font-dm-sans hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPatient ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
