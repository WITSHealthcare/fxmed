// Sending email from the app, through Resend. Needs RESEND_API_KEY; EMAIL_FROM
// is optional and must be an address on a domain verified in Resend (fxmed.ng
// is). Without a key, email is skipped and logged, and nothing else fails.

export const defaultSender = 'FXMed Care Team <care@fxmed.ng>'

export async function sendEmail({ to, subject, html, text, replyTo }: {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn(`RESEND_API_KEY is not set, so this email was not sent: ${subject}`)
    return false
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || defaultSender, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      console.error(`Email could not be sent (${response.status}):`, await response.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('Email could not be sent:', error)
    return false
  }
}
