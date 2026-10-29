import type { ReactElement } from 'react';

import type { ShoeSummary } from '@/advisor/shoe-view';

import { formatCount, formatRunningCount, formatShare } from './format';
import { StatGrid } from './stat-grid';
import type { Stat } from './stat-grid';

const NOT_COUNTED = '—';

type ShoeStripProps = {
	shoe: ShoeSummary;
};

function isFavourable(shoe: ShoeSummary): boolean {
	return shoe.trueCount !== undefined && shoe.edge > 0;
}

// "You +0.7%" when the count gives the player the edge, otherwise "House 0.6%".
function edgeLabel(edge: number): string {
	return edge > 0 ? `You +${formatShare(edge)}` : `House ${formatShare(Math.abs(edge))}`;
}

function countStat(shoe: ShoeSummary): Stat {
	if (shoe.trueCount === undefined || shoe.runningCount === undefined) {
		return {
			key: 'count',
			label: 'True count',
			value: NOT_COUNTED,
			detail: 'Next fresh shoe',
			tone: 'text-subtle',
		};
	}

	return {
		key: 'count',
		label: 'True count',
		value: formatCount(shoe.trueCount),
		detail: `${formatRunningCount(shoe.runningCount)} running`,
	};
}

function edgeStat(shoe: ShoeSummary): Stat {
	return {
		key: 'edge',
		label: 'Edge',
		value: edgeLabel(shoe.edge),
		detail: shoe.trueCount === undefined ? 'Table base' : 'With the count',
		tone: isFavourable(shoe) ? 'text-outcome-win' : undefined,
	};
}

// The count has tipped the game the player's way: shown even while the panel is minimised.
function CountAlert(): ReactElement {
	return (
		<p role="status" className="flex items-center gap-2 border-t border-border-faint px-4 py-2.5 text-sm">
			<span aria-hidden className="size-2 shrink-0 rounded-full bg-outcome-win" />
			<span className="font-medium text-outcome-win">The count favours you</span>
			<span className="text-muted-foreground">Bet bigger</span>
		</p>
	);
}

// Always visible: where the true count stands and who holds the edge on the next hand. Without a count
// the edge is the table's base house edge; with one it is adjusted for the cards left.
export function ShoeStrip({ shoe }: ShoeStripProps): ReactElement {
	return (
		<>
			<StatGrid stats={[countStat(shoe), edgeStat(shoe)]} className="border-t border-border-faint px-4 py-3" />
			{isFavourable(shoe) && <CountAlert />}
		</>
	);
}
