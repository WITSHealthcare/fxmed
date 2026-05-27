import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export interface ZaraMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ZaraResult {
  message: string
  booked: boolean
  bookingData?: Record<string, string>
  enquiryData?: Record<string, string>
}

// ─── Tool schemas shared across providers ────────────────────────────────────

const BOOKING_PARAMS = {
  firstName:        { type: 'string',  description: "Patient's first name" },
  lastName:         { type: 'string',  description: "Patient's last name" },
  email:            { type: 'string',  description: "Patient's email address" },
  phone:            { type: 'string',  description: "Patient's phone number" },
  homeAddress:      { type: 'string',  description: "Patient's home or office address" },
  consultationType: { type: 'string',  description: 'telemedicine or home-visit' },
  preferredDate:    { type: 'string',  description: 'Preferred date YYYY-MM-DD' },
  preferredTime:    { type: 'string',  description: 'Preferred time e.g. "10:00 AM"' },
  symptoms:         { type: 'string',  description: 'Health concerns to discuss' },
}
const BOOKING_REQUIRED = ['firstName', 'lastName', 'email', 'phone', 'consultationType', 'preferredDate', 'preferredTime']
const BOOKING_DESCRIPTION = 'Book an appointment for a patient at FXMed. Call this when you have collected all required information.'

const ENQUIRY_PARAMS = {
  name:    { type: 'string', description: "User's full name" },
  email:   { type: 'string', description: "User's email address" },
  phone:   { type: 'string', description: "User's phone number (optional)" },
  message: { type: 'string', description: 'The specific question or enquiry to pass to the FXMed team' },
}
const ENQUIRY_REQUIRED = ['name', 'email', 'message']
const ENQUIRY_DESCRIPTION = 'Log an enquiry from a user so the FXMed team can follow up directly. Use this when the user asks something you cannot answer with certainty.'

// ─── Gemini ─────────────────────────────────────────────────────────────────

async function tryGemini(messages: ZaraMessage[], systemPrompt: string): Promise<ZaraResult> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    tools: [{
      functionDeclarations: [
        {
          name: 'book_appointment',
          description: BOOKING_DESCRIPTION,
          parameters: {
            type: SchemaType.OBJECT,
            properties: Object.fromEntries(
              Object.entries(BOOKING_PARAMS).map(([k, v]) => [k, { type: SchemaType.STRING, description: v.description }])
            ),
            required: BOOKING_REQUIRED,
          },
        },
        {
          name: 'submit_enquiry',
          description: ENQUIRY_DESCRIPTION,
          parameters: {
            type: SchemaType.OBJECT,
            properties: Object.fromEntries(
              Object.entries(ENQUIRY_PARAMS).map(([k, v]) => [k, { type: SchemaType.STRING, description: v.description }])
            ),
            required: ENQUIRY_REQUIRED,
          },
        },
      ],
    }],
  })

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const result = await model.generateContent({ contents })
  const response = result.response
  const calls = response.functionCalls()

  if (calls && calls.length > 0) {
    const call = calls[0]
    if (call.name === 'submit_enquiry') return { message: '', booked: false, enquiryData: call.args as Record<string, string> }
    return { message: '', booked: false, bookingData: call.args as Record<string, string> }
  }

  return { message: response.text(), booked: false }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function tryOpenAI(messages: ZaraMessage[], systemPrompt: string): Promise<ZaraResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    tools: [
      {
        type: 'function' as const,
        function: {
          name: 'book_appointment',
          description: BOOKING_DESCRIPTION,
          parameters: { type: 'object', properties: BOOKING_PARAMS, required: BOOKING_REQUIRED },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'submit_enquiry',
          description: ENQUIRY_DESCRIPTION,
          parameters: { type: 'object', properties: ENQUIRY_PARAMS, required: ENQUIRY_REQUIRED },
        },
      },
    ],
    tool_choice: 'auto',
  })

  const choice = response.choices[0]

  if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
    const call = choice.message.tool_calls[0]
    const args = 'function' in call ? (call as { function: { arguments: string } }).function.arguments : '{}'
    const data = JSON.parse(args) as Record<string, string>
    const toolName = 'function' in call ? (call as { function: { name: string } }).function.name : ''
    if (toolName === 'submit_enquiry') return { message: '', booked: false, enquiryData: data }
    return { message: '', booked: false, bookingData: data }
  }

  return { message: choice.message.content ?? "I'm here to help!", booked: false }
}

// ─── Claude ──────────────────────────────────────────────────────────────────

async function tryClaude(messages: ZaraMessage[], systemPrompt: string): Promise<ZaraResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools: [
      {
        name: 'book_appointment',
        description: BOOKING_DESCRIPTION,
        input_schema: { type: 'object' as const, properties: BOOKING_PARAMS, required: BOOKING_REQUIRED },
      },
      {
        name: 'submit_enquiry',
        description: ENQUIRY_DESCRIPTION,
        input_schema: { type: 'object' as const, properties: ENQUIRY_PARAMS, required: ENQUIRY_REQUIRED },
      },
    ],
    messages,
  })

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock
    if (toolUse?.name === 'submit_enquiry') return { message: '', booked: false, enquiryData: toolUse.input as Record<string, string> }
    if (toolUse?.name === 'book_appointment') return { message: '', booked: false, bookingData: toolUse.input as Record<string, string> }
  }

  const textBlock = response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined
  return { message: textBlock?.text ?? "I'm here to help!", booked: false }
}

// ─── Cascade: Gemini → OpenAI → Claude ───────────────────────────────────────

export async function sendZaraMessage(
  messages: ZaraMessage[],
  systemPrompt: string
): Promise<ZaraResult> {
  const providers: Array<{ name: string; fn: () => Promise<ZaraResult> }> = []

  if (process.env.GOOGLE_AI_API_KEY)   providers.push({ name: 'Gemini',  fn: () => tryGemini(messages, systemPrompt) })
  if (process.env.OPENAI_API_KEY)      providers.push({ name: 'OpenAI',  fn: () => tryOpenAI(messages, systemPrompt) })
  if (process.env.ANTHROPIC_API_KEY)   providers.push({ name: 'Claude',  fn: () => tryClaude(messages, systemPrompt) })

  if (providers.length === 0) throw new Error('No AI provider configured.')

  for (const provider of providers) {
    try {
      const result = await provider.fn()
      return result
    } catch (err) {
      console.warn(`[Zara] ${provider.name} failed, trying next:`, err)
    }
  }

  throw new Error('All AI providers failed.')
}
