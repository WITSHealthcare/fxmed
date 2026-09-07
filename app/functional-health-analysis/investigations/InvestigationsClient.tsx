'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { displayAge } from '@/lib/age'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

interface FormData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth?: string
    age?: string
    gender: string
  }
  healthConcerns: {
    primaryConcern: string
    symptoms: string[]
    duration: string
    severity: string
  }
  lifestyle: {
    diet: string
    exercise: string
    sleep: string
    stress: string
  }
  medicalHistory: {
    medications: string
    supplements: string
    conditions: string
    surgeries: string
  }
  goals: {
    primaryGoal: string
    timeline: string
    expectations: string
  }
}

export default function InvestigationsClient() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<FormData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'complete' | 'bring-own'>('complete')

  useEffect(() => {
    // In a real app, you would fetch this data from your backend
    // For now, we'll simulate the data based on URL params
    const formDataParam = searchParams.get('data')
    if (formDataParam) {
      try {
        setFormData(JSON.parse(atob(formDataParam)))
      } catch (error) {
        console.error('Error parsing form data:', error)
      }
    } else {
      const saved = sessionStorage.getItem('fxmed-health-analysis')
      if (saved) {
        try { setFormData(JSON.parse(saved)) } catch (error) { console.error('Error restoring assessment data:', error) }
      }
    }

    // The form redirects here with ?assessment=<id>. Record that the visitor
    // reached this step, and keep the id for the results page, which is not
    // navigated to with the query string.
    const assessmentId = searchParams.get('assessment')
    if (assessmentId) {
      sessionStorage.setItem('fxmed-health-analysis-id', assessmentId)
      fetch('/api/health-analysis/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assessmentId, step: 'investigations_viewed_at' }),
      }).catch(() => {
        // Progress tracking must never interrupt the visitor's journey.
      })
    }

    setIsLoading(false)
  }, [searchParams])

  const investigations = [
    {
      category: "Complete Blood Count (CBC)",
      description: "Comprehensive blood analysis to assess overall health, detect infections, anemia, and immune system status",
      importance: "Essential",
      price: 6300
    },
    {
      category: "Comprehensive Metabolic Panel (CMP)",
      description: "Evaluates kidney function, liver function, blood sugar levels, and electrolyte balance for metabolic health assessment",
      importance: "Essential",
      price: 45000
    },
    {
      category: "Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)",
      description: "Complete cholesterol analysis including HDL, LDL, and triglycerides to assess cardiovascular risk and metabolic function",
      importance: "Essential",
      price: 20500
    },
    {
      category: "Thyroid (TSH, free T3, free T4)",
      description: "Comprehensive thyroid evaluation to assess metabolic rate, energy production, and hormonal balance",
      importance: "Essential",
      price: 35000
    },
    {
      category: "HbA1c (Glycated Hemoglobin)",
      description: "Measures average blood sugar levels over 2-3 months to assess glucose control and metabolic health",
      importance: "Essential",
      price: 25000
    },
    {
      category: "High Sensitivity CRP",
      description: "Detects low levels of inflammation that may indicate chronic disease risk and cardiovascular issues",
      importance: "Essential",
      price: 21000
    },
    {
      category: "Vitamin D (25-OH Vitamin D)",
      description: "Measures vitamin D status critical for immune function, bone health, hormone balance, and disease prevention",
      importance: "Essential",
      price: 80000
    },
    {
      category: "ESR (Erythrocyte Sedimentation Rate)",
      description: "Measures the rate at which red blood cells settle in a test tube, indicating inflammation levels in the body",
      importance: "Essential",
      price: 6000
    },
  ]

  const essentialTests = investigations

  // Calculate total price for Complete Health Package
  const labTestsTotal = investigations.reduce((sum, test) => sum + (test.price || 0), 0)
  const functionalAnalysisPrice = 235000
  const logisticsFee = 20000
  const totalPrice = labTestsTotal + functionalAnalysisPrice + logisticsFee

  const handlePayment = () => {
    // Redirect to payment page or payment gateway based on selected package
    const paymentUrl = activeTab === 'complete' 
      ? "https://paystack.shop/pay/fxmed"
      : "https://paystack.shop/pay/m8z7f68z-o"
    window.open(paymentUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFFF0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep mx-auto mb-4"></div>
          <p className="font-dm-sans text-green-deep">Loading your personalized investigations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-[5%] pt-48 pb-40">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-6">
            Health Investigations
          </div>
          <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-6">
            Required Investigations for Analysis
          </h1>
          <p className="font-dm-sans text-text-mid text-[1.1rem] leading-[1.7] max-w-3xl mx-auto">
            You are required to complete the following lab tests that will help us provide deep insights into your health status and create your personalized wellness plan.
            <br /><br />
            As we proceed, you may be required to do some more investigations depending on the results of these.
            <br /><br />
            You can opt for the complete health package where we handle it all for you or to bring your own results for us to run the analysis.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-[50px] p-1 shadow-sm">
            <button 
              onClick={() => setActiveTab('complete')}
              className={`font-dm-sans px-6 py-3 rounded-[50px] text-[1rem] font-medium transition-all ${
                activeTab === 'complete' 
                  ? 'bg-gold text-green-deep' 
                  : 'text-green-deep hover:bg-green-deep/10'
              }`}
            >
              Complete Health Package
            </button>
            <button 
              onClick={() => setActiveTab('bring-own')}
              className={`font-dm-sans px-6 py-3 rounded-[50px] text-[1rem] font-medium transition-all ${
                activeTab === 'bring-own' 
                  ? 'bg-gold text-green-deep' 
                  : 'text-green-deep hover:bg-green-deep/10'
              }`}
            >
              Bring My Own Results
            </button>
          </div>
        </div>

        {/* Price Display for Complete Health Package */}
        {activeTab === 'complete' && (
          <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 text-white mb-8">
            <div className="text-center">
              <h2 className="font-dm-sans font-bold text-2xl mb-4">Complete Health Package</h2>
              <p className="font-dm-sans text-white/90 text-[1.1rem] mb-6">
                All recommended tests for comprehensive health analysis
              </p>
              
              <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
                <div className="text-center">
                  <span className="font-dm-sans text-xl text-white/90">Complete Functional Health Analysis Package</span>
                  <div className="font-dm-sans font-bold text-3xl mt-2">NGN {totalPrice.toLocaleString()}</div>
                </div>
              </div>

              <p className="font-dm-sans text-white/80 text-sm">
                Includes all essential laboratory investigations ({labTestsTotal.toLocaleString()} NGN) + Functional Health Analysis ({functionalAnalysisPrice.toLocaleString()} NGN) + Logistics Fee ({logisticsFee.toLocaleString()} NGN)
              </p>
            </div>
          </div>
        )}

        {/* Price Display for Bring My Own Results */}
        {activeTab === 'bring-own' && (
          <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 text-white mb-8">
            <div className="text-center">
              <h2 className="font-dm-sans font-bold text-2xl mb-4">Bring Your Own Results</h2>
              <p className="font-dm-sans text-white/90 text-[1.1rem] mb-6">
                Functional health analysis of your existing lab results
              </p>
              
              <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
                <div className="text-center">
                  <span className="font-dm-sans text-xl text-white/90">Functional Health Analysis Only</span>
                  <div className="font-dm-sans font-bold text-3xl mt-2">NGN {functionalAnalysisPrice.toLocaleString()}</div>
                </div>
              </div>

              <p className="font-dm-sans text-white/80 text-sm">
                Analysis and interpretation of your existing laboratory test results
                <br />
                <span className="text-xs">(All result must be within 30 days)</span>
              </p>
            </div>
          </div>
        )}

        {/* Patient Information */}
        {formData && (
          <div className="bg-white rounded-[24px] p-8 shadow-lg mb-8">
            <h2 className="font-dm-sans font-bold text-green-deep text-xl mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{formData.personalInfo.firstName} {formData.personalInfo.lastName}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{formData.personalInfo.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{formData.personalInfo.phone}</span>
              </div>
              <div>
                <span className="text-gray-600">Age:</span>
                <span className="ml-2 font-medium">{displayAge(formData.personalInfo) || '—'} years</span>
              </div>
            </div>
          </div>
        )}

        {/* Essential Tests */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-dm-sans font-bold text-green-deep text-xl">Core Functional Medicine Panel</h2>
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">Required</span>
          </div>
          <div className="space-y-4">
            {essentialTests.map((test, index) => (
              <div key={index} className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">{test.category}</h3>
                    <p className="font-dm-sans text-text-mid text-sm leading-[1.6]">{test.description}</p>
                  </div>
                  {test.price && activeTab === 'complete' && (
                    <div className="ml-4 text-right">
                      <span className="font-dm-sans font-bold text-green-deep text-lg">
                        ₦{test.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Investigation Form - Only for Bring My Own Results */}
        {activeTab === 'bring-own' && (
          <div className="bg-white rounded-[24px] p-8 shadow-lg mb-8 text-center">
            <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-4">
              Need to take these tests to a lab?
            </h3>
            <p className="font-dm-sans text-text-mid text-sm mb-6 max-w-lg mx-auto">
              Download the investigation form to present at your preferred laboratory or bring to your FXMed appointment.
            </p>
          <button
            onClick={async () => {
              // The clinic's own generator, so the form a patient downloads
              // here is typeset exactly like the one issued from the admin
              // workspace instead of drifting from its own copy of the markup.
              try {
                const { generateInvestigationFormPdf, CORE_PANEL_TESTS } = await import('@/lib/investigationFormPdf')
                const blob = await generateInvestigationFormPdf({
                  fullName: [formData?.personalInfo.firstName, formData?.personalInfo.lastName].filter(Boolean).join(' '),
                  email: formData?.personalInfo.email || '',
                  phone: formData?.personalInfo.phone || '',
                  age: displayAge(formData?.personalInfo || {}),
                  gender: formData?.personalInfo.gender || '',
                  panelTitle: 'Core Functional Medicine Panel',
                  tests: CORE_PANEL_TESTS,
                })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'FXMed_Investigation_Form.pdf'
                link.click()
                URL.revokeObjectURL(url)
              } catch (error) {
                console.error('Error generating PDF:', error)
                alert('Error generating PDF. Please try again.')
              }
            }}
            className="inline-flex items-center gap-2 font-dm-sans bg-green-deep text-white px-6 py-3 rounded-[50px] font-semibold text-sm hover:bg-green-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Investigation Form
          </button>
        </div>
        )}

        {/* Summary and Payment */}
        {activeTab === 'complete' ? (
          <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 text-white">
            <div className="text-center mb-8">
              <h2 className="font-dm-sans font-bold text-2xl mb-4">Complete Health Investigation Package</h2>
              <p className="font-dm-sans text-white/90 text-[1.1rem] mb-6">
                All recommended tests for comprehensive health analysis
              </p>
              
              <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
                <div className="text-center">
                  <span className="font-dm-sans text-xl text-white/90">Complete Functional Health Analysis Package</span>
                  <div className="font-dm-sans font-bold text-3xl mt-2">NGN {totalPrice.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handlePayment}
                  className="w-full font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg hover:bg-gold-light transition-all transform hover:scale-105 shadow-xl"
                >
                  Make Payment
                </button>
                
                <div className="flex items-center justify-center gap-6 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure payment via Paystack</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 text-white">
            <div className="text-center mb-8">
              <h2 className="font-dm-sans font-bold text-2xl mb-4">Bring Your Own Results</h2>
              <p className="font-dm-sans text-white/90 text-[1.1rem] mb-6">
                Functional health analysis of your existing lab results
              </p>
              
              <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
                <div className="text-center">
                  <span className="font-dm-sans text-xl text-white/90">Functional Health Analysis Only</span>
                  <div className="font-dm-sans font-bold text-3xl mt-2">NGN {functionalAnalysisPrice.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handlePayment}
                  className="w-full font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-bold text-lg hover:bg-gold-light transition-all transform hover:scale-105 shadow-xl"
                >
                  Make Payment
                </button>
                
                <div className="flex items-center justify-center gap-6 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure payment via Paystack</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
