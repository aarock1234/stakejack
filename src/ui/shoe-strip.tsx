import type { ReactElement } from 'react';

import { TrendingUp } from 'lucide-react';

import type { ShoeSummary } from '@/advisor/shoe-view';

import { formatCount, formatShare } from './format';
import { StatGrid } from './stat-grid';
import type { Stat } from './stat-grid';

type ShoeStripProps = {
	shoe: ShoeSummary;
};

// The count has tipped the game the player's way: shown even while the panel is minimised.
function CountAlert(): ReactElement {
	return (
		<p
			role="status"
			className="flex items-center gap-1.5 border-t bg-outcome-win/10 px-4 py-2 text-xs font-medium text-outcome-win"
		>
			<TrendingUp aria-hidden className="size-3.5" />
			The count favours you. Bet bigger.
		</p>
	);
}

// "+0.7% you" when the count gives the player the edge, otherwise "0.4% house".
function edgeLabel(edge: number): string {
	return edge > 0 ? `+${formatShare(edge)} you` : `${formatShare(Math.abs(edge))} house`;
}

function stripStats(shoe: ShoeSummary): Stat[] {
	const isFavourable = shoe.trueCount !== undefined && shoe.edge > 0;

	return [
		{
			key: 'count',
			label: 'True count',
			value: shoe.trueCount === undefined ? 'Waiting for shoe' : formatCount(shoe.trueCount),
			tone: shoe.trueCount === undefined ? 'font-sans text-xs text-muted-foreground' : undefined,
		},
		{
			key: 'edge',
			label: shoe.trueCount === undefined ? 'Edge, uncounted' : 'Edge',
			value: edgeLabel(shoe.edge),
			tone: isFavourable ? 'text-outcome-win' : undefined,
		},
	];
}

// Always visible: where the true count stands and who holds the edge on the next hand. Without a count
// the edge is the table's base house edge; with one it is adjusted for the cards left.
export function ShoeStrip({ shoe }: ShoeStripProps): ReactElement {
	const isFavourable = shoe.trueCount !== undefined && shoe.edge > 0;

	return (
		<>
			<StatGrid stats={stripStats(shoe)} className="border-t px-4 py-2.5" />
			{isFavourable && <CountAlert />}
		</>
	);
}
