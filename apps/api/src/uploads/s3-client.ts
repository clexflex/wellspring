import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { getEnv } from '../config/env'

type CreatePresignedPutUrlInput = {
  key: string
  contentType: string
  contentLength: number
  expiresInSeconds: number
}

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    const env = getEnv()

    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }

  return s3Client
}

export async function createPresignedPutUrl(input: CreatePresignedPutUrlInput): Promise<string> {
  const env = getEnv()
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  })

  return getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresInSeconds,
  })
}

export function resetS3ClientForTests(): void {
  s3Client = null
}
