import type { ReactElement } from 'react';

import { ArrowRightLeft } from 'lucide-react';

import type { SeatSuggestion } from '@/advisor/seat-advice';

import { Caption } from './caption';
import { TableChip } from './table-chip';
import type { TablePoint } from './use-table-anchors';

const SEAT_INFO =
	'Every seat gets the same odds on its own cards. The dealer plays from the right of the table to the left, so a seat further left decides after seeing more of the other hands, and the counted advice uses those cards. The gain is small and only counts while the shoe is being counted.';

type SeatSuggestionNoteProps = {
	suggestion: SeatSuggestion;
};

// The panel's suggestion to change seats before the next round.
export function SeatSuggestionNote({ suggestion }: SeatSuggestionNoteProps): ReactElement {
	return (
		<section className="flex flex-col gap-1.5 border-t border-border-faint pt-4">
			<Caption info={SEAT_INFO}>Better seat open</Caption>
			<p className="flex items-center gap-2 text-sm">
				<ArrowRightLeft aria-hidden className="size-4 text-muted-foreground" />
				<span className="font-medium">Move to seat {suggestion.seatNumber + 1}</span>
				<span className="text-muted-foreground">to act later</span>
			</p>
		</section>
	);
}

type SeatSuggestionChipProps = {
	anchor: TablePoint;
};

// A chip resting on the suggested seat's bet spot, so the seat is easy to find on the table.
export function SeatSuggestionChip({ anchor }: SeatSuggestionChipProps): ReactElement {
	return (
		<TableChip
			label="Suggested seat"
			isHighlighted
			className="fixed z-2147483647 -translate-x-1/2 -translate-y-full"
			style={{
				left: anchor.x,
				top: anchor.y,
			}}
		>
			<span className="text-xs font-medium text-outcome-win">Sit here</span>
			<span className="text-micro text-muted-foreground">Acts after more hands</span>
		</TableChip>
	);
}
