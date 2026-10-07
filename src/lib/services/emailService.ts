import { buildDocumentPdf, type PdfDocument } from '@/lib/pdf/documentPdf'

export type EmailAttachment = { filename: string; content: Buffer; contentType: string }

export interface EmailProvider {
  send(opts: { to: string; subject: string; text: string; attachments?: EmailAttachment[] }): Promise<{
    success: boolean
    error?: string
  }>
}

/** Default stub: logs to the server console instead of sending a real email. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(opts: { to: string; subject: string; text: string; attachments?: EmailAttachment[] }) {
    const attachmentNote = opts.attachments?.length ? ` (${opts.attachments.length} attachment(s))` : ''
    console.log(`[Email stub -> ${opts.to}] ${opts.subject}${attachmentNote}`)
    return { success: true }
  }
}

/**
 * Resend (https://resend.com) integration point — a simple REST email API.
 * Set RESEND_API_KEY / RESEND_FROM_EMAIL in .env.local to activate, then
 * complete the fetch call below.
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private fromAddress: string
  ) {}

  async send(opts: { to: string; subject: string; text: string; attachments?: EmailAttachment[] }) {
    try {
      console.warn(`[ResendEmailProvider stub] would send to=${opts.to} subject="${opts.subject}"`)
      // TODO: wire the real Resend request here, e.g.:
      // const res = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     from: this.fromAddress,
      //     to: opts.to,
      //     subject: opts.subject,
      //     text: opts.text,
      //     attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })),
      //   }),
      // })
      // if (!res.ok) return { success: false, error: `Resend error ${res.status}` }
      return { success: false, error: 'ResendEmailProvider is not wired up yet — see lib/services/emailService.ts' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown email error' }
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL)
  }
  return new ConsoleEmailProvider()
}

/** Renders a PdfDocument to bytes and emails it as an attachment via the configured provider. */
export async function sendDocumentByEmail(opts: {
  to: string
  subject: string
  text: string
  doc: PdfDocument
  filename: string
}) {
  const pdf = buildDocumentPdf(opts.doc)
  const content = Buffer.from(pdf.output('arraybuffer'))

  const provider = getEmailProvider()
  return provider.send({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: [{ filename: opts.filename, content, contentType: 'application/pdf' }],
  })
}
