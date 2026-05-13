'use client'

import { useCallback, useEffect, useState } from 'react'

import { AuditLogFilters } from '@/components/audit/audit-log-filters'
import { AuditLogTable } from '@/components/audit/audit-log-table'
import { ErrorAlert } from '@/components/shared/error-alert'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { auditApi } from '@/lib/api/client'
import type { AuditLog } from '@/lib/api/types'
import { getErrorMessage } from '@/lib/utils/error-message'

const initialFilters = { action: '', from: '', to: '' }

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [items, setItems] = useState<AuditLog[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestAuditLogs = useCallback(async (nextFilters: typeof filters, cursor?: string | null) => {
    return auditApi.list({
      action: nextFilters.action || undefined,
      from: toIso(nextFilters.from),
      to: toIso(nextFilters.to),
      limit: 25,
      cursor: cursor ?? undefined,
    })
  }, [])

  async function loadAuditLogs(
    nextFilters = filters,
    cursor?: string | null,
    append = false
  ) {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await requestAuditLogs(nextFilters, cursor)

      setItems((current) => (append ? [...current, ...response.items] : response.items))
      setNextCursor(response.pageInfo.nextCursor)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load audit logs'))
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadInitialAuditLogs() {
      try {
        const response = await requestAuditLogs(initialFilters)

        if (!active) {
          return
        }

        setItems(response.items)
        setNextCursor(response.pageInfo.nextCursor)
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load audit logs'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialAuditLogs()

    return () => {
      active = false
    }
  }, [requestAuditLogs])

  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" description="Review tenant-scoped admin write activity with filters and cursor pagination." />
      <AuditLogFilters
        filters={filters}
        onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
        onSubmit={() => void loadAuditLogs(filters, null, false)}
        onReset={() => {
          const clearedFilters = initialFilters
          setFilters(clearedFilters)
          void loadAuditLogs(clearedFilters, null, false)
        }}
        isLoading={isLoading}
      />
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? (
        <LoadingState label="Loading audit logs..." />
      ) : (
        <AuditLogTable
          items={items}
          hasMore={Boolean(nextCursor)}
          isLoadingMore={isLoadingMore}
          onLoadMore={() => {
            if (nextCursor) {
              void loadAuditLogs(filters, nextCursor, true)
            }
          }}
        />
      )}
    </div>
  )
}
