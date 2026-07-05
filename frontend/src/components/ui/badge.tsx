import * as React from 'react'
import { cn } from '@/utils/cn'

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'outline' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variant === 'outline' && 'border-input bg-transparent',
        variant === 'default' && 'border-transparent bg-primary/10 text-primary',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
