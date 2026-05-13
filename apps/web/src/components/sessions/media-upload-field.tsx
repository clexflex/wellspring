'use client'

import { useState } from 'react'

import { ErrorAlert } from '@/components/shared/error-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadSessionMediaFile } from '@/lib/uploads/upload-session-media'
import { getErrorMessage } from '@/lib/utils/error-message'

export function MediaUploadField({
  onUploaded,
}: {
  onUploaded: (result: { mediaUrl: string; mediaType: 'audio' | 'video' }) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedName(file.name)
    setError(null)
    setIsUploading(true)

    try {
      const result = await uploadSessionMediaFile(file)
      onUploaded(result)
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to upload media'))
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <div className="space-y-1">
        <Label htmlFor="mediaFile">Upload audio or video</Label>
        <p className="text-sm text-muted-foreground">The file goes directly to S3 after the API returns a time-limited upload URL.</p>
      </div>
      {error ? <ErrorAlert message={error} /> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input id="mediaFile" type="file" accept="audio/*,video/*" onChange={handleFileChange} disabled={isUploading} />
        <Button type="button" variant="outline" disabled>
          {isUploading ? 'Uploading...' : selectedName ? `Selected: ${selectedName}` : 'Choose media'}
        </Button>
      </div>
    </div>
  )
}
