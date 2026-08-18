import Navigation from '@/components/Navigation'
import HealthRiskAssessment from '@/components/HealthRiskAssessment'
import Footer from '@/components/Footer'

export default function HealthAssessmentPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-24">
        <HealthRiskAssessment headingLevel="h1" />
      </div>
      <Footer />
    </main>
  )
}
