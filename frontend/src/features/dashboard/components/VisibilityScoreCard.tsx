import { TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { VisibilitySummary } from '@/types'

export function VisibilityScoreCard({ visibility, loading }: { visibility?: VisibilitySummary; loading?: boolean }) {
  if (loading || !visibility) {
    return <Skeleton className="h-[360px] w-full rounded-2xl" />
  }

  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">AI Visibility Score</h2>
      </div>
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Overall visibility score</p>
            <p className="text-4xl font-bold text-primary">{visibility.score}%</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" />
            {visibility.trend_label} from last week
          </span>
        </div>
      </div>
      <div className="overflow-x-auto px-2 pb-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Query / Prompt</TableHead>
              <TableHead className="w-20">Score</TableHead>
              <TableHead className="w-24">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibility.breakdown.map((row) => (
              <TableRow key={row.query_text}>
                <TableCell className="max-w-[220px] truncate">{row.query_text}</TableCell>
                <TableCell className="font-medium">{String(row.score).padStart(2, '0')}</TableCell>
                <TableCell className="text-muted-foreground">{row.source_volume.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
