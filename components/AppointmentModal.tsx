import { useState } from 'react'
import BookingModal from '@/components/BookingModal'

export default function AppointmentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingType, setBookingType] = useState<'telemedicine' | 'home-visit'>('telemedicine')

  const bookConsultation = (type: 'telemedicine' | 'home-visit') => {
    setBookingType(type)
    setShowBookingModal(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-[24px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-2">
                Book Your Appointment
              </h2>
              <p className="font-dm-sans text-text-mid text-[1.1rem] leading-[1.7] max-w-3xl">
                Choose your preferred consultation type and schedule your appointment with our functional medicine experts.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Booking Section */}
          <div className="bg-gradient-to-br from-green-deep to-green-mid rounded-[24px] p-8 text-center text-white">
            <h2 className="font-dm-sans font-bold text-[2rem] mb-4">
              Ready to Take Control of Your Health?
            </h2>
            <p className="font-dm-sans text-white/90 text-[1.1rem] mb-8 max-w-2xl mx-auto">
              Book a consultation with our concierge functional health experts
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur rounded-[16px] p-6 border border-white/20">
                <div className="text-3xl mb-3">
                  <img src="/Telemedicine.png" alt="Telemedicine" className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg mb-2">Telemedicine</h3>
                <p className="font-dm-sans text-white/80 text-sm mb-4">WhatsApp Video or Google Meet</p>
                <div className="text-2xl font-bold mb-1">₦25,000</div>
                <p className="font-dm-sans text-white/60 text-sm mb-4">Per consultation</p>
                <button
                  onClick={() => bookConsultation('telemedicine')}
                  className="w-full bg-white text-green-deep px-6 py-3 rounded-[12px] font-dm-sans font-semibold hover:bg-gray-100 transition-colors"
                >
                  Book Telemedicine
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-[16px] p-6 border border-gold/40 relative">
                <div className="absolute -top-3 right-6 bg-gold text-green-deep px-3 py-1 rounded-[20px] text-xs font-bold">
                  PREMIUM
                </div>
                <div className="text-3xl mb-3">
                  <img src="/HomeVisit.png" alt="Home Visit" className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="font-dm-sans font-semibold text-lg mb-2">Home Visit</h3>
                <p className="font-dm-sans text-white/80 text-sm mb-4">Mobile clinic comes to you</p>
                <div className="text-2xl font-bold mb-1">₦85,000</div>
                <p className="font-dm-sans text-white/60 text-sm mb-1">Lagos only</p>
                <p className="font-dm-sans text-white/50 text-xs italic mb-4">Call for out-of-state pricing</p>
                <button
                  onClick={() => bookConsultation('home-visit')}
                  className="w-full bg-gold text-green-deep px-6 py-3 rounded-[12px] font-dm-sans font-bold hover:bg-gold-light transition-colors"
                >
                  Book Home Visit
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Same-day appointments available</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Expert practitioners</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Personalized care</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Booking Modal */}
      <BookingModal 
        isOpen={showBookingModal} 
        onClose={() => setShowBookingModal(false)} 
        consultationType={bookingType}
      />
    </div>
  )
}
