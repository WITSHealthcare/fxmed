import { createMetadata } from '@/lib/seo'

export const metadata = createMetadata({
  title: 'New Patient Registration | FXMed',
  description: 'Submit a new patient registration request for review by the FXMed clinical team.',
  path: '/patient-registration',
  noIndex: true,
})

export default function PatientRegistrationLayout({ children }: { children: React.ReactNode }) {
  return children
}
