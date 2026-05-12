import type { CreatorRecord } from './creator-repository'

export type CreatorProfile = {
  id: string
  email: string
  displayName: string
  slug: string
  createdAt: string
  updatedAt: string
}

export function presentCreator(creator: CreatorRecord): CreatorProfile {
  return {
    id: creator.id,
    email: creator.email,
    displayName: creator.display_name,
    slug: creator.slug,
    createdAt: creator.created_at.toISOString(),
    updatedAt: creator.updated_at.toISOString(),
  }
}
