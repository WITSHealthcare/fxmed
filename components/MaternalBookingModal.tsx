'use client'

import { useState } from 'react'

interface MaternalBookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialPackage?: number
}

const PACKAGES = [
  { name: 'Pre-Conception Package', price: '₦295,000', priceUSD: '$197', duration: '3 months' },
  { name: 'Ante-Natal Package', price: '₦740,000', priceUSD: '$527', duration: 'per trimester' },
  { name: 'Post-Natal Recovery', price: '₦395,000', priceUSD: '$271', duration: 'postpartum' },
  { name: 'Fertility Breakthrough Program', price: '₦3,500,000', priceUSD: '$2,450', duration: 'ongoing' },
]

interface BookingData {
  firstName: string
  lastName: string
  email: string
  phone: string
  homeAddress: string
  preferredDate: string
  preferredTime: string
  notes: string
}

export default function MaternalBookingModal({ isOpen, onClose, initialPackage = 0 }: MaternalBookingModalProps) {
  const [selectedPackage, setSelectedPackage] = useState(initialPackage)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingData, setBookingData] = useState<BookingData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    homeAddress: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
  })

  if (!isOpen) return null

  const pkg = PACKAGES[selectedPackage]

  const update = (field: keyof BookingData, value: string) =>
    setBookingData(prev => ({ ...prev, [field]: value }))

  const getMinDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return !!(bookingData.firstName && bookingData.lastName && bookingData.email && bookingData.phone && bookingData.homeAddress)
      case 2: return !!(bookingData.preferredDate && bookingData.preferredTime)
      case 3: return true
      default: return true
    }
  }

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    else onClose()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const symptoms = `[Maternal Wellness - ${pkg.name}]${bookingData.notes ? ': ' + bookingData.notes : ''}`
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          email: bookingData.email,
          phone: bookingData.phone,
          homeAddress: bookingData.homeAddress,
          consultationType: 'home-visit',
          preferredDate: bookingData.preferredDate,
          preferredTime: bookingData.preferredTime,
          symptoms,
          status: 'pending',
          paymentStatus: 'pending',
        }),
      })

      if (!response.ok) throw new Error('Failed to save appointment')

      window.open('https://paystack.shop/pay/pxog7uys-t', '_blank')
      onClose()
      setCurrentStep(1)
      setBookingData({ firstName: '', lastName: '', email: '', phone: '', homeAddress: '', preferredDate: '', preferredTime: '', notes: '' })
    } catch (error) {
      alert(`There was an error saving your booking: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const STEPS = ['Personal Info', 'Schedule', 'Notes', 'Confirm']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-dm-sans font-bold text-green-deep text-[1.4rem]">
              Book Maternal Consultation
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light p-2 -mr-2 -mt-2">×</button>
          </div>

          {/* Package Selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {PACKAGES.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPackage(i)}
                className={`text-left px-4 py-3 rounded-[12px] border transition-all text-sm font-dm-sans ${
                  selectedPackage === i
                    ? 'border-green-mid bg-green-mid/10 text-green-deep'
                    : 'border-gray-200 text-gray-600 hover:border-green-mid/50'
                }`}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-green-mid font-bold mt-0.5">{p.price}</div>
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                  step <= currentStep ? 'bg-green-mid text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${step < currentStep ? 'bg-green-mid' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {STEPS.map((s) => <span key={s}>{s}</span>)}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input type="text" value={bookingData.firstName} onChange={(e) => update('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input type="text" value={bookingData.lastName} onChange={(e) => update('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input type="email" value={bookingData.email} onChange={(e) => update('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" placeholder="jane.doe@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input type="tel" value={bookingData.phone} onChange={(e) => update('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" placeholder="+234 800 000 0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Home Address *</label>
                <textarea value={bookingData.homeAddress} onChange={(e) => update('homeAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" rows={3}
                  placeholder="Enter your complete home address including street, city, and state" />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">Schedule Your Consultation</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date *</label>
                <input type="date" value={bookingData.preferredDate} onChange={(e) => update('preferredDate', e.target.value)}
                  min={getMinDate()} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" />
                <p className="text-xs text-gray-500 mt-1">Bookings must be made at least 24 hours in advance</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time *</label>
                <select value={bookingData.preferredTime} onChange={(e) => update('preferredTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent">
                  <option value="">Select a time</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
              <div className="bg-green-deep/10 border border-green-mid/20 rounded-lg p-4 space-y-1">
                <p className="text-sm text-green-deep"><strong>Package:</strong> {pkg.name}</p>
                <p className="text-sm text-green-deep"><strong>Price:</strong> {pkg.price} ({pkg.priceUSD})</p>
                <p className="text-sm text-green-deep"><strong>Duration:</strong> {pkg.duration}</p>
                <p className="text-sm text-green-deep"><strong>Type:</strong> Home Visit</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">Additional Notes</h3>
              <div className="bg-green-deep/10 border border-green-mid/20 rounded-lg p-4">
                <p className="text-sm text-green-deep font-semibold">Selected: {pkg.name}</p>
                <p className="text-sm text-green-deep">{pkg.price} · {pkg.duration}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Any additional information or questions? (optional)
                </label>
                <textarea value={bookingData.notes} onChange={(e) => update('notes', e.target.value)} rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent"
                  placeholder="Share any relevant health history, concerns, or questions for our team..." />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Our maternal wellness team will review your information and reach out within 24 hours to confirm your consultation.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-dm-sans font-semibold text-green-deep text-lg mb-2">Confirm Your Booking</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package:</span>
                  <span className="font-semibold text-green-deep">{pkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-green-mid">{pkg.price} ({pkg.priceUSD})</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{bookingData.firstName} {bookingData.lastName}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{bookingData.email}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{bookingData.phone}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-right max-w-[60%]">{bookingData.homeAddress}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{bookingData.preferredDate}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{bookingData.preferredTime}</span>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> After confirming, you will be redirected to complete payment. Our team will send a confirmation within 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button onClick={handleBack} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
            Back
          </button>
          {currentStep < 4 ? (
            <button onClick={handleNext} disabled={!isStepValid()}
              className="px-6 py-2 bg-green-mid text-white rounded-lg font-medium hover:bg-green-deep disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="px-6 py-2 bg-gold text-green-deep rounded-lg font-semibold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
