import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ScoreProgressBar } from '@/components/common/ScoreProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useQueries, useRecheckQuery } from '@/features/queries/hooks/useQueries'
import type { Query } from '@/types'

interface QueriesTabProps {
  profileId: number
}

export function QueriesTab({ profileId }: QueriesTabProps) {
  const [minScore, setMinScore] = useState(0)
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'opportunity_score', desc: true }])

  const sort = sorting[0]
  const filters = {
    min_score: minScore || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: 10,
    sort_by: sort?.id || 'opportunity_score',
    sort_dir: sort?.desc ? ('desc' as const) : ('asc' as const),
  }

  const { data, isLoading, isError, refetch } = useQueries(profileId, filters)
  const recheck = useRecheckQuery(profileId)

  const columns: ColumnDef<Query>[] = [
    { accessorKey: 'query_text', header: 'Query' },
    { accessorKey: 'volume', header: 'Volume' },
    { accessorKey: 'difficulty', header: 'Difficulty' },
    {
      accessorKey: 'opportunity_score',
      header: 'Opportunity Score',
      cell: ({ row }) => <ScoreProgressBar score={row.original.opportunity_score} />,
    },
    {
      accessorKey: 'rationale',
      header: 'Rationale',
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground" title={row.original.rationale ?? ''}>
          {row.original.rationale || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={row.original.status === 'rechecking' || recheck.isPending}
          onClick={() => recheck.mutate(row.original.id)}
        >
          <RefreshCw className={`h-3 w-3 ${row.original.status === 'rechecking' ? 'animate-spin' : ''}`} />
          Recheck
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  })

  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Minimum Score: {minScore}</Label>
            <Slider
              value={[minScore]}
              onValueChange={([v]) => {
                setMinScore(v)
                setPage(1)
              }}
              max={100}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
                <SelectItem value="scoring">Scoring</SelectItem>
                <SelectItem value="rechecking">Rechecking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState title="No queries found" description="Adjust filters or run the pipeline to score queries." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.pages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
