import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShareOfVoiceItem } from '@/types'

export function ShareOfVoiceChart({ data, loading }: { data?: ShareOfVoiceItem[]; loading?: boolean }) {
  if (loading || !data) {
    return <Skeleton className="h-[360px] w-full rounded-2xl" />
  }

  const chartData = [...data].sort((a, b) => b.sov - a.sov)

  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">Share of Voice by Competitor</h2>
      </div>
      <div className="h-[280px] px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, 'Share of Voice']}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
              }}
            />
            <Bar dataKey="sov" radius={[0, 6, 6, 0]} barSize={18}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.is_you ? 'hsl(var(--primary))' : '#FDBA74'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 border-t px-5 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Your Brand
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-300" />
          Competitors
        </div>
      </div>
    </div>
  )
}
