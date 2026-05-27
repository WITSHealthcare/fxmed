import { Suspense } from 'react'
import InvestigationsClient from './InvestigationsClient'

export default function FunctionalHealthInvestigations() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FCFFF0] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
            <p className="font-dm-sans text-green-deep">Loading your personalized investigations...</p>
          </div>
        </div>
      }
    >
      <InvestigationsClient />
    </Suspense>
  )
}
