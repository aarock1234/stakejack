import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';

import { formatShare } from './format';

export type ChanceRow = {
	key: string;
	label: string;
	probability: number;
	// A text colour for the row's figure; neutral when omitted.
	color?: string;
};

type ChanceListProps = {
	rows: readonly ChanceRow[];
};

// A compact column of outcomes and their chances, for the details a chip opens into.
export function ChanceList({ rows }: ChanceListProps): ReactElement {
	return (
		<dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[11px] leading-4">
			{rows.map(row => (
				<div key={row.key} className="contents">
					<dt className="text-muted-foreground">{row.label}</dt>
					<dd className={cn('text-right font-mono tabular-nums', row.color)}>
						{formatShare(row.probability)}
					</dd>
				</div>
			))}
		</dl>
	);
}
