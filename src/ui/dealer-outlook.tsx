import type { CSSProperties, ReactElement } from 'react';

import type { DealerChance, DealerOutlook } from '@/advisor/outlook-view';
import { DealerResult } from '@/strategy/dealer';

import { Caption } from './caption';
import { ChanceList } from './chance-list';
import type { ChanceRow } from './chance-list';
import { formatHandTotal, formatShare } from './format';
import { MiniPlayingCard } from './playing-card';
import { TableChip } from './table-chip';
import type { TablePoint } from './use-table-anchors';

// Probabilities summed from many draws land a hair away from exactly one.
const CERTAIN = 0.9995;

const DEALER_INFO =
	'How the dealer is likely to finish from the cards showing, given the cards already out of the shoe. The dealer draws to 16 and stands on every 17. A high bust chance favours anyone still holding a hand.';

function resultLabel(result: DealerResult): string {
	if (result === DealerResult.BLACKJACK) {
		return 'Blackjack';
	}

	if (result === DealerResult.BUST) {
		return 'Bust';
	}

	return `Ends on ${result}`;
}

function chanceRows(chances: readonly DealerChance[]): ChanceRow[] {
	return chances.map(chance => ({
		key: String(chance.result),
		label: resultLabel(chance.result),
		probability: chance.probability,
		color: chance.result === DealerResult.BUST ? 'text-outcome-win' : undefined,
	}));
}

// The dealer's finish once nothing is left to chance.
function settledResult(dealer: DealerOutlook): DealerResult | undefined {
	const [onlyChance] = dealer.chances;

	return dealer.chances.length === 1 && onlyChance && onlyChance.probability > CERTAIN
		? onlyChance.result
		: undefined;
}

// Both totals of a soft hand while the dealer still has to draw, as the game shows them.
function dealerTotal(dealer: DealerOutlook): string {
	const isDrawing = settledResult(dealer) === undefined;

	return isDrawing ? formatHandTotal(dealer.total, dealer.isSoft) : String(dealer.total);
}

type DealerSummaryProps = {
	dealer: DealerOutlook;
};

// "Bust 42.1%" while the dealer still has to draw, or the result once they are done.
function DealerSummary({ dealer }: DealerSummaryProps): ReactElement {
	const settled = settledResult(dealer);

	if (settled !== undefined) {
		return <span className="text-xs font-medium">{resultLabel(settled)}</span>;
	}

	return (
		<span className="flex items-baseline gap-1.5 text-xs">
			<span className="text-muted-foreground">Bust</span>
			<span className="font-medium text-outcome-win">{formatShare(dealer.bustChance)}</span>
		</span>
	);
}

type DealerOutlookChipProps = {
	dealer: DealerOutlook;
	className?: string;
	style?: CSSProperties;
};

// A small frosted card with the dealer's bust chance, opening into every way they can finish.
export function DealerOutlookChip({ dealer, className, style }: DealerOutlookChipProps): ReactElement {
	const isSettled = settledResult(dealer) !== undefined;

	return (
		<TableChip label="Dealer" className={className} style={style}>
			<DealerSummary dealer={dealer} />

			{!isSettled && (
				<div className="hidden pt-0.5 group-focus:block group-hover:block">
					<ChanceList rows={chanceRows(dealer.chances)} />
				</div>
			)}
		</TableChip>
	);
}

type AnchoredDealerOutlookProps = {
	dealer: DealerOutlook;
	anchor: TablePoint;
};

// The chip resting beside the dealer's score, centred on it.
export function AnchoredDealerOutlook({ dealer, anchor }: AnchoredDealerOutlookProps): ReactElement {
	return (
		<DealerOutlookChip
			dealer={dealer}
			className="fixed z-2147483647 -translate-y-1/2"
			style={{
				left: anchor.x,
				top: anchor.y,
			}}
		/>
	);
}

type DealerOverviewProps = {
	dealer: DealerOutlook;
};

// The panel's single line for the dealer, for when the game's dealer area cannot be found on the table.
export function DealerOverview({ dealer }: DealerOverviewProps): ReactElement {
	return (
		<section className="flex flex-col gap-2">
			<Caption info={DEALER_INFO}>Dealer, {dealerTotal(dealer)}</Caption>

			<div className="flex items-center justify-between gap-3">
				<div className="flex gap-0.5">
					{/* Cards are only ever appended to a hand, so their position is a stable identity. */}
					{dealer.cards.map((card, position) => (
						<MiniPlayingCard key={position} card={card} />
					))}
				</div>
				<DealerSummary dealer={dealer} />
			</div>
		</section>
	);
}
