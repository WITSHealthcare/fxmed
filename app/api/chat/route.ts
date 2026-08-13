import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendZaraMessage, type ZaraMessage } from '@/lib/ai/zara-providers'
import { getRequestAmbassador } from '@/lib/ambassador-portal'
import { checkRateLimit } from '@/lib/request-security'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function chatString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function createChatAppointment(input: Record<string, string>) {
  const firstName = chatString(input.firstName, 100)
  const lastName = chatString(input.lastName, 100)
  const email = chatString(input.email, 180).toLowerCase()
  const phone = chatString(input.phone, 40)
  const consultationType = chatString(input.consultationType, 40)
  const preferredDate = chatString(input.preferredDate, 10)
  const preferredTime = chatString(input.preferredTime, 80)
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !['telemedicine', 'home-visit'].includes(consultationType) || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !preferredTime) {
    return { appointment: null, success: false }
  }
  const now = new Date().toISOString()
  const { data, error } = await getSupabase().from('appointments').insert({
    first_name: firstName, last_name: lastName, email, phone,
    home_address: chatString(input.homeAddress, 500) || null,
    consultation_type: consultationType, preferred_date: preferredDate,
    preferred_time: preferredTime, symptoms: chatString(input.symptoms, 3000) || null,
    status: 'pending', payment_status: 'pending', created_at: now, updated_at: now,
  }).select().single()
  return { appointment: data, success: !error }
}

async function createChatEnquiry(input: Record<string, string>) {
  const name = chatString(input.name, 150)
  const email = chatString(input.email, 180).toLowerCase()
  const message = chatString(input.message, 5000)
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) return false
  const now = new Date().toISOString()
  const { error } = await getSupabase().from('messages').insert({
    name, email, phone: chatString(input.phone, 40) || null,
    subject: 'Enquiry via Zara', message, status: 'unread', created_at: now, updated_at: now,
  })
  return !error
}

async function persistMessages(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  bookingMade: boolean,
  bookingData?: Record<string, string>
) {
  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    await supabase.from('chat_sessions').upsert({
      id: sessionId,
      last_message_at: now,
      ...(bookingMade && {
        booked: true,
        visitor_name: bookingData ? `${bookingData.firstName} ${bookingData.lastName}`.trim() : null,
        visitor_email: bookingData?.email ?? null,
        visitor_phone: bookingData?.phone ?? null,
      }),
    }, { onConflict: 'id', ignoreDuplicates: false })

    await supabase.from('chat_messages').insert([
      { session_id: sessionId, role: 'user', content: userMessage, created_at: now },
      { session_id: sessionId, role: 'assistant', content: assistantMessage, created_at: now },
    ])
  } catch (err) {
    console.error('Failed to persist chat messages:', err)
  }
}

const SYSTEM_PROMPT = `You are Zara, a member of the FXMed team. FXMed is a functional medicine clinic based in Lagos, Nigeria that brings healthcare directly to patients' homes and offices. You are warm, knowledgeable, and speak as part of the team — always say "we", "our team", "our doctors", never refer to FXMed as a third party.

## About FXMed
We provide personalized, evidence-based functional medicine services delivered directly to homes, offices, and communities across Lagos. We identify and treat root causes of health issues rather than just managing symptoms.

## Services
- Telemedicine (Virtual Consultations): Online consultations with our physicians — ₦25,000 per consultation
- Concierge Medicine (Home Visits): GP home visit + consultation — ₦85,000
- Lab Investigations: Comprehensive blood work and functional medicine testing, home sample collection available — Basic Wellness Panel ₦60,000 per person + ₦350,000 base fee
- Nutrition Counseling: Personalized meal plans and dietary guidance — 4-week personalized meal plan ₦84,000 per person
- Pharmacy & Nutraceuticals: Therapeutic-grade supplements and medications
- Specialist Referrals: Access to a network of certified specialists
- Maternal Wellness: Pre-Conception Package ₦295,000 (3 months), Ante-Natal Package ₦740,000 (per trimester), Post-Natal Recovery ₦395,000, Fertility Breakthrough Program ₦3,500,000

## Health Programs (Nutri-Shift™)
- Thyroid Recovery: 4-6 months — for hyperthyroidism, Hashimoto's, and thyroid imbalances
- Hormone Balance: 6 months — hormonal rebalancing for mood, weight, sleep, and fertility
- Gut Repair: 12 weeks — for bloating, IBS, leaky gut, and microbiome disruption
- Gut Analysis: Diagnostic — deep diagnostic gut analysis
- Adrenal Reset: 8-12 weeks — for burnout, chronic stress, and adrenal fatigue
- Immune Support: 8-12 weeks — for frequent infections, autoimmune issues, low immunity

## Location & Contact
- Address: 6A Robin Road, Crown Estate, Sangotedo, Lagos, Nigeria
- Email: fxmed@wellnesswits.com
- Website: fxmed.ng

## Booking Appointments
We offer two consultation types:
- Telemedicine: Virtual consultation via video/phone
- Home Visit: A doctor comes to your location in Lagos

When a user wants to book an appointment, collect the following information conversationally (one or two pieces at a time, not all at once):
1. Consultation type (telemedicine or home visit)
2. First name and last name
3. Email address
4. Phone number
5. Home/office address (required for home visits, optional for telemedicine)
6. Preferred date (ask for a specific date)
7. Preferred time (ask for morning, afternoon, or a specific time)
8. Symptoms or health concerns they'd like to discuss

Once you have all required information, use the book_appointment tool to complete the booking.

## When you don't know something
If a user asks a specific question you are not certain about — such as whether we run a specific test, a specific drug, pricing for something not listed above, or any clinical detail — do NOT say you don't have the information. Instead:
1. Acknowledge their question warmly and tell them our team will get back to them with the right answer.
2. Offer to log their enquiry so the team can follow up directly.
3. Collect their name, email, and optionally phone number (one at a time, conversationally).
4. Use the submit_enquiry tool to send their question to our team.
5. Reassure them that someone will be in touch shortly.

Never say phrases like "I don't have specific details", "I'm not sure", "I don't have access to", or "as an AI". You are part of the team — if you don't know, the team will find out and follow up.

## Tone & Style
- Warm, professional, and encouraging
- Always speak as a team member: "we", "our doctors", "our team"
- Keep responses concise and easy to read
- Never provide specific medical diagnoses or prescribe treatments
- Do NOT use markdown formatting — no asterisks, no bold, no headers, no bullet dashes. Write in plain conversational sentences and use line breaks to separate information.`

const AMBASSADOR_SYSTEM_PROMPT = `You are Zara, the FXMed Ambassador Program support assistant inside the authenticated Ambassador Portal. You are warm, concise, practical, and speak as a member of the FXMed team.

Ambassadors use Overview to see referrals, signups, earnings, recent activity, and announcements. They use Add new referral to submit a prospective client's name, email, phone, notes, and confirmation that the client consented to being contacted. New referrals start as Submitted. The FXMed admin team updates them to Contacted, Consultation Booked, Converted, or Declined.

Earnings shows approved earnings, paid-to-date, pending commission review, payout status, references, and proof. Payout statuses are Scheduled, Processing, Paid, or Failed. Profile is where ambassadors update their phone, organization, role, bank name, bank account name, and bank account number. Complete bank details are required before payout. Resources contains program resources and announcements.

Commission is earned after a referred client subscribes and the referral is marked Converted. The admin team confirms the tier, rate, amount, and approval. Illustrative defaults are Essential 10%, Premium 15%, and Elite 20%, but the ambassador's written agreement and their portal figures are authoritative.

You cannot edit records, approve commission, issue payments, or change bank details. Never claim a status changed unless the ambassador can see it. For account access, missing payments, disputed commissions, incorrect status, or manual review, direct them to Contact Support in the sidebar or fxmed@wellnesswits.com. Never request passwords, codes, PINs, card details, or authentication secrets. Do not offer medical advice or appointment booking in this mode; ambassadors should submit a consented referral instead.

Keep answers short, friendly, action-oriented, and in plain text without markdown symbols. Use portal tab and button names exactly as displayed. If a policy is not covered, say our Ambassador Program team will confirm it and direct them to Contact Support.`

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, 'zara-chat', 25, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: 'Too many messages. Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }
    const { messages: rawMessages, sessionId, context } = await request.json()
    if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > 30) {
      return NextResponse.json({ message: 'A valid conversation is required.' }, { status: 400 })
    }
    const messages: ZaraMessage[] = rawMessages.map((message: unknown): ZaraMessage => {
      const item = message as Record<string, unknown>
      return {
        role: item.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: typeof item.content === 'string' ? item.content.trim().slice(0, 4000) : '',
      }
    }).filter((message) => message.content)
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ message: 'A valid user message is required.' }, { status: 400 })
    }
    const safeSessionId = typeof sessionId === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(sessionId) ? sessionId : null
    const userMessage = messages[messages.length - 1].content

    let systemPrompt = SYSTEM_PROMPT
    if (context === 'ambassador') {
      const ambassador = await getRequestAmbassador(request, true)
      if (!ambassador) return NextResponse.json({ message: 'Please sign in to the Ambassador Portal to chat with Zara.' }, { status: 403 })
      systemPrompt = AMBASSADOR_SYSTEM_PROMPT
    }

    const result = await sendZaraMessage(messages, systemPrompt)

    // Ambassador Support is informational only. Even if a provider elects to
    // call one of Zara's public-site tools, do not create bookings or enquiries
    // from the protected portal context.
    if (context === 'ambassador' && (result.bookingData || result.enquiryData)) {
      const replyText = 'I cannot complete that action from Ambassador Support. Please use Contact Support in the sidebar so our Ambassador Program team can assist you.'
      if (safeSessionId) await persistMessages(safeSessionId, userMessage, replyText, false)
      return NextResponse.json({ message: replyText })
    }

    // Provider wants to book an appointment
    if (result.bookingData) {
      const bookingResult = await createChatAppointment(result.bookingData)
      const bookingSuccess = bookingResult.success

      const confirmationMsg = bookingSuccess
        ? 'Your appointment has been booked! You will receive a confirmation shortly.'
        : "I wasn't able to complete the booking right now. Please contact us at fxmed@wellnesswits.com or call us directly."

      // Get a confirmation message from the AI
      const confirmMessages: ZaraMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: bookingSuccess
            ? `I have successfully booked the appointment. Appointment ID: ${bookingResult.appointment?.id}`
            : 'The booking attempt failed.',
        },
        {
          role: 'user',
          content: bookingSuccess
            ? 'Please give me a warm confirmation of the booking.'
            : 'Please apologise and tell me to contact FXMed directly.',
        },
      ]

      let replyText = confirmationMsg
      try {
        const confirmResult = await sendZaraMessage(confirmMessages, SYSTEM_PROMPT)
        if (confirmResult.message) replyText = confirmResult.message
      } catch {
        // keep the default confirmationMsg
      }

      if (safeSessionId) {
        await persistMessages(safeSessionId, userMessage, replyText, bookingSuccess, bookingSuccess ? result.bookingData : undefined)
      }

      return NextResponse.json({
        message: replyText,
        booked: bookingSuccess,
        appointment: bookingResult.appointment,
      })
    }

    // Provider wants to log an enquiry
    if (result.enquiryData) {
      const { name, email, phone, message: enquiryMessage } = result.enquiryData
      await createChatEnquiry({ name, email, phone, message: enquiryMessage })

      const replyText = `Thank you, ${name.split(' ')[0]}! I've passed your question to our team and someone will get back to you at ${email} shortly. In the meantime, feel free to ask me anything else.`

      if (safeSessionId) {
        await persistMessages(safeSessionId, userMessage, replyText, false)
      }

      return NextResponse.json({ message: replyText })
    }

    // Regular text response
    const replyText = result.message || "I'm here to help!"

    if (safeSessionId) {
      await persistMessages(safeSessionId, userMessage, replyText, false)
    }

    return NextResponse.json({ message: replyText })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: "I'm having trouble connecting right now. Please try again or contact us at fxmed@wellnesswits.com" },
      { status: 500 }
    )
  }
}
