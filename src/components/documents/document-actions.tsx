'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Printer, Download, MessageCircle, Mail } from 'lucide-react'
import { downloadDocumentPdf, type PdfDocument } from '@/lib/pdf/documentPdf'

type SendResult = { error?: string; message?: string } | void

export function DocumentActions({
  doc,
  filename,
  onSendWhatsApp,
  onSendEmail,
  whatsappLabel = 'Send via WhatsApp',
  emailLabel = 'Send via Email',
}: {
  doc: PdfDocument
  filename: string
  onSendWhatsApp?: () => Promise<SendResult>
  onSendEmail?: () => Promise<SendResult>
  whatsappLabel?: string
  emailLabel?: string
}) {
  const [isSendingWhatsApp, startWhatsApp] = useTransition()
  const [isSendingEmail, startEmail] = useTransition()
  const router = useRouter()

  function handle(action: () => Promise<SendResult>, start: typeof startWhatsApp) {
    start(async () => {
      const result = await action()
      if (result?.error) toast.error(result.error)
      else {
        if (result?.message) toast.success(result.message)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <Button type="button" variant="outline" onClick={() => downloadDocumentPdf(doc, filename)}>
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
      {onSendEmail && (
        <Button type="button" variant="outline" disabled={isSendingEmail} onClick={() => handle(onSendEmail, startEmail)}>
          <Mail className="h-4 w-4" />
          {isSendingEmail ? 'Sending…' : emailLabel}
        </Button>
      )}
      {onSendWhatsApp && (
        <Button
          type="button"
          variant="outline"
          disabled={isSendingWhatsApp}
          onClick={() => handle(onSendWhatsApp, startWhatsApp)}
        >
          <MessageCircle className="h-4 w-4" />
          {isSendingWhatsApp ? 'Sending…' : whatsappLabel}
        </Button>
      )}
    </div>
  )
}
