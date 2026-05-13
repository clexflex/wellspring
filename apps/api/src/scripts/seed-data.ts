export type SeedCreator = {
  id: string
  email: string
  password: string
  displayName: string
  slug: string
  programs: Array<{
    id: string
    title: string
    description: string
    sessions: Array<{
      id: string
      title: string
      description: string
      durationSeconds: number
      position: number
      instructorName: string
      tags: string[]
      mediaUrl: string
      mediaType: 'audio' | 'video'
    }>
  }>
}

function sessionId(index: number): string {
  return `00000000-0000-0000-0000-${index.toString().padStart(12, '0')}`
}

export const seedCreators: SeedCreator[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'ava@wellspring.local',
    password: 'Wellspring123!',
    displayName: 'Ava Bloom',
    slug: 'ava-bloom',
    programs: Array.from({ length: 3 }, (_, programIndex) => ({
      id: `10000000-0000-0000-0000-${(programIndex + 1).toString().padStart(12, '0')}`,
      title: `Ava Program ${programIndex + 1}`,
      description: `Seeded program ${programIndex + 1} for Ava Bloom`,
      sessions: Array.from({ length: 10 }, (_, sessionIndex) => ({
        id: sessionId(programIndex * 10 + sessionIndex + 1),
        title: `Ava Session ${programIndex + 1}.${sessionIndex + 1}`,
        description: `Seeded session ${sessionIndex + 1} for Ava Program ${programIndex + 1}`,
        durationSeconds: 600 + sessionIndex * 60,
        position: sessionIndex + 1,
        instructorName: 'Ava Bloom',
        tags: sessionIndex % 2 === 0 ? ['sleep', 'breathwork'] : ['sleep', 'mindfulness'],
        mediaUrl: `https://example.com/media/ava-program-${programIndex + 1}-session-${sessionIndex + 1}.mp4`,
        mediaType: 'video',
      })),
    })),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'milo@wellspring.local',
    password: 'Wellspring123!',
    displayName: 'Milo Tide',
    slug: 'milo-tide',
    programs: Array.from({ length: 3 }, (_, programIndex) => ({
      id: `20000000-0000-0000-0000-${(programIndex + 1).toString().padStart(12, '0')}`,
      title: `Milo Program ${programIndex + 1}`,
      description: `Seeded program ${programIndex + 1} for Milo Tide`,
      sessions: Array.from({ length: 10 }, (_, sessionIndex) => ({
        id: sessionId(100 + programIndex * 10 + sessionIndex + 1),
        title: `Milo Session ${programIndex + 1}.${sessionIndex + 1}`,
        description: `Seeded session ${sessionIndex + 1} for Milo Program ${programIndex + 1}`,
        durationSeconds: 540 + sessionIndex * 45,
        position: sessionIndex + 1,
        instructorName: 'Milo Tide',
        tags: sessionIndex % 2 === 0 ? ['focus', 'audio'] : ['focus', 'movement'],
        mediaUrl: `https://example.com/media/milo-program-${programIndex + 1}-session-${sessionIndex + 1}.mp3`,
        mediaType: 'audio',
      })),
    })),
  },
]
