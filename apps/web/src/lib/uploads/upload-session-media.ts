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

  let uploadResponse: Response

  try {
    uploadResponse = await fetch(response.upload.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Browser upload to S3 was blocked before the file reached the bucket. Check the S3 bucket CORS configuration for your frontend origin and allow PUT requests with the Content-Type header.'
      )
    }

    throw error
  }

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => '')
    const statusLabel = `${uploadResponse.status} ${uploadResponse.statusText}`.trim()

    throw new Error(
      errorBody
        ? `Direct upload to S3 failed (${statusLabel}). ${errorBody}`
        : `Direct upload to S3 failed (${statusLabel}).`
    )
  }

  return {
    mediaUrl: response.upload.publicUrl,
    mediaType: file.type.startsWith('video/') ? 'video' : 'audio',
  }
}
