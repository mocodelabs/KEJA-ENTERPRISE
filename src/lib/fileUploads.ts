export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100)
}

/** Validates an uploaded File (or missing/empty file input) against the shared document rules. */
export function validateDocumentUpload(file: FormDataEntryValue | null): { error?: string; file: File | null } {
  const hasFile = file instanceof File && file.size > 0
  if (!hasFile) return { file: null }

  if (file.size > MAX_DOCUMENT_SIZE) return { error: 'File must be under 10MB.', file: null }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { error: 'File must be a PDF, Word document, or image (JPG/PNG).', file: null }
  }
  return { file }
}
