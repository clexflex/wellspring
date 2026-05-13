export const ALLOWED_MEDIA_CONTENT_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const

export type AllowedMediaContentType = (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number]
