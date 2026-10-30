import {
  CHAT_ALLOWED_EXTENSIONS,
  CHAT_MAX_FILE_SIZE,
} from '@/lib/chat/constants'

import { getFileExtension } from '@/lib/chat/helpers'

const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',

  'application/javascript',
  'text/javascript',

  'application/x-msdownload',
  'application/x-msdos-program',

  'application/x-sh',
  'application/x-shellscript',

  'application/x-httpd-php',
  'application/java-archive',
])

export type ChatFileValidationResult =
  | {
      ok: true
      extension: string
      originalFilename: string
      mimeType: string
      fileSize: number
    }
  | {
      ok: false
      error: string
      message: string
    }

export function validateChatFile({
  filename,
  size,
  mimeType,
}: {
  filename: string
  size: number
  mimeType?: string | null
}): ChatFileValidationResult {
  const originalFilename = String(filename ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()

  if (!originalFilename) {
    return {
      ok: false,
      error: 'invalid_filename',
      message: 'Ungültiger Dateiname.',
    }
  }

  if (originalFilename.length > 200) {
    return {
      ok: false,
      error: 'filename_too_long',
      message:
        'Der Dateiname darf höchstens 200 Zeichen lang sein.',
    }
  }

  const extension = getFileExtension(originalFilename)

  if (!extension) {
    return {
      ok: false,
      error: 'file_extension_required',
      message:
        'Die Datei benötigt eine gültige Dateiendung.',
    }
  }

  if (!CHAT_ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: 'file_type_not_allowed',
      message:
        'Dieser Dateityp ist im Chat nicht erlaubt.',
    }
  }

  if (
    !Number.isFinite(size) ||
    !Number.isInteger(size) ||
    size <= 0
  ) {
    return {
      ok: false,
      error: 'invalid_file_size',
      message: 'Ungültige Dateigröße.',
    }
  }

  if (size > CHAT_MAX_FILE_SIZE) {
    return {
      ok: false,
      error: 'file_too_large',
      message:
        'Dateien dürfen höchstens 25 MB groß sein.',
    }
  }

  const normalizedMime =
    typeof mimeType === 'string' && mimeType.trim()
      ? mimeType.trim().toLowerCase()
      : 'application/octet-stream'

  if (BLOCKED_MIME_TYPES.has(normalizedMime)) {
    return {
      ok: false,
      error: 'file_type_not_allowed',
      message:
        'Dieser Dateityp ist im Chat nicht erlaubt.',
    }
  }

  return {
    ok: true,
    extension,
    originalFilename,
    mimeType: normalizedMime,
    fileSize: size,
  }
}