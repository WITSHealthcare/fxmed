import type { FaqItem } from '@/components/FaqSection'

// Answers here are drawn from copy already published on the site (service
// descriptions, listed pricing, clinic addresses). They target question-shaped
// search queries, so keep them specific and factual. Anything clinical should
// be reviewed by a clinician before it changes.
export const servicesFaqs: FaqItem[] = [
  {
    question: 'What is functional medicine?',
    answer:
      'Functional medicine is an approach that looks for the underlying cause of a health problem rather than treating symptoms in isolation. It considers your history, environment, nutrition, genetics and lifestyle together, and uses detailed testing to build a picture of why something is happening before deciding how to treat it.',
  },
  {
    question: 'How is functional medicine different from conventional care?',
    answer:
      'Conventional care is very effective at diagnosing and managing disease, and we use it alongside our own work. The difference is emphasis: rather than matching a diagnosis to a standard prescription, we spend longer on history and testing to understand the mechanism behind your symptoms, and we look at optimal ranges rather than only flagging results that fall outside standard reference ranges.',
  },
  {
    question: 'Where are FXMed clinics located?',
    answer:
      'FXMed has two clinics. Our Nigerian clinic is at 6A Robin Road, Crown Estate, Sangotedo, Lagos, serving Lagos including Ajah, Lekki, Victoria Island and Ikoyi. Our United States clinic is at 8118 Fry Road, Suite 1303, Cypress, Texas, serving the greater Houston area. We also see patients virtually anywhere in the world.',
  },
  {
    question: 'Do you offer home visits?',
    answer:
      'Yes. Our Concierge Medicine service includes home and office visits scheduled around you, and we offer home sample collection for laboratory testing so you do not have to travel to a clinic to have bloods taken.',
  },
  {
    question: 'Can I consult an FXMed doctor online?',
    answer:
      'Yes. Our Virtual Consult service delivers consultations, follow-ups, lab result reviews and prescription management over secure video and messaging, from anywhere in the world. Virtual consultations start at ₦25,000.',
  },
  {
    question: 'How much does a consultation cost?',
    answer:
      'Virtual consultations are ₦25,000. Concierge Medicine visits start at ₦85,000, and include extended appointment times and home or office visits. Laboratory investigations start at ₦15,000 depending on the panel. Full pricing for every service is listed on our services page.',
  },
  {
    question: 'What laboratory tests do you offer?',
    answer:
      'We offer everything from routine wellness panels to advanced functional testing, including hormone panels, comprehensive stool analysis, food sensitivity testing and genetic testing. Home sample collection is available, results come from accredited laboratories, and every result is interpreted by a physician rather than handed to you as raw numbers. Testing starts at ₦15,000.',
  },
  {
    question: 'Which health programs does FXMed run?',
    answer:
      'We run five structured programs: Thyroid Recovery, Hormone Balance, Gut Repair, Adrenal Reset and Immune Support. Each combines comprehensive testing, a personalised protocol and ongoing coaching between consultations. We also offer dedicated pregnancy and maternal wellness support.',
  },
]
