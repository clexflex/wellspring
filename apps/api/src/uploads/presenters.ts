export function presentPresignedSessionMediaUpload(input: {
  uploadUrl: string
  key: string
  publicUrl: string
  expiresInSeconds: number
}) {
  return {
    upload: {
      uploadUrl: input.uploadUrl,
      key: input.key,
      publicUrl: input.publicUrl,
      expiresInSeconds: input.expiresInSeconds,
    },
  }
}
