import Navigation from '@/components/Navigation'
import Hero from '@/components/Hero'
import About from '@/components/About'
import MobileCare from '@/components/MobileCare'
import HealthRiskAssessment from '@/components/HealthRiskAssessment'
import FunctionalHealthSummary from '@/components/FunctionalHealthSummary'
import HowItWorks from '@/components/HowItWorks'
import Programs from '@/components/Programs'
import Pricing from '@/components/Pricing'
import CorporateWellness from '@/components/CorporateWellness'
import VideoSection from '@/components/VideoSection'
import PhotoGallery from '@/components/PhotoGallery'
import FreshPerspectives from '@/components/FreshPerspectives'
import PatientStories from '@/components/PatientStories'
import HealthCTA from '@/components/HealthCTA'
import FXMedElite from '@/components/FXMedElite'
import Footer from '@/components/Footer'
import ChatAssistant from '@/components/AIChat'
import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'FXMed | Functional Medicine Clinic That Comes to You',
  description:
    'Book functional medicine, mobile healthcare, lab testing, concierge care, health risk assessments and nutrition support with FXMed in Lagos and Cypress, Texas.',
  keywords: [
    'functional medicine clinic',
    'mobile healthcare',
    'concierge medicine',
    'health risk assessment',
    'home lab testing',
    'Lagos healthcare',
  ],
})

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <About />
      <MobileCare />
      <HealthRiskAssessment />
      <FunctionalHealthSummary />
      <HowItWorks />
      <Programs />
      <Pricing />
      <FXMedElite />
      <CorporateWellness />
      <VideoSection />
      <PhotoGallery />
      <FreshPerspectives />
      <PatientStories />
      <HealthCTA />
      <Footer />
      <ChatAssistant />
    </main>
  )
}
