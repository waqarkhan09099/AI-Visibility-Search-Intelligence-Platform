import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ScatterPoint } from '@/types'

interface ScatterChartProps {
  data?: ScatterPoint[]
  loading?: boolean
}

function scoreColor(score: number) {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

export function VolumeDifficultyChart({ data, loading }: ScatterChartProps) {
  if (loading) return <Skeleton className="h-80 w-full rounded-xl" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume vs Difficulty</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="volume" name="Volume" tick={{ fontSize: 12 }} />
            <YAxis type="number" dataKey="difficulty" name="Difficulty" tick={{ fontSize: 12 }} />
            <ZAxis type="number" dataKey="score" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null
                const p = payload[0].payload as ScatterPoint
                return (
                  <div className="rounded-lg border bg-background p-3 text-sm shadow-md">
                    <p className="font-medium">{p.query}</p>
                    <p>Volume: {p.volume}</p>
                    <p>Difficulty: {p.difficulty}</p>
                    <p>Opportunity: {p.score}</p>
                  </div>
                )
              }}
            />
            <Scatter data={data ?? []} fill="#2563EB">
              {(data ?? []).map((entry, index) => (
                <Cell key={index} fill={scoreColor(entry.score)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
