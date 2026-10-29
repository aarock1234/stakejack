import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Stat = {
	key: string;
	label: string;
	value: ReactNode;
	// A line of context under the figure, such as what it is measured against.
	detail?: ReactNode;
	// A text colour for the value; neutral when omitted.
	tone?: string;
};

type StatGridProps = {
	stats: readonly Stat[];
	className?: string;
};

// Figures side by side, each a small label over its number and a line of context, so every value reads on
// its own.
export function StatGrid({ stats, className }: StatGridProps): ReactElement {
	return (
		<dl className={cn('grid grid-cols-2 gap-x-4 gap-y-3', className)}>
			{stats.map(stat => (
				<div key={stat.key} className="flex min-w-0 flex-col">
					<dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
					<dd className={cn('truncate text-figure text-foreground', stat.tone)}>{stat.value}</dd>
					{stat.detail !== undefined && (
						<dd className="truncate text-micro text-muted-foreground">{stat.detail}</dd>
					)}
				</div>
			))}
		</dl>
	);
}
