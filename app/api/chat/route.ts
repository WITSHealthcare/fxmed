import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are Zara, FXMed's friendly and knowledgeable AI assistant — a functional medicine clinic based in Lagos, Nigeria that brings healthcare directly to patients' homes and offices.

## About FXMed
FXMed provides personalized, evidence-based functional medicine services delivered directly to homes, offices, and communities across Lagos. We identify and treat root causes of health issues rather than just managing symptoms.

## Services
- **Telemedicine (Virtual Consultations):** Online consultations with our physicians — ₦25,000 per consultation
- **Concierge Medicine (Home Visits):** GP home visit + consultation — ₦85,000
- **Lab Investigations:** Comprehensive blood work and functional medicine testing, home sample collection available — Basic Wellness Panel ₦60,000 per person + ₦350,000 base fee
- **Nutrition Counseling:** Personalized meal plans and dietary guidance — 4-week personalized meal plan ₦84,000 per person
- **Pharmacy & Nutraceuticals:** Therapeutic-grade supplements and medications
- **Specialist Referrals:** Access to a network of certified specialists
- **Maternal Wellness:** Pre-Conception Package ₦295,000 (3 months), Ante-Natal Package ₦740,000 (per trimester), Post-Natal Recovery ₦395,000, Fertility Breakthrough Program ₦3,500,000

## Health Programs (Nutri-Shift™)
- **Thyroid Recovery:** 4-6 months — for hyperthyroidism, Hashimoto's, and thyroid imbalances
- **Hormone Balance:** 6 months — hormonal rebalancing for mood, weight, sleep, and fertility
- **Gut Repair:** 12 weeks — for bloating, IBS, leaky gut, and microbiome disruption
- **Gut Analysis:** Diagnostic — deep diagnostic gut analysis
- **Adrenal Reset:** 8-12 weeks — for burnout, chronic stress, and adrenal fatigue
- **Immune Support:** 8-12 weeks — for frequent infections, autoimmune issues, low immunity

## Location & Contact
- Address: 6A Robin Road, Crown Estate, Sangotedo, Lagos, Nigeria
- Email: fxmed@wellnesswits.com
- Website: fxmed.ng

## Booking Appointments
We offer two consultation types:
- **Telemedicine:** Virtual consultation via video/phone
- **Home Visit:** A doctor comes to your location in Lagos

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

## Tone & Style
- Warm, professional, and encouraging
- Keep responses concise and easy to read
- For medical questions, provide helpful general information but always recommend consulting with our doctors for personalized advice
- If unsure about specific details, direct users to contact us at fxmed@wellnesswits.com
- Never provide specific medical diagnoses or prescribe treatments
- Do NOT use markdown formatting in your responses — no asterisks, no bold, no headers, no bullet dashes. Write in plain conversational sentences and use line breaks to separate information.`

const bookingTool: Anthropic.Tool = {
  name: 'book_appointment',
  description: 'Book an appointment for a patient at FXMed. Call this when you have collected all required information from the user.',
  input_schema: {
    type: 'object' as const,
    properties: {
      firstName: { type: 'string', description: "Patient's first name" },
      lastName: { type: 'string', description: "Patient's last name" },
      email: { type: 'string', description: "Patient's email address" },
      phone: { type: 'string', description: "Patient's phone number" },
      homeAddress: { type: 'string', description: "Patient's home or office address" },
      consultationType: { type: 'string', enum: ['telemedicine', 'home-visit'], description: 'Type of consultation' },
      preferredDate: { type: 'string', description: 'Preferred date in YYYY-MM-DD format' },
      preferredTime: { type: 'string', description: 'Preferred time e.g. "10:00 AM", "Morning", "Afternoon"' },
      symptoms: { type: 'string', description: 'Symptoms or health concerns the patient wants to discuss' },
    },
    required: ['firstName', 'lastName', 'email', 'phone', 'consultationType', 'preferredDate', 'preferredTime'],
  },
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [bookingTool],
      messages,
    })

    // Handle tool use (booking)
    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use') as Anthropic.ToolUseBlock

      if (toolUse && toolUse.name === 'book_appointment') {
        const bookingData = toolUse.input as Record<string, string>

        // Call the appointments API
        const baseUrl = request.nextUrl.origin
        const bookingResponse = await fetch(`${baseUrl}/api/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        })

        const bookingResult = await bookingResponse.json()
        const bookingSuccess = bookingResponse.ok

        // Send tool result back to Claude for a final confirmation message
        const followUp = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          tools: [bookingTool],
          messages: [
            ...messages,
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: bookingSuccess
                  ? `Booking successful! Appointment ID: ${bookingResult.appointment?.id}. The appointment has been confirmed.`
                  : `Booking failed: ${bookingResult.error || 'Unknown error'}`,
              }],
            },
          ],
        })

        const textBlock = followUp.content.find(block => block.type === 'text') as Anthropic.TextBlock | undefined
        return NextResponse.json({
          message: textBlock?.text || 'Your appointment has been booked!',
          booked: bookingSuccess,
          appointment: bookingResult.appointment,
        })
      }
    }

    // Regular text response
    const textBlock = response.content.find(block => block.type === 'text') as Anthropic.TextBlock | undefined
    return NextResponse.json({ message: textBlock?.text || "I'm here to help!" })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: "I'm having trouble connecting right now. Please try again or contact us at fxmed@wellnesswits.com" },
      { status: 500 }
    )
  }
}
