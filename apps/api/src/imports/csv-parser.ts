import { parse } from 'csv-parse/sync'

import { AppError } from '../http/errors'

const REQUIRED_HEADERS = ['title', 'durationSeconds', 'instructorName'] as const
const OPTIONAL_HEADERS = ['description', 'tags', 'mediaUrl', 'mediaType', 'position'] as const
const DISALLOWED_HEADERS = ['creator_id', 'program_id'] as const

const ALLOWED_HEADERS = new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS])
const DISALLOWED_HEADER_SET = new Set<string>(DISALLOWED_HEADERS)

type RowInfo = {
  lines: number
}

type ParsedCsvLine = {
  record: string[]
  info: RowInfo
}

export type ParsedImportRow = {
  rowNumber: number
  columnCount: number
  expectedColumnCount: number
  values: Record<string, string>
}

type NormalizedRow = {
  title: string
  description: string
  durationSeconds: number
  instructorName: string
  tags: string[]
  mediaUrl: string | null
  mediaType: 'audio' | 'video' | null
}

export type ParsedSessionImportRow = {
  rowNumber: number
  normalized: NormalizedRow
  errors: string[]
}

function validationError(fieldErrors: Record<string, string[]> = {}, formErrors: string[] = []): never {
  throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
    issues: {
      fieldErrors,
      formErrors,
    },
  })
}

function parseCsvLines(csv: string): ParsedCsvLine[] {
  try {
    return parse(csv, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      info: true,
      relax_column_count: false,
    }) as ParsedCsvLine[]
  } catch {
    validationError({}, ['CSV is malformed'])
  }
}

function parseHeaders(firstRecord: string[]): string[] {
  const headers = firstRecord.map((header) => header.trim())

  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    validationError({}, ['CSV header row is required'])
  }

  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index)
  if (duplicateHeaders.length > 0) {
    validationError(
      {
        csv: [`Duplicate header(s): ${Array.from(new Set(duplicateHeaders)).join(', ')}`],
      },
      []
    )
  }

  const disallowedHeaders = headers.filter((header) => DISALLOWED_HEADER_SET.has(header))
  if (disallowedHeaders.length > 0) {
    validationError(
      {
        csv: [`Disallowed header(s): ${disallowedHeaders.join(', ')}`],
      },
      []
    )
  }

  const unknownHeaders = headers.filter((header) => !ALLOWED_HEADERS.has(header))
  if (unknownHeaders.length > 0) {
    validationError(
      {
        csv: [`Unknown header(s): ${unknownHeaders.join(', ')}`],
      },
      []
    )
  }

  const missingRequired = REQUIRED_HEADERS.filter((requiredHeader) => !headers.includes(requiredHeader))
  if (missingRequired.length > 0) {
    validationError(
      {
        csv: [`Missing required header(s): ${missingRequired.join(', ')}`],
      },
      []
    )
  }

  return headers
}

function parseDataRows(lines: ParsedCsvLine[], headers: string[]): ParsedImportRow[] {
  return lines.slice(1).map(({ record, info }) => {
    const values: Record<string, string> = {}

    headers.forEach((header, index) => {
      values[header] = (record[index] ?? '').trim()
    })

    return {
      rowNumber: info.lines,
      columnCount: record.length,
      expectedColumnCount: headers.length,
      values,
    }
  })
}

function parseDurationSeconds(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseTags(value: string): string[] {
  if (!value) {
    return []
  }

  const tags = value
    .split('|')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  return Array.from(new Set(tags))
}

function parseMediaType(value: string): 'audio' | 'video' | null {
  if (!value) {
    return null
  }

  if (value === 'audio' || value === 'video') {
    return value
  }

  return null
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function normalizeRow(row: ParsedImportRow): ParsedSessionImportRow {
  const errors: string[] = []
  const title = row.values.title ?? ''
  const durationSecondsInput = row.values.durationSeconds ?? ''
  const instructorName = row.values.instructorName ?? ''
  const description = row.values.description ?? ''
  const mediaUrlRaw = row.values.mediaUrl ?? ''
  const mediaTypeRaw = row.values.mediaType ?? ''
  const durationSeconds = parseDurationSeconds(durationSecondsInput)
  const mediaType = parseMediaType(mediaTypeRaw)
  const mediaUrl = mediaUrlRaw.length > 0 ? mediaUrlRaw : null

  if (row.columnCount !== row.expectedColumnCount) {
    errors.push(`row contains ${row.columnCount} column(s) but header defines ${row.expectedColumnCount}`)
  }

  if (!title) {
    errors.push('title is required')
  }

  if (durationSeconds === null) {
    errors.push('durationSeconds must be a positive integer')
  }

  if (!instructorName) {
    errors.push('instructorName is required')
  }

  if (mediaUrl && !isValidUrl(mediaUrl)) {
    errors.push('mediaUrl must be a valid URL')
  }

  if (mediaTypeRaw && mediaType === null) {
    errors.push("mediaType must be either 'audio' or 'video'")
  }

  if (mediaUrl && !mediaType) {
    errors.push("mediaType is required when mediaUrl is provided and must be 'audio' or 'video'")
  }

  return {
    rowNumber: row.rowNumber,
    normalized: {
      title,
      description,
      durationSeconds: durationSeconds ?? 0,
      instructorName,
      tags: parseTags(row.values.tags ?? ''),
      mediaUrl,
      mediaType,
    },
    errors,
  }
}

export function parseSessionImportCsv(csv: string): ParsedSessionImportRow[] {
  const lines = parseCsvLines(csv)
  if (lines.length === 0) {
    validationError({}, ['CSV header row is required'])
  }

  const headers = parseHeaders(lines[0].record)
  const rows = parseDataRows(lines, headers)

  return rows.map(normalizeRow)
}
