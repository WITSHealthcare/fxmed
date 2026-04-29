'use client'

import { useState } from 'react'

interface Package {
  title: string
  price: string
  priceUSD?: string
  duration?: string
  sections: {
    title: string
    items: string[]
  }[]
}

const maternalPackages: Package[] = [
  {
    title: "Pre-Conception Health Package",
    price: "₦295,000",
    priceUSD: "$197",
    duration: "3 Months",
    sections: [
      {
        title: "Initial Consultation",
        items: [
          "GP Home Visit",
          "Essential Health Analysis"
        ]
      },
      {
        title: "Lab Tests",
        items: [
          "Full Blood Count",
          "Liver Function Test (AST/ALT)",
          "Kidney Function Test",
          "Fasting Blood Sugar (FBS) + HbA1C",
          "Lipid Profile",
          "Urinalysis"
        ]
      },
      {
        title: "Nutrition and Lifestyle Guidance",
        items: [
          "Nutrition Assessment",
          "4-Week Meal Plan and Recipes"
        ]
      },
      {
        title: "Wellness and Relaxation",
        items: [
          "Aromatherapy Massage"
        ]
      }
    ]
  },
  {
    title: "Ante-natal Wellness Package",
    price: "₦740,000",
    priceUSD: "$527",
    duration: "Per Trimester",
    sections: [
      {
        title: "Regular Health Monitoring",
        items: [
          "Monthly Home Visit",
          "24/7 Care support team access",
          "Urgent care support"
        ]
      },
      {
        title: "Labor and Delivery",
        items: [
          "Hospital transportation",
          "Labor room Concierge support"
        ]
      },
      {
        title: "Labs and Diagnostics",
        items: [
          "All tests from the Essential Health Analysis",
          "Thyroid Function Test (Free T3, Free T4, TSH)",
          "Ultrasound Scan"
        ]
      },
      {
        title: "Nutrition and Lifestyle Support",
        items: [
          "Body Composition and Fitness Assessment",
          "Dietetic Consultation",
          "Prenatal Vitamins (Monthly supply)",
          "IV Therapy for Vitality",
          "Aqua Boost"
        ]
      },
      {
        title: "Relaxing Treatments",
        items: [
          "Shiatsu Foot Massage"
        ]
      }
    ]
  },
  {
    title: "Postnatal Care Package",
    price: "₦395,000",
    priceUSD: "$271",
    sections: [
      {
        title: "Postpartum Health Assessment",
        items: [
          "GP Home Visit",
          "Postpartum depression and Mental Health Screening",
          "Newborn Health Assessment"
        ]
      },
      {
        title: "Postnatal Nutrition and Recovery",
        items: [
          "Lactation Support",
          "Nutrition Assessment",
          "Pantry Overhaul and Makeover"
        ]
      },
      {
        title: "Body and Skin Rejuvenation",
        items: [
          "Deep-Cleansing Facial",
          "Microdermabrasion"
        ]
      },
      {
        title: "IV Therapy for Recovery",
        items: [
          "Vitality Shots: Vitamin C Zing"
        ]
      },
      {
        title: "Relaxation and Stress Relief",
        items: [
          "Therapeutic/Deep-tissue Massage (60 mins)"
        ]
      }
    ]
  },
  {
    title: "Fertility Breakthrough Program",
    price: "₦3,500,000",
    priceUSD: "$2,450",
    sections: [
      {
        title: "Comprehensive Initial Consultation",
        items: [
          "GP Home Visit",
          "Fertility Specialist Teleconsultation (UK and US)"
        ]
      },
      {
        title: "Advanced Health and Fertility Analysis",
        items: [
          "Full Blood Count",
          "Hormonal Profile (FSH, LH, Estrogen, Progesterone)",
          "Liver and Kidney Function Tests",
          "Fasting Blood Sugar (FBS) + HbA1C",
          "Lipid Profile",
          "Thyroid Function Test (Free T3, Free T4, TSH)",
          "Semen Analysis (for partners)",
          "Urinalysis"
        ]
      },
      {
        title: "Personalized Nutrition and Lifestyle Plan",
        items: [
          "Comprehensive Nutrition Assessment",
          "6-Week Meal Plan with Fertility-Boosting Recipes",
          "Personalized Exercise Plan"
        ]
      },
      {
        title: "Mind-Body Wellness and Relaxation",
        items: [
          "Monthly Aromatherapy Massage",
          "Guided Meditation Sessions (Digital Access)",
          "Hormone Reset Fertility Classes"
        ]
      },
      {
        title: "Innovative Fertility Support",
        items: [
          "Red Light Sessions (2 per month)",
          "Herbal Supplement Starter Kit"
        ]
      },
      {
        title: "Exclusive Online Resources and Community",
        items: [
          "Access to Fertility Workshops and Webinars",
          "Membership to a Supportive Online Community Forum"
        ]
      }
    ]
  }
]

interface MaternalWellnessModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPackage?: number
}

export default function MaternalWellnessModal({ isOpen, onClose, selectedPackage = 0 }: MaternalWellnessModalProps) {
  const [activeTab, setActiveTab] = useState(selectedPackage)

  if (!isOpen) return null

  const currentPackage = maternalPackages[activeTab]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-green-deep to-green-mid p-8 rounded-t-[24px]">
          <h2 className="font-dm-sans font-bold text-white text-2xl mb-2">
            Maternal Wellness Packages
          </h2>
          <p className="font-dm-sans text-cream/90">
            Complete care for your motherhood journey
          </p>
        </div>

        {/* Package Tabs */}
        <div className="flex border-b border-cream-dark">
          {maternalPackages.map((pkg, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex-1 px-4 py-4 font-dm-sans text-sm font-medium transition-all ${
                activeTab === index
                  ? 'text-green-deep border-b-2 border-green-deep bg-green-deep/5'
                  : 'text-text-mid hover:text-green-deep hover:bg-cream/50'
              }`}
            >
              {index === 3 ? 'Fertility' : pkg.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Package Content */}
        <div className="p-8">
          {/* Package Header */}
          <div className="mb-8">
            <h3 className="font-dm-sans font-bold text-green-deep text-2xl mb-2">
              {currentPackage.title}
            </h3>
            <div className="flex items-baseline gap-4 mb-2">
              <span className="font-dm-sans font-bold text-green-deep text-3xl">
                {currentPackage.price}
              </span>
              {currentPackage.priceUSD && (
                <span className="font-dm-sans text-text-mid text-lg">
                  {currentPackage.priceUSD}
                </span>
              )}
              {currentPackage.duration && (
                <span className="font-dm-sans text-text-mid">
                  ({currentPackage.duration})
                </span>
              )}
            </div>
          </div>

          {/* Package Sections */}
          <div className="space-y-6">
            {currentPackage.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-cream rounded-[16px] p-6">
                <h4 className="font-dm-sans font-semibold text-green-deep text-lg mb-4">
                  {section.title}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></div>
                      <p className="font-dm-sans text-text-dark text-sm leading-[1.6]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <a 
              href="/#contact" 
              onClick={onClose}
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block text-center flex-1"
            >
              Book This Package →
            </a>
            <button
              onClick={onClose}
              className="font-dm-sans bg-transparent text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] border border-green-deep/40 transition-all hover:border-green-deep hover:bg-green-deep/8 inline-block text-center flex-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for using the modal
export function useMaternalWellnessModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(0)

  const openModal = (packageIndex = 0) => {
    setSelectedPackage(packageIndex)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    selectedPackage,
    openModal,
    closeModal
  }
}
