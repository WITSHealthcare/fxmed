export const festiveOffer = {
  id: 'health-hamper-2026',
  image: '/festive/health-hamper.png',
  sectionId: 'festive-packages',
  delayMs: 5000,
  // Live from 16 October 2026 to the end of 31 January 2027, Lagos time.
  startsAt: '2026-10-16T00:00:00+01:00',
  endsAt: '2027-02-01T00:00:00+01:00',
}

export function festiveOfferPhase(now = new Date()): 'upcoming' | 'live' | 'ended' {
  if (now < new Date(festiveOffer.startsAt)) return 'upcoming'
  return now < new Date(festiveOffer.endsAt) ? 'live' : 'ended'
}

export const wellnessPackages = [
  {
    name: 'Essential Wellness',
    price: '₦150,000',
    amount: 150000,
    // Paystack payment page for this package. Without one, a booking is
    // still saved and the buyer is told FXMed will contact them to pay.
    paymentUrl: 'https://paystack.shop/pay/essential-wellness',
    premium: false,
    description: 'A thoughtful start to caring for someone you love.',
    benefits: [
      'Doctor home visit',
      'Basic health assessment',
      'Complete blood count',
      'Basic metabolic panel',
      '90-day health recovery plan',
      '3-month care plan for chronic diseases',
    ],
    laboratory: 'Glucose, chloride, bicarbonate, calcium, sodium, urea, potassium and creatinine.',
  },
  {
    name: 'Premium Wellness',
    price: '₦300,000',
    amount: 300000,
    paymentUrl: 'https://paystack.shop/pay/premium-wellness',
    premium: true,
    description: 'Comprehensive care, with a little extra thoughtfulness.',
    benefits: [
      'Doctor home visit',
      'Comprehensive health assessment',
      'Complete blood count',
      'Expanded laboratory assessment',
      '90-day health recovery plan',
      '3-month care plan for chronic diseases',
      'Seated back massage and foot massage',
      'Special gift box',
    ],
    laboratory: 'Glucose, chloride, bicarbonate, calcium, sodium, urea, potassium, creatinine, lipid profile, liver function tests and urinalysis.',
  },
]

export type WellnessPackage = (typeof wellnessPackages)[number]

// Home visit slots, the same as for consultation home visits.
export const visitTimes = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
]

export function festiveBookingUrl(packageName?: string) {
  const message = packageName
    ? `Hello FXMed, I would like to book the ${packageName} Package for the festive season. Please share the next steps.`
    : 'Hello FXMed, I would like to learn more about your festive Health-Hamper wellness packages.'
  return `https://wa.me/2349077031311?text=${encodeURIComponent(message)}`
}
