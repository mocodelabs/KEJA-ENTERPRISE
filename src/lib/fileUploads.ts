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

/**
 * Validates an uploaded File (or missing/empty file input) against the shared document rules.
 * Pass `uploadsDisabled` for the public demo account, which may not store files (also enforced in
 * the database by the demo_user_no_uploads storage policy).
 */
export function validateDocumentUpload(
  file: FormDataEntryValue | null,
  { uploadsDisabled = false }: { uploadsDisabled?: boolean } = {}
): { error?: string; file: File | null } {
  const hasFile = file instanceof File && file.size > 0
  if (!hasFile) return { file: null }

  if (uploadsDisabled) return { error: 'File uploads are turned off in the demo. Create an account to try them.', file: null }

  if (file.size > MAX_DOCUMENT_SIZE) return { error: 'File must be under 10MB.', file: null }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { error: 'File must be a PDF, Word document, or image (JPG/PNG).', file: null }
  }
  return { file }
}
