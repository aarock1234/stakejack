import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ValueRow = {
	key: string;
	label: ReactNode;
	value: ReactNode;
	// A text colour for the value; neutral when omitted.
	tone?: string;
};

type ValueListProps = {
	rows: readonly ValueRow[];
};

// Secondary facts under a recommendation, one per line: the label on the left, its figure on the right.
export function ValueList({ rows }: ValueListProps): ReactElement {
	return (
		<dl className="flex flex-col text-sm">
			{rows.map(row => (
				<div key={row.key} className="flex h-6 items-center gap-3">
					<dt className="truncate text-muted-foreground">{row.label}</dt>
					<dd className={cn('ml-auto shrink-0 font-medium text-foreground', row.tone)}>{row.value}</dd>
				</div>
			))}
		</dl>
	);
}
