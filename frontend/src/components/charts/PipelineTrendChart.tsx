import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PipelineTrendPoint } from '@/types'

interface PipelineTrendChartProps {
  data?: PipelineTrendPoint[]
  loading?: boolean
}

export function PipelineTrendChart({ data, loading }: PipelineTrendChartProps) {
  if (loading) return <Skeleton className="h-72 w-full rounded-xl" />

  const chartData = (data ?? []).map((d, i) => ({
    label: `Run ${i + 1}`,
    tokens: d.tokens_used,
    queries: d.queries_scored,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline Token Usage Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="tokens" fill="#2563EB" name="Tokens" radius={[4, 4, 0, 0]} />
            <Bar dataKey="queries" fill="#10B981" name="Queries Scored" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
