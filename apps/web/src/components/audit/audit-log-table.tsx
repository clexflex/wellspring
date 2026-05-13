import type { AuditLog } from '@/lib/api/types'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AuditLogTable({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  items: AuditLog[]
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}) {
  if (items.length === 0) {
    return <EmptyState title="No audit logs found" description="Adjust filters or perform an admin write action to generate logs." />
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target type</TableHead>
            <TableHead>Target ID</TableHead>
            <TableHead>Metadata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
              <TableCell>{item.action}</TableCell>
              <TableCell>{item.targetType}</TableCell>
              <TableCell className="font-mono text-xs">{item.targetId}</TableCell>
              <TableCell>
                <details>
                  <summary className="cursor-pointer text-primary">View metadata</summary>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(item.metadata, null, 2)}</pre>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore ? (
        <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading more...' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}
