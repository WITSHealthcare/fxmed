'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AddressBookIcon,
  ArticleIcon,
  CalendarCheckIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  BriefcaseIcon,
  HandshakeIcon,
  HospitalIcon,
  GraduationCapIcon,
  RobotIcon,
  ShieldCheckIcon,
  SignOutIcon,
  ToolboxIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import BlogManagement from '@/components/admin/BlogManagement'
import CrmDashboard from '@/components/admin/CrmDashboard'
import SeoAnalytics from '@/components/admin/SeoAnalytics'
import Messages from '@/components/admin/Messages'
import AppointmentCalendar from '@/components/admin/AppointmentCalendar'
import Notifications from '@/components/admin/Notifications'
import UserManagement from '@/components/admin/UserManagement'
import ZaraDashboard from '@/components/admin/ZaraDashboard'
import AdminTools from '@/components/admin/AdminTools'
import Contacts from '@/components/admin/Contacts'
import AmbassadorProgram from '@/components/admin/AmbassadorProgram'
import CareersManagement from '@/components/admin/CareersManagement'
import EmrWorkspace from '@/components/admin/emr/EmrWorkspace'
import Training from '@/components/admin/Training'
import AdminAccountMenu from '@/components/admin/AdminAccountMenu'
import { getCurrentAdminRole, signOut, supabase } from '@/lib/supabase-auth'
import { adminRoleLabels, adminRolePermissions, canAccessCrmView, canAccessTab, type AdminRole, type AdminTab } from '@/lib/admin-auth'
import blogContentData from '@/app/blog/fxmed-content (1).json'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  thumbnail_url: string
  status: 'draft' | 'published'
  read_time: string
  created_at: string
  updated_at: string
}

type Stage = "Outreach" | "Follow Up" | "Enrolment" | "Onboarding" | "Active"
type Risk = "High" | "Medium" | "Low"
type CrmView = "clinical" | "financial"

const adminNavItems: Array<{ id: AdminTab; label: string; Icon: typeof ArticleIcon; title: string; description: string }> = [
  { id: 'blog', label: 'Blog Management', Icon: ArticleIcon, title: 'Blog Management', description: 'Manage your blog posts, drafts, and content' },
  { id: 'crm', label: 'CRM', Icon: UsersThreeIcon, title: 'CRM Dashboard', description: 'Track patients, manage pipeline, and optimize outreach' },
  { id: 'seo', label: 'SEO Analytics', Icon: ChartLineUpIcon, title: 'SEO Analytics', description: 'Monitor search performance and optimize content' },
  { id: 'messages', label: 'Messages', Icon: ChatCircleDotsIcon, title: 'Messages', description: 'View and manage messages from patients and visitors' },
  { id: 'requests', label: 'Requests', Icon: CalendarCheckIcon, title: 'Requests', description: 'Manage appointment bookings and consultation requests' },
  { id: 'ambassador', label: 'Ambassador Program', Icon: HandshakeIcon, title: 'Ambassador Program', description: 'Track ambassadors, referrals, and program performance' },
  { id: 'careers', label: 'Careers', Icon: BriefcaseIcon, title: 'Careers', description: 'Publish and manage the job openings shown on the public careers page' },
  { id: 'training', label: 'Training', Icon: GraduationCapIcon, title: 'Staff Training', description: 'Build role-based training programs, complete assigned lessons, and track your progress' },
  { id: 'tools', label: 'Tools', Icon: ToolboxIcon, title: 'Tools', description: 'Quick access to admin workflows and operational utilities' },
  { id: 'users', label: 'Users & Roles', Icon: ShieldCheckIcon, title: 'Users & Roles', description: 'Create dashboard users and assign role-based access' },
  { id: 'zara', label: 'Zara', Icon: RobotIcon, title: 'Zara Conversations', description: 'View all interactions people have had with Zara, the AI assistant' },
  { id: 'contacts', label: 'Contacts', Icon: AddressBookIcon, title: 'Outreach Contacts', description: 'Details and biodata collected from people at outreaches' },
  { id: 'healthcare', label: 'Healthcare / EMR', Icon: HospitalIcon, title: 'Healthcare / EMR', description: 'Manage clinical patients, encounters, records, investigations, medications and care plans' },
]

type Note = {
  text: string
  timestamp: string
}

// Interface for the JSON content data
interface BlogContentItem {
  id: number
  title: string
  description: string
  category: string
  publishDate: string
  status: string
  priority: string
  assignedTo: string
  notes: string
  contentType: string
  platform: string
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

export default function AdminPanel() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('blog')
  const [crmView, setCrmView] = useState<CrmView>('clinical')
  const [importing, setImporting] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null)

  // CRM state
  const [patients, setPatients] = useState<Patient[]>(patientsSeed)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Website Lead",
    specifySource: "",
    program: "Cardiometabolic Care",
    owner: "Tola",
    risk: "Medium" as Risk,
    consent: false
  })

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const role = await getCurrentAdminRole()
        if (!role) {
          router.replace('/admin/login')
          return
        }

        const permissions = adminRolePermissions[role]
        const defaultTab = permissions.tabs[0]
        const defaultCrmView = permissions.crmViews[0]

        setCurrentRole(role)
        setActiveTab(defaultTab)
        if (defaultCrmView) setCrmView(defaultCrmView)
      } catch (error) {
        console.error('Admin auth check failed:', error)
        router.replace('/admin/login')
      } finally {
        setAuthChecking(false)
      }
    }

    verifyAdminAccess()
  }, [router])

  // Import JSON content as drafts in batches
  const importDraftsFromJSON = async () => {
    const contentItems = blogContentData as BlogContentItem[]
    const importedPosts: BlogPost[] = []
    const batchSize = 50

    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)

      for (const item of batch) {
        try {
          const slug = item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
          const postData = {
            title: item.title,
            excerpt: item.description,
            content: '',
            author: 'FXMed Team',
            category: item.category,
            status: 'draft',
            read_time: '5 min read',
            thumbnail_url: '',
          }

          const response = await fetch('/api/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          })

          if (response.ok) {
            const { post } = await response.json()
            importedPosts.push(post)
          } else {
            console.error('Failed to import draft:', item.title, response.status)
          }
        } catch (error) {
          console.error(`Error importing draft: ${item.title}`, error)
        }
      }

      // Add delay between batches
      if (i + batchSize < contentItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return importedPosts
  }

  // Fetch drafts and published posts separately
  useEffect(() => {
    if (authChecking) return

    const initializePosts = async () => {
      try {
        // Fetch drafts from draft_posts table
        const draftsResponse = await fetch('/api/drafts')
        if (!draftsResponse.ok) throw new Error('Failed to fetch drafts')
        const { drafts: draftsData } = await draftsResponse.json()
        
        // Fetch published posts from blog_posts table
        const postsResponse = await fetch('/api/blog?status=published')
        if (!postsResponse.ok) throw new Error('Failed to fetch published posts')
        const { posts: publishedData } = await postsResponse.json()
        
        const allDrafts = draftsData || []
        const publishedPosts = publishedData || []
        
        // Combine drafts and published posts for the admin interface
        setPosts([...allDrafts, ...publishedPosts])
      } catch (error) {
        console.error('Error initializing posts:', error)
      } finally {
        setLoading(false)
      }
    }

    initializePosts()
  }, [authChecking])

  // Fetch CRM patients on mount
  useEffect(() => {
    if (authChecking) return

    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/crm')
        if (!response.ok) throw new Error('Failed to fetch patients')

        const { patients: data } = await response.json()
        setPatients(data || patientsSeed)
      } catch (error) {
        console.error('Error fetching patients:', error)
        setPatients(patientsSeed)
      }
    }

    fetchPatients()
  }, [authChecking])

  const createLead = async () => {
    if (!leadForm.name.trim()) return
    const specificSource = leadForm.specifySource.trim()

    try {
      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone || null,
          email: leadForm.email || null,
          source: leadForm.source,
          specify_source: leadForm.specifySource || null,
          program: leadForm.program,
          owner: leadForm.owner,
          risk: leadForm.risk,
          stage: "Outreach",
          last_touch: new Date().toISOString(),
          next_step: "Initial outreach and qualification",
          next_date: "Mar 24",
          progress: 10,
          tags: ["New lead", ...(specificSource ? [`Specific Source: ${specificSource}`] : [])],
          preferred: leadForm.phone ? "Phone" : "Email",
          appointment: "Not scheduled",
          consent_status: leadForm.consent ? "Sent" : "Pending",
          document_count: 0,
          reminder_status: "Queued",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to create lead')
      }

      const { patient: newPatient } = await response.json()
      
      // Refresh patients list to get the new data from database
      const fetchResponse = await fetch('/api/crm')
      if (fetchResponse.ok) {
        const { patients: updatedPatients } = await fetchResponse.json()
        setPatients(updatedPatients || patientsSeed)
      }
      
      setShowLeadModal(false)
      setLeadForm({ name: "", phone: "", email: "", source: "Website Lead", specifySource: "", program: "Cardiometabolic Care", owner: "Tola", risk: "Medium", consent: false })
      
      alert('Lead created successfully!')
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Error creating lead. Please try again.')
    }
  }

  // Direct Supabase import function
  const handleDirectSupabaseImport = async () => {
    setImporting(true)
    try {
      const contentItems = blogContentData as BlogContentItem[]
      
      const importedPosts: BlogPost[] = []
      const batchSize = 10 // Smaller batches for direct DB

      for (let i = 0; i < contentItems.length; i += batchSize) {
        const batch = contentItems.slice(i, i + batchSize)

        for (const item of batch) {
          try {
            const baseSlug = item.title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            const slug = `${baseSlug}-${item.id}`;
            const postData = {
              title: item.title,
              slug: slug,
              excerpt: item.description,
              content: '',
              author: 'FXMed Team',
              category: item.category,
              status: 'draft',
              read_time: '5 min read',
              thumbnail_url: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('draft_posts')
              .insert(postData)
              .select()
              .single()

            if (error) {
              console.error('Supabase error:', error)
              throw error
            }

            if (data) {
              importedPosts.push(data)
            }
          } catch (error) {
            console.error(`Error importing draft: ${item.title}`, error)
          }
        }

        // Add delay between batches
        if (i + batchSize < contentItems.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setPosts([...importedPosts, ...posts])
      
    } catch (error) {
      console.error('Direct Supabase import failed:', error)
    } finally {
      setImporting(false)
    }
  }

  // Manual import test function
  const handleManualImport = async () => {
    setImporting(true)
    try {
      const importedPosts = await importDraftsFromJSON()
      setPosts([...importedPosts, ...posts])
    } catch (error) {
      console.error('Manual import failed:', error)
    } finally {
      setImporting(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if logout fails
      router.push('/admin/login')
    }
  }

  const availableTabs = currentRole ? adminNavItems.filter((item) => canAccessTab(currentRole, item.id)) : []
  const activeNavItem = adminNavItems.find((item) => item.id === activeTab)
  const canViewClinicalCrm = canAccessCrmView(currentRole, 'clinical')
  const canViewFinancialCrm = canAccessCrmView(currentRole, 'financial')

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
          <p className="text-text-mid font-dm-sans">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5ee] font-dm-sans text-green-deep lg:grid lg:grid-cols-[292px_minmax(0,1fr)]">
      <aside className="relative z-30 flex h-auto flex-col overflow-hidden bg-green-deep px-5 py-5 text-white shadow-[12px_0_50px_rgba(26,61,46,0.10)] lg:sticky lg:top-0 lg:h-screen lg:px-7 lg:py-7">
        <AdminNodes className="pointer-events-none absolute inset-0 h-full w-full text-gold/15" />
        <div className="relative flex items-center justify-between lg:block">
          <div
            role="img"
            aria-label="FXMed"
            className="h-16 w-48 bg-no-repeat sm:w-52 lg:w-56"
            style={{ backgroundImage: "url('/logo.png')", backgroundPosition: '51% 45%', backgroundSize: '115.5% auto' }}
          />
          <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"><SignOutIcon size={18} weight="duotone" />Sign out</button>
        </div>

        <div className="relative mt-4 rounded-[22px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm lg:mt-7">
          <span className="inline-flex rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-green-deep">FXMed Admin</span>
          <p className="mt-4 text-lg font-bold">Management Portal</p>
          <p className="mt-1 text-xs tracking-[0.05em] text-white/50">{currentRole ? adminRoleLabels[currentRole] : 'Dashboard access'}</p>
        </div>

        <nav className="relative mt-4 flex gap-2 overflow-x-auto pb-2 lg:mt-7 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1.5 lg:overflow-y-auto lg:pb-4 lg:pr-1">
          {availableTabs.map((item) => (
            <div key={item.id} className={item.id === 'healthcare' ? 'mt-5 border-t border-white/10 pt-5' : ''}>
              {item.id === 'healthcare' && <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-gold/70">Healthcare</p>}
            <button
              onClick={() => setActiveTab(item.id)}
              className={`group flex shrink-0 items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-sm font-semibold transition-all lg:w-full ${
                activeTab === item.id
                  ? 'bg-gold text-green-deep shadow-[0_8px_24px_rgba(201,226,101,0.18)]'
                  : 'text-white/65 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <item.Icon
                size={22}
                weight={activeTab === item.id ? 'fill' : 'duotone'}
                aria-hidden="true"
                className={`shrink-0 transition-colors ${activeTab === item.id ? 'text-green-deep' : 'text-white/55 group-hover:text-gold'}`}
              />
              <span>{item.label}</span>
            </button>
            </div>
          ))}
        </nav>

        <div className="relative mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-semibold text-white/60 transition hover:bg-white/[0.08] hover:text-white"><SignOutIcon size={22} weight="duotone" />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 pb-8">
        <header className="sticky top-0 z-20 border-b border-green-deep/10 bg-[#f7f5ee]/95 px-4 py-5 shadow-[0_10px_30px_rgba(26,61,46,0.04)] backdrop-blur-xl sm:px-7 lg:px-10 lg:py-7 xl:px-12">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              {activeNavItem && <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-green-deep text-gold shadow-[0_8px_20px_rgba(26,61,46,0.14)] sm:flex"><activeNavItem.Icon size={25} weight="fill" /></span>}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-green-mid">Admin workspace</p>
                <h1 className="mt-1 truncate text-[clamp(1.7rem,3vw,2.5rem)] font-bold leading-none tracking-[-0.035em]">{activeNavItem?.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AdminAccountMenu roleLabel={currentRole ? adminRoleLabels[currentRole] : 'Dashboard user'} />
              <Notifications />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
          <div className="mb-8 rounded-[22px] border border-green-deep/10 bg-white px-5 py-5 shadow-[0_8px_30px_rgba(26,61,46,0.05)] sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="max-w-3xl text-sm leading-6 text-text-mid">{activeNavItem?.description}</p>
              </div>
                {activeTab === 'crm' && canViewClinicalCrm && canViewFinancialCrm && (
                  <div className="flex items-center rounded-full border border-green-deep/10 bg-[#f7f5ee] p-1">
                    <button
                      onClick={() => setCrmView('clinical')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        crmView === 'clinical'
                          ? 'bg-green-deep text-white shadow-sm'
                          : 'text-gray-700 hover:text-green-deep'
                      }`}
                    >
                      Clinical CRM
                    </button>
                    <button
                      onClick={() => setCrmView('financial')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        crmView === 'financial'
                          ? 'bg-green-deep text-white shadow-sm'
                          : 'text-gray-700 hover:text-green-deep'
                      }`}
                    >
                      Financial CRM
                    </button>
                  </div>
                )}
            </div>
          </div>

          <div className="min-w-0">
            {activeTab === 'blog' && canAccessTab(currentRole, 'blog') && (
              <BlogManagement posts={posts} setPosts={setPosts} />
            )}

            {activeTab === 'crm' && canAccessTab(currentRole, 'crm') && canAccessCrmView(currentRole, crmView) && (
              <CrmDashboard
                patients={patients}
                setPatients={setPatients}
                crmView={crmView}
                showLeadModal={showLeadModal}
                setShowLeadModal={setShowLeadModal}
                leadForm={leadForm}
                setLeadForm={setLeadForm}
                createLead={createLead}
              />
            )}

            {activeTab === 'seo' && canAccessTab(currentRole, 'seo') && <SeoAnalytics />}

            {activeTab === 'messages' && canAccessTab(currentRole, 'messages') && <Messages />}

            {activeTab === 'requests' && canAccessTab(currentRole, 'requests') && <AppointmentCalendar />}

            {activeTab === 'ambassador' && canAccessTab(currentRole, 'ambassador') && (
              <AmbassadorProgram />
            )}

            {activeTab === 'careers' && canAccessTab(currentRole, 'careers') && <CareersManagement />}

            {activeTab === 'training' && currentRole && canAccessTab(currentRole, 'training') && <Training role={currentRole} />}

            {activeTab === 'tools' && canAccessTab(currentRole, 'tools') && <AdminTools />}

            {activeTab === 'users' && canAccessTab(currentRole, 'users') && (
              <UserManagement />
            )}

            {activeTab === 'zara' && canAccessTab(currentRole, 'zara') && (
              <ZaraDashboard />
            )}

            {activeTab === 'contacts' && canAccessTab(currentRole, 'contacts') && <Contacts />}

            {activeTab === 'healthcare' && canAccessTab(currentRole, 'healthcare') && <EmrWorkspace />}
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminNodes({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 292 900" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1">
        <path d="M18 70 102 118 55 210 144 270 92 370" />
        <path d="M210 28 255 124 190 205 272 290 215 390" />
        <path d="M20 610 105 560 175 650 255 590 280 740 190 830" />
      </g>
      <g fill="currentColor">
        <circle cx="18" cy="70" r="3" /><circle cx="102" cy="118" r="4" /><circle cx="55" cy="210" r="3" /><circle cx="144" cy="270" r="4" /><circle cx="92" cy="370" r="3" />
        <circle cx="210" cy="28" r="3" /><circle cx="255" cy="124" r="4" /><circle cx="190" cy="205" r="3" /><circle cx="272" cy="290" r="4" /><circle cx="215" cy="390" r="3" />
        <circle cx="20" cy="610" r="3" /><circle cx="105" cy="560" r="4" /><circle cx="175" cy="650" r="3" /><circle cx="255" cy="590" r="4" /><circle cx="280" cy="740" r="3" /><circle cx="190" cy="830" r="4" />
      </g>
    </svg>
  )
}
