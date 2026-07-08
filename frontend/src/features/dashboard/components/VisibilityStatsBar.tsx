import { AtSign, Eye, Search, Tag } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { VisibilityStats } from '@/types'

function StatBlock({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  iconClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 px-5 py-4 first:pl-0 last:pr-0">
      <div className={`mt-0.5 rounded-lg bg-primary/10 p-2 ${iconClassName ?? ''}`}>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function RankedList({
  title,
  items,
  icon: Icon,
}: {
  title: string
  items: { name: string; count: number }[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{item.name}</span>
            <span className="shrink-0 font-semibold text-primary">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VisibilityStatsBar({ stats, loading }: { stats?: VisibilityStats; loading?: boolean }) {
  if (loading || !stats) {
    return <Skeleton className="h-28 w-full rounded-2xl" />
  }

  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="grid grid-cols-1 divide-y lg:grid-cols-[1fr_1fr_1fr_1.1fr_1.1fr] lg:divide-x lg:divide-y-0">
        <StatBlock icon={AtSign} label="Total Mentions" value={stats.total_mentions_label} />
        <StatBlock
          icon={Search}
          label="AI Search Volume"
          value={stats.ai_search_volume_label}
          iconClassName="bg-blue-500/10 [&_svg]:text-blue-600"
        />
        <StatBlock icon={Eye} label="Total Impressions" value={stats.total_impressions_label} />
        <RankedList title="Top Source Domains" items={stats.top_source_domains} icon={Search} />
        <RankedList title="Top Brand Entities" items={stats.top_brand_entities} icon={Tag} />
      </div>
    </div>
  )
}
