export const CHAT_ATTACHMENT_BUCKET = 'chat-attachments'

export const CHAT_MAX_MESSAGE_LENGTH = 10_000
export const CHAT_MAX_FILE_SIZE = 25 * 1024 * 1024

export const CHAT_MESSAGE_PAGE_SIZE = 40

export const CHAT_ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',

  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'ppt',
  'pptx',

  'dxf',
  'dwg',
  'step',
  'stp',
  'iges',
  'igs',
])

export type ChatSourceType =
  | 'rating_profile'
  | 'job'
  | 'lack_request'
  | 'article'
  | 'order'

export const CHAT_SOURCE_TYPES = new Set<ChatSourceType>([
  'rating_profile',
  'job',
  'lack_request',
  'article',
  'order',
])