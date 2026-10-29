import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Stat = {
	key: string;
	label: string;
	value: ReactNode;
	// A text colour for the value; neutral when omitted.
	tone?: string;
};

type StatGridProps = {
	stats: readonly Stat[];
	className?: string;
};

// Figures in a two-column grid, each a small label over its number, so every value reads on its own.
export function StatGrid({ stats, className }: StatGridProps): ReactElement {
	return (
		<dl className={cn('grid grid-cols-2 gap-x-4 gap-y-3', className)}>
			{stats.map(stat => (
				<div key={stat.key} className="flex min-w-0 flex-col gap-0.5">
					<dt className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
						{stat.label}
					</dt>
					<dd className={cn('truncate font-mono text-sm text-foreground tabular-nums', stat.tone)}>
						{stat.value}
					</dd>
				</div>
			))}
		</dl>
	);
}
