'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BlogManagement from '@/components/admin/BlogManagement'
import CrmDashboard from '@/components/admin/CrmDashboard'
import SeoAnalytics from '@/components/admin/SeoAnalytics'
import FunctionalHealthAnalysis from '@/components/admin/FunctionalHealthAnalysis'
import Messages from '@/components/admin/Messages'
import AppointmentCalendar from '@/components/admin/AppointmentCalendar'
import Notifications from '@/components/admin/Notifications'
import { signOut } from '@/lib/supabase-auth'
import { createClient } from '@supabase/supabase-js'
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
  // Create direct Supabase client inside component
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'blog' | 'crm' | 'seo' | 'health' | 'messages' | 'requests'>('blog')
  const [crmView, setCrmView] = useState<CrmView>('clinical')
  const [importing, setImporting] = useState(false)

  // CRM state
  const [patients, setPatients] = useState<Patient[]>(patientsSeed)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Website Lead",
    program: "Cardiometabolic Care",
    owner: "Tola",
    risk: "Medium" as Risk,
    consent: false
  })

  // Import JSON content as drafts in batches
  const importDraftsFromJSON = async () => {
    console.log('Starting import from JSON...')
    const contentItems = blogContentData as BlogContentItem[]
    console.log('Content items loaded:', contentItems.length)
    const importedPosts: BlogPost[] = []
    const batchSize = 50

    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`)

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
            console.log('Imported draft:', item.title)
          } else {
            console.error('Failed to import draft:', item.title, response.status)
          }
        } catch (error) {
          console.error(`Error importing draft: ${item.title}`, error)
        }
      }

      // Add delay between batches
      if (i + batchSize < contentItems.length) {
        console.log('Waiting 1 second before next batch...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('Import complete. Total imported:', importedPosts.length)
    return importedPosts
  }

  // Fetch drafts and published posts separately
  useEffect(() => {
    const initializePosts = async () => {
      try {
        console.log('Initializing posts...')
        
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
        
        console.log('Drafts loaded:', allDrafts.length)
        console.log('Published posts loaded:', publishedPosts.length)
        
        // Combine drafts and published posts for the admin interface
        setPosts([...allDrafts, ...publishedPosts])
        console.log('Total posts loaded:', allDrafts.length + publishedPosts.length)
      } catch (error) {
        console.error('Error initializing posts:', error)
      } finally {
        setLoading(false)
      }
    }

    initializePosts()
  }, [])

  // Load saved notes from localStorage
  const loadNotesFromStorage = (): Record<string, Note[]> => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem('crm-patient-notes')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }

  // Save notes to localStorage
  const saveNotesToStorage = (notes: Record<string, Note[]>) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('crm-patient-notes', JSON.stringify(notes))
  }

  // Fetch CRM patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/crm')
        if (!response.ok) throw new Error('Failed to fetch patients')

        const { patients: data } = await response.json()
        
        // Merge with localStorage notes (temporary until DB migration is applied)
        const savedNotes = loadNotesFromStorage()
        const mergedPatients = (data || patientsSeed).map((p: Patient) => ({
          ...p,
          notes: p.notes || savedNotes[p.id] || []
        }))
        
        setPatients(mergedPatients)
      } catch (error) {
        console.error('Error fetching patients:', error)
        // Merge seed data with localStorage notes
        const savedNotes = loadNotesFromStorage()
        const mergedPatients = patientsSeed.map(p => ({
          ...p,
          notes: p.notes || savedNotes[p.id] || []
        }))
        setPatients(mergedPatients)
      }
    }

    fetchPatients()
  }, [])

  const createLead = async () => {
    if (!leadForm.name.trim()) return

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
          program: leadForm.program,
          owner: leadForm.owner,
          risk: leadForm.risk,
          stage: "Outreach",
          last_touch: new Date().toISOString(),
          next_step: "Initial outreach and qualification",
          next_date: "Mar 24",
          progress: 10,
          tags: ["New lead"],
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
      setLeadForm({ name: "", phone: "", email: "", source: "Website Lead", program: "Cardiometabolic Care", owner: "Tola", risk: "Medium", consent: false })
      
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
      console.log('Direct Supabase import triggered...')
      const contentItems = blogContentData as BlogContentItem[]
      console.log('Content items loaded:', contentItems.length)
      
      const importedPosts: BlogPost[] = []
      const batchSize = 10 // Smaller batches for direct DB

      for (let i = 0; i < contentItems.length; i += batchSize) {
        const batch = contentItems.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`)

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

            const { data, error } = await supabaseAdmin
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
              console.log('Directly imported draft:', item.title)
            }
          } catch (error) {
            console.error(`Error importing draft: ${item.title}`, error)
          }
        }

        // Add delay between batches
        if (i + batchSize < contentItems.length) {
          console.log('Waiting 500ms before next batch...')
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log('Direct Supabase import complete. Total imported:', importedPosts.length)
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
      console.log('Manual import triggered...')
      const importedPosts = await importDraftsFromJSON()
      setPosts([...importedPosts, ...posts])
      console.log('Manual import complete!')
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
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if logout fails
      router.push('/admin/login')
    }
  }

  if (loading) {
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
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top Header */}
      <header className="bg-green-deep shadow-custom border-b border-green-deep/20">
        <div className="flex items-center justify-between px-[5%] py-[18px]">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo.png" 
              alt="FXMed" 
              className="h-[120px] w-auto"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <h1 className="text-2xl font-dm-sans font-bold text-cream">
                Admin Panel
              </h1>
              <p className="text-sm text-cream/70">
                Management Dashboard
              </p>
            </div>
            <Notifications />
            <button
              onClick={handleLogout}
              className="font-dm-sans bg-white/10 hover:bg-white/20 text-cream px-4 py-2 rounded-[30px] font-semibold text-sm transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-green-deep/95 border-r border-green-deep/20">
          {/* Admin Dashboard Title */}
          <div className="px-4 pt-6 pb-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 px-4 py-3">
              <h3 className="text-center font-dm-sans font-bold text-cream text-sm tracking-wider">
                ADMIN DASHBOARD
              </h3>
            </div>
          </div>
          
          {/* Main Navigation */}
          <nav className="px-4 pb-6">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('blog')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'blog'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>📝</span>
                <span>Blog Management</span>
              </button>
              <button
                onClick={() => setActiveTab('crm')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'crm'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>👥</span>
                <span>CRM</span>
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'seo'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>📈</span>
                <span>SEO Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'health'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>🏥</span>
                <span>Health Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'messages'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>💬</span>
                <span>Messages</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`w-full px-4 py-3 rounded-lg font-dm-sans text-sm font-medium transition-all text-left flex items-center space-x-3 ${
                  activeTab === 'requests'
                    ? 'bg-gold text-green-deep shadow-md'
                    : 'text-cream/85 hover:bg-green-deep/20 hover:text-cream'
                }`}
              >
                <span>📋</span>
                <span>Requests</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* Content Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-3xl font-dm-sans font-bold text-green-deep mb-2">
                  {activeTab === 'blog' && 'Blog Management'}
                  {activeTab === 'crm' && 'CRM Dashboard'}
                  {activeTab === 'seo' && 'SEO Analytics'}
                  {activeTab === 'health' && 'Functional Health Analysis'}
                  {activeTab === 'messages' && 'Messages'}
                  {activeTab === 'requests' && 'Requests'}
                </h2>
                {activeTab === 'crm' && (
                  <div className="flex items-center bg-gray-100 rounded-full p-1 border border-green-deep/10">
                    <button
                      onClick={() => setCrmView('clinical')}
                      className={`px-4 py-2 rounded-full text-sm font-dm-sans font-medium transition-colors ${
                        crmView === 'clinical'
                          ? 'bg-green-deep text-white shadow-sm'
                          : 'text-gray-700 hover:text-green-deep'
                      }`}
                    >
                      Clinical CRM
                    </button>
                    <button
                      onClick={() => setCrmView('financial')}
                      className={`px-4 py-2 rounded-full text-sm font-dm-sans font-medium transition-colors ${
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
              <p className="text-text-mid">
                {activeTab === 'blog' && 'Manage your blog posts, drafts, and content'}
                {activeTab === 'crm' && 'Track patients, manage pipeline, and optimize outreach'}
                {activeTab === 'seo' && 'Monitor search performance and optimize content'}
                {activeTab === 'health' && 'Review and manage health assessment submissions'}
                {activeTab === 'messages' && 'View and manage messages from patients and visitors'}
                {activeTab === 'requests' && 'Manage appointment bookings and consultation requests'}
              </p>
            </div>

            {/* Content Area */}
            {activeTab === 'blog' && (
              <BlogManagement posts={posts} setPosts={setPosts} />
            )}

            {activeTab === 'crm' && (
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

            {activeTab === 'seo' && <SeoAnalytics />}

            {activeTab === 'health' && <FunctionalHealthAnalysis />}

            {activeTab === 'messages' && <Messages />}

            {activeTab === 'requests' && <AppointmentCalendar />}
          </div>
        </div>
      </div>
    </div>
  )
}
