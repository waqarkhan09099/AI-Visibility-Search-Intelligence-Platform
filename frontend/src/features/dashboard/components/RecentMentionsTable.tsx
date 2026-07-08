import { AtSign, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/utils/cn'
import type { MentionsPage } from '@/types'

function MentionBadge({ mentioned }: { mentioned: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        mentioned ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      )}
    >
      {mentioned ? 'Yes' : 'No'}
    </span>
  )
}

function SovValue({ value }: { value: number }) {
  const tone = value >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
  return <span className={cn('font-medium', tone)}>{value}%</span>
}

function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
}: {
  page: number
  pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        {visiblePages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
              p === page
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {p}
          </button>
        ))}
        {pages > 5 && (
          <>
            <span className="px-1 text-muted-foreground">...</span>
            <button
              type="button"
              onClick={() => onPageChange(pages)}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
                pages === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {pages}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function RecentMentionsTable({
  mentions,
  loading,
  search,
  onSearchChange,
  onPageChange,
}: {
  mentions?: MentionsPage
  loading?: boolean
  search: string
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AtSign className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Recent Mentions</h2>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search here..."
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[180px]">Query / Prompt</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Mentioned</TableHead>
                  <TableHead>AI Search Vol</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead className="min-w-[160px]">Snippet</TableHead>
                  <TableHead>SOV</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="min-w-[130px]">Last Checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentions?.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[220px] truncate font-medium">{row.query_text}</TableCell>
                    <TableCell>{row.platform}</TableCell>
                    <TableCell>
                      <MentionBadge mentioned={row.mentioned} />
                    </TableCell>
                    <TableCell>{row.ai_search_vol.toLocaleString()}</TableCell>
                    <TableCell>{String(row.sources).padStart(2, '0')}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{row.snippet}</TableCell>
                    <TableCell>
                      <SovValue value={row.sov} />
                    </TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell className="text-muted-foreground">{row.last_checked ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {mentions?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No mentions found for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {mentions && mentions.total > 0 && (
            <Pagination
              page={mentions.page}
              pages={mentions.pages}
              total={mentions.total}
              limit={mentions.limit}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  )
}
