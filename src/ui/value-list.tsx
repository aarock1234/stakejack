import type { ReactElement, ReactNode } from 'react';

export type ValueRow = {
	key: string;
	label: ReactNode;
	value: ReactNode;
};

type ValueListProps = {
	rows: readonly ValueRow[];
};

// Secondary facts under a recommendation, in a quiet inset: labels on the left, numbers on the right.
export function ValueList({ rows }: ValueListProps): ReactElement {
	return (
		<dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5 text-xs">
			{rows.map(row => (
				<div key={row.key} className="contents">
					<dt className="whitespace-nowrap text-muted-foreground">{row.label}</dt>
					<dd className="text-right font-mono text-foreground/80 tabular-nums">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}
