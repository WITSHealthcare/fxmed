'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { displayAge } from '@/lib/age'

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

interface TestRecommendation {
  category: string
  tests: {
    name: string
    description: string
    whyImportant: string
  }[]
}

export default function FunctionalHealthResults() {
  const [formData, setFormData] = useState<FormData | null>(null)
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([])

  // The investigations page stores the assessment id on its way through, since
  // this page is not navigated to with the query string.
  const recordProgress = (step: 'request_downloaded_at' | 'payment_started_at') => {
    const id = typeof window === 'undefined' ? null : sessionStorage.getItem('fxmed-health-analysis-id')
    if (!id) return
    fetch('/api/health-analysis/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, step }),
    }).catch(() => {
      // Never block the download or the payment redirect on tracking.
    })
  }

  useEffect(() => {
    // In a real app, this would come from URL params, localStorage, or API
    const storedData = localStorage.getItem('healthAnalysisData')
    if (storedData) {
      const data = JSON.parse(storedData)
      setFormData(data)
      generateRecommendations(data)
    }
  }, [])

  const generateRecommendations = (data: FormData) => {
    const recommendations: TestRecommendation[] = []
    const symptoms = data.healthConcerns.symptoms

    // Core Functional Medicine Tests (always recommended)
    recommendations.push({
      category: 'Core Functional Medicine Panel',
      tests: [
        {
          name: 'Comprehensive Metabolic Panel (CMP)',
          description: 'Assesses kidney function, liver function, electrolyte balance, and blood glucose',
          whyImportant: 'Provides baseline data for overall metabolic health'
        },
        {
          name: 'Complete Blood Count (CBC) with Differential',
          description: 'Evaluates red cells, white cells, and platelets for anemia, infection, and inflammation',
          whyImportant: 'Identifies underlying infections, inflammation patterns, and nutritional deficiencies'
        },
        {
          name: 'Lipid Panel',
          description: 'Measures cholesterol and triglycerides to assess cardiovascular risk',
          whyImportant: 'Essential for heart health and hormone production assessment'
        }
      ]
    })

    // Hormone-related tests
    if (symptoms.includes('Hormonal Imbalance') || symptoms.includes('Weight Management')) {
      recommendations.push({
        category: 'Hormone Balance Panel',
        tests: [
          {
            name: 'Comprehensive Hormone Panel',
            description: 'Includes estrogen, progesterone, testosterone, DHEA, and cortisol',
            whyImportant: 'Identifies hormonal imbalances affecting energy, mood, and metabolism'
          },
          {
            name: 'Thyroid Panel (TSH, Free T3, Free T4, Reverse T3)',
            description: 'Complete thyroid function assessment',
            whyImportant: 'Thyroid dysfunction affects metabolism, energy, and mood'
          }
        ]
      })
    }

    // Thyroid-specific tests
    if (symptoms.includes('Thyroid Issues') || symptoms.includes('Hair Loss') || symptoms.includes('Cold Intolerance')) {
      recommendations.push({
        category: 'Advanced Thyroid Assessment',
        tests: [
          {
            name: 'Thyroid Antibodies (TPO, TG)',
            description: 'Tests for autoimmune thyroid conditions',
            whyImportant: 'Identifies Hashimoto\'s or Graves\' disease'
          },
          {
            name: 'Iodine and Selenium Levels',
            description: 'Essential nutrients for thyroid hormone production',
            whyImportant: 'Deficiencies can cause thyroid dysfunction'
          }
        ]
      })
    }

    // Digestive health tests
    if (symptoms.includes('Digestive Issues') || symptoms.includes('Bloating')) {
      recommendations.push({
        category: 'Digestive Health Panel',
        tests: [
          {
            name: 'Comprehensive Stool Analysis',
            description: 'Assesses gut microbiome, digestion, inflammation, and pathogens',
            whyImportant: 'Identifies root causes of digestive symptoms and systemic inflammation'
          },
          {
            name: 'SIBO Breath Test',
            description: 'Tests for small intestinal bacterial overgrowth',
            whyImportant: 'Common cause of bloating, gas, and digestive discomfort'
          },
          {
            name: 'Food Sensitivity Panel (IgG)',
            description: 'Tests for delayed food reactions affecting gut health',
            whyImportant: 'Identifies trigger foods causing inflammation and symptoms'
          }
        ]
      })
    }

    // Nutritional deficiencies
    if (symptoms.includes('Fatigue/Low Energy') || symptoms.includes('Hair Loss')) {
      recommendations.push({
        category: 'Nutritional Assessment',
        tests: [
          {
            name: 'Comprehensive Nutrient Panel',
            description: 'Vitamins D, B12, folate, iron, ferritin, zinc, magnesium',
            whyImportant: 'Identifies deficiencies causing fatigue, hair loss, and poor immune function'
          },
          {
            name: 'Amino Acid Profile',
            description: 'Assesses essential and non-essential amino acids',
            whyImportant: 'Building blocks for hormones, neurotransmitters, and repair'
          }
        ]
      })
    }

    // Inflammation and immune
    if (symptoms.includes('Joint Pain') || symptoms.includes('Frequent Illness')) {
      recommendations.push({
        category: 'Inflammation & Immune Assessment',
        tests: [
          {
            name: 'High-Sensitivity C-Reactive Protein (hs-CRP)',
            description: 'Measures systemic inflammation levels',
            whyImportant: 'Identifies chronic inflammation affecting overall health'
          },
          {
            name: 'Comprehensive Autoimmune Panel',
            description: 'ANA, RF, and specific autoimmune markers',
            whyImportant: 'Screens for autoimmune conditions causing various symptoms'
          }
        ]
      })
    }

    // Stress and adrenal
    if (symptoms.includes('Stress/Anxiety') || symptoms.includes('Sleep Problems')) {
      recommendations.push({
        category: 'Stress & Adrenal Assessment',
        tests: [
          {
            name: 'Cortisol Rhythm (4-point saliva test)',
            description: 'Measures cortisol levels throughout the day',
            whyImportant: 'Assesses adrenal function and stress response patterns'
          },
          {
            name: 'Neurotransmitter Panel',
            description: 'Serotonin, dopamine, GABA, norepinephrine levels',
            whyImportant: 'Identifies imbalances affecting mood, sleep, and stress'
          }
        ]
      })
    }

    setRecommendations(recommendations)
  }

  
  const downloadTestRecommendations = async () => {
    if (!formData || recommendations.length === 0) return

    // Create PDF
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    // Original FXMed brand colors from tailwind config (corrected RGB values)
    const greenDeep = [26, 61, 46]      // #1a3d2e - green-deep
    const greenMid = [45, 106, 79]      // #2d6a4f - green-mid  
    const greenLight = [82, 183, 136]   // #52b788 - green-light
    const cream = [248, 243, 234]       // #f8f3ea - cream
    const gold = [201, 226, 101]        // #C9E265 - gold
    const textDark = [28, 43, 34]       // #1c2b22 - text-dark
    const textMid = [74, 94, 82]        // #4a5e52 - text-mid
    const white = [255, 255, 255]       // #ffffff

    // Helper function to add colored rectangle
    const addRect = (x: number, y: number, width: number, height: number, color: number[]) => {
      pdf.setFillColor(color[0], color[1], color[2])
      pdf.rect(x, y, width, height, 'F')
    }

    // Helper function to add text with color
    const addText = (text: string, x: number, y: number, fontSize = 12, fontStyle = 'normal', color: number[] = textDark) => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', fontStyle)
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(text, x, y)
    }

    // Helper function to add right-aligned text
    const addRightText = (text: string, y: number, fontSize = 12, fontStyle = 'normal', color: number[] = textDark) => {
      const textWidth = pdf.getTextWidth(text)
      addText(text, pageWidth - margin - textWidth, y, fontSize, fontStyle, color)
    }

    // === HEADER SECTION ===
    // Add FXMed logo to the top left
    try {
      const logoImg = new Image()
      logoImg.src = '/logo.png'
      
      // Add logo to top left
      pdf.addImage(logoImg, 'PNG', margin, yPosition, 35, 15)
    } catch (error) {
      // Fallback to text if image fails to load
      addText('FXMED', margin, yPosition + 8, 16, 'bold', greenDeep)
    }
    
    // Contact info on the right
    addRightText('+234 XXX XXX XXXX', yPosition + 2, 10, 'normal', textDark)
    addRightText('www.fxmed.com', yPosition + 7, 10, 'normal', textDark)
    addRightText('info@fxmed.com', yPosition + 12, 10, 'normal', textDark)
    addRightText('Lagos, Nigeria', yPosition + 17, 10, 'normal', textDark)
    
    yPosition += 25

    // Green line separator
    addRect(margin, yPosition, pageWidth - 2 * margin, 2, greenDeep)
    yPosition += 10

    // === TITLE SECTION ===
    addText('Investigation Request Form', margin, yPosition, 18, 'bold', textDark)
    addRightText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), yPosition, 12, 'normal', textDark)
    yPosition += 20

    // === PATIENT DETAILS TABLE ===
    const tableY = yPosition
    const tableHeight = 25
    const colWidths = [30, 30, 15, 15, 40] // Percentage widths
    
    // Table header
    addRect(margin, tableY, pageWidth - 2 * margin, 12, greenDeep)
    addText('Surname', margin + 5, tableY + 8, 10, 'bold', white)
    addText('First Name', margin + colWidths[0] * (pageWidth - 2 * margin) / 100 + 5, tableY + 8, 10, 'bold', white)
    addText('Age', margin + (colWidths[0] + colWidths[1]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 8, 10, 'bold', white)
    addText('Sex', margin + (colWidths[0] + colWidths[1] + colWidths[2]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 8, 10, 'bold', white)
    addText('Phone No.', margin + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 8, 10, 'bold', white)
    
    // Table data row
    addRect(margin, tableY + 12, pageWidth - 2 * margin, 13, cream)
    addText(formData.personalInfo.lastName, margin + 5, tableY + 20, 10, 'normal', textDark)
    addText(formData.personalInfo.firstName, margin + colWidths[0] * (pageWidth - 2 * margin) / 100 + 5, tableY + 20, 10, 'normal', textDark)
    addText(displayAge(formData.personalInfo), margin + (colWidths[0] + colWidths[1]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 20, 10, 'normal', textDark)
    addText(formData.personalInfo.gender.charAt(0).toUpperCase(), margin + (colWidths[0] + colWidths[1] + colWidths[2]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 20, 10, 'normal', textDark)
    addText(formData.personalInfo.phone, margin + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) * (pageWidth - 2 * margin) / 100 + 5, tableY + 20, 10, 'normal', textDark)
    
    yPosition = tableY + tableHeight + 15

    // === CLINICAL DETAILS SECTION ===
    const clinicalHeight = 35
    addRect(margin, yPosition, pageWidth - 2 * margin, 12, greenMid)
    addText('Clinical Details', margin + 5, yPosition + 8, 12, 'bold', white)
    
    addRect(margin, yPosition + 12, pageWidth - 2 * margin, clinicalHeight - 12, cream)
    
    // Wrap clinical details text
    const clinicalText = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName} (${displayAge(formData.personalInfo)} years old, ${formData.personalInfo.gender}) presenting with: ${formData.healthConcerns.primaryConcern}. Symptoms include: ${formData.healthConcerns.symptoms.join(', ')}. Duration: ${formData.healthConcerns.duration}, Severity: ${formData.healthConcerns.severity}.`
    const clinicalLines = pdf.splitTextToSize(clinicalText, pageWidth - 2 * margin - 10)
    clinicalLines.forEach((line: string, index: number) => {
      addText(line, margin + 5, yPosition + 20 + (index * 6), 10, 'normal', textDark)
    })
    
    yPosition += clinicalHeight + 15

    // === INVESTIGATIONS REQUIRED SECTION ===
    addRect(margin, yPosition, pageWidth - 2 * margin, 12, greenLight)
    addText('Investigations Required', margin + 5, yPosition + 8, 12, 'bold', white)
    yPosition += 12

    // Calculate how much space we need for investigations
    let allInvestigations: string[] = []
    recommendations.forEach((category) => {
      allInvestigations.push(`--- ${category.category.toUpperCase()} ---`)
      category.tests.forEach((test) => {
        allInvestigations.push(`• ${test.name}`)
      })
      allInvestigations.push('') // Empty line between categories
    })

    // Add investigations with cream background
    const investigationsHeight = allInvestigations.length * 6 + 10
    addRect(margin, yPosition, pageWidth - 2 * margin, investigationsHeight, cream)
    
    allInvestigations.forEach((investigation, index) => {
      if (investigation.startsWith('---')) {
        addText(investigation.replace(/---/g, '').trim(), margin + 5, yPosition + 8 + (index * 6), 10, 'bold', textDark)
      } else if (investigation.startsWith('•')) {
        addText(investigation, margin + 5, yPosition + 8 + (index * 6), 9, 'normal', textDark)
      }
    })
    
    yPosition += investigationsHeight + 15

    // === REQUESTING PHYSICIAN SECTION ===
    addRect(margin, yPosition, pageWidth - 2 * margin, 12, textDark)
    addText('Requesting Physician', margin + 5, yPosition + 8, 12, 'bold', white)
    
    addRect(margin, yPosition + 12, pageWidth - 2 * margin, 20, cream)
    addText('FXMed Functional Medicine Team', margin + 5, yPosition + 22, 11, 'normal', textDark)
    
    yPosition += 32

    // === FOOTER DESIGN ===
    // Simple footer with green-deep color
    addRect(margin, pageHeight - 25, pageWidth - 2 * margin, 25, greenDeep)

    // Save the PDF
    pdf.save(`FXMed_Investigation_Request_${formData.personalInfo.firstName}_${formData.personalInfo.lastName}.pdf`)
    recordProgress('request_downloaded_at')
  }

  const handlePayNow = () => {
    recordProgress('payment_started_at')
    // Redirect to PayStack shop in a new tab
    window.open('https://paystack.shop/pay/fxmed', '_blank')
  }

  const handlePayLater = () => {
    // In a real app, this would save the payment preference
    alert('Thank you! You can pay later. We\'ll send you payment options via email.')
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-cream">
        <Navigation />
        <div className="pt-[100px] pb-[90px] px-[5%] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="font-dm-sans text-green-deep">Loading your results...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navigation />
      
      <div className="pt-[100px] pb-[90px] px-[5%]">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-semibold tracking-[0.14em] uppercase mb-4">
              Your Personalized Test Plan
            </div>
            <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
              Recommended Tests for {formData.personalInfo.firstName}
            </h1>
            <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] max-w-[600px] mx-auto">
              Based on your health assessment, we've curated a comprehensive test panel to identify the root causes of your symptoms.
            </p>
          </div>

          {/* Test Recommendations */}
          <div className="space-y-8 mb-12">
            {recommendations.map((category, index) => (
              <div key={index} className="bg-white rounded-[24px] border border-green-mid/20 p-8">
                <h3 className="font-dm-sans font-bold text-green-deep text-xl mb-6">
                  {category.category}
                </h3>
                <div className="space-y-6">
                  {category.tests.map((test, testIndex) => (
                    <div key={testIndex} className="border-l-4 border-gold pl-6">
                      <h4 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">
                        {test.name}
                      </h4>
                      <p className="font-dm-sans text-black/80 text-sm mb-2">
                        {test.description}
                      </p>
                      <p className="font-dm-sans text-green-deep/70 text-sm italic">
                        <strong>Why it's important:</strong> {test.whyImportant}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          
          {/* Download Button */}
          <div className="text-center mb-8">
            <button
              onClick={downloadTestRecommendations}
              className="bg-green-light text-green-deep px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:bg-green-light/80 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Test Recommendations
            </button>
          </div>

          {/* Payment Options */}
          <div className="bg-white rounded-[24px] border border-green-mid/20 p-8 text-center">
            <h3 className="font-dm-sans font-bold text-green-deep text-xl mb-4">
              Ready to Get Started?
            </h3>
            <p className="font-dm-sans text-black text-[1.05rem] leading-[1.7] mb-6">
              We will send you a link to upload your test results to your mail
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handlePayNow}
                className="bg-gold text-green-deep px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:bg-gold-light"
              >
                Pay Now
              </button>
              <button
                onClick={handlePayLater}
                className="bg-transparent text-green-deep border border-green-deep/30 px-8 py-3 rounded-[30px] font-semibold text-[0.95rem] font-dm-sans transition-all hover:border-green-deep hover:bg-green-deep/8"
              >
                Pay Later
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
