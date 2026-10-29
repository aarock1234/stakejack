import type { ReactElement } from 'react';

import { ArrowRightLeft } from 'lucide-react';

import type { SeatSuggestion } from '@/advisor/seat-advice';

import { Caption } from './caption';

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
