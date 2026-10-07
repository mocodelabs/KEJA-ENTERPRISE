import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type PdfLineItem = { description: string; amount: number }
export type PdfDocument = {
  docType: string
  docNumber: string
  statusLabel?: string
  orgName: string
  currency: string
  metaRows: { label: string; value: string }[]
  items: PdfLineItem[]
  totals: { label: string; value: number; emphasize?: boolean }[]
  footerNote?: string
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

export function buildDocumentPdf(doc: PdfDocument): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 40
  let y = 50

  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text(doc.orgName, marginX, y)

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${doc.docType} ${doc.docNumber}`, 555 - marginX, y, { align: 'right' })

  if (doc.statusLabel) {
    y += 16
    pdf.setFontSize(9)
    pdf.setTextColor(90)
    pdf.text(doc.statusLabel.toUpperCase(), 555 - marginX, y, { align: 'right' })
    pdf.setTextColor(0)
  }

  y += 24
  pdf.setDrawColor(220)
  pdf.line(marginX, y, 555 - marginX, y)
  y += 20

  pdf.setFontSize(10)
  for (const row of doc.metaRows) {
    pdf.setFont('helvetica', 'bold')
    pdf.text(row.label, marginX, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(row.value, marginX + 110, y)
    y += 16
  }

  y += 10

  autoTable(pdf, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Description', 'Amount']],
    body: doc.items.map((item) => [item.description, formatAmount(item.amount, doc.currency)]),
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 10, cellPadding: 6 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (pdf as any).lastAutoTable?.finalY ?? y + 30
  finalY += 16

  const totalsWidth = 200
  const totalsX = 555 - marginX - totalsWidth
  for (const total of doc.totals) {
    pdf.setFont('helvetica', total.emphasize ? 'bold' : 'normal')
    pdf.setFontSize(total.emphasize ? 11 : 10)
    pdf.text(total.label, totalsX, finalY)
    pdf.text(formatAmount(total.value, doc.currency), 555 - marginX, finalY, { align: 'right' })
    finalY += 16
  }

  if (doc.footerNote) {
    finalY += 20
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(9)
    pdf.setTextColor(120)
    const lines = pdf.splitTextToSize(doc.footerNote, 555 - marginX * 2)
    pdf.text(lines, marginX, finalY)
  }

  return pdf
}

export function downloadDocumentPdf(doc: PdfDocument, filename: string) {
  buildDocumentPdf(doc).save(filename)
}
