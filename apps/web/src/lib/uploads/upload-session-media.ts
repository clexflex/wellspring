import { uploadsApi } from '@/lib/api/client'
import { ALLOWED_MEDIA_CONTENT_TYPES } from '@/lib/uploads/constants'

export async function uploadSessionMediaFile(file: File): Promise<{ mediaUrl: string; mediaType: 'audio' | 'video' }> {
  if (file.size <= 0) {
    throw new Error('Select a non-empty media file')
  }

  if (!ALLOWED_MEDIA_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number])) {
    throw new Error('Unsupported media type')
  }

  const response = await uploadsApi.presignSessionMedia({
    filename: file.name,
    contentType: file.type,
    contentLength: file.size,
  })

  const uploadResponse = await fetch(response.upload.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Direct upload to S3 failed')
  }

  return {
    mediaUrl: response.upload.publicUrl,
    mediaType: file.type.startsWith('video/') ? 'video' : 'audio',
  }
}
