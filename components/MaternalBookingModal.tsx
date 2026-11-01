'use client'

import { useState } from 'react'
import { BOOKING_TIMES, displayDate, displayTime, firstOpenDate, openTimes } from '@/lib/bookingTimes'

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
  // Open times depend on the time now; refreshed on each step.
  const [now, setNow] = useState(() => Date.now())
  const [scheduleError, setScheduleError] = useState('')
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

  const times = bookingData.preferredDate ? openTimes('home-visit', bookingData.preferredDate, now) : BOOKING_TIMES['home-visit']
  const earliestDate = firstOpenDate('home-visit', now)

  const chooseDate = (preferredDate: string) => {
    setScheduleError('')
    setBookingData(prev => ({
      ...prev,
      preferredDate,
      // Clear a time that is not open on the new date.
      preferredTime: openTimes('home-visit', preferredDate, now).includes(prev.preferredTime) ? prev.preferredTime : '',
    }))
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return !!(bookingData.firstName && bookingData.lastName && bookingData.email && bookingData.phone && bookingData.homeAddress)
      case 2: return !!(bookingData.preferredDate && bookingData.preferredTime && times.includes(bookingData.preferredTime))
      case 3: return true
      default: return true
    }
  }

  const handleNext = () => {
    setNow(Date.now())
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

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        // The time is no longer open, say after a long wait: pick another.
        if (result.field === 'schedule' && result.error) {
          setScheduleError(result.error)
          setBookingData(prev => ({ ...prev, preferredTime: '' }))
          setNow(Date.now())
          setCurrentStep(2)
          return
        }
        throw new Error(result.error || 'Failed to save appointment')
      }

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
                <input type="date" value={bookingData.preferredDate} onChange={(e) => chooseDate(e.target.value)}
                  min={earliestDate} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent" />
                <p className="text-xs text-gray-500 mt-1">Visits must be booked at least 24 hours ahead. Times are Lagos time (WAT).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time *</label>
                <select value={bookingData.preferredTime} onChange={(e) => { setScheduleError(''); update('preferredTime', e.target.value) }}
                  disabled={!times.length}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-mid focus:border-transparent disabled:bg-gray-50">
                  <option value="">Select a time</option>
                  {times.map(time => <option key={time} value={time}>{displayTime(time)}</option>)}
                </select>
                {bookingData.preferredDate && !times.length && (
                  <p className="text-xs text-amber-700 mt-1">No visit times are left on this date. The earliest date you can book is {displayDate(earliestDate)}.</p>
                )}
              </div>
              {scheduleError && (
                <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{scheduleError}</p>
              )}
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
                    <span className="font-medium">{displayTime(bookingData.preferredTime)} (Lagos time)</span>
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
