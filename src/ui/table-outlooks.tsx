import type { ReactElement } from 'react';

import type { SeatOutlook } from '@/advisor/advisor-view';

import { HandStanding } from './hand-standing';
import { ValueList } from './value-list';

type TableOutlooksProps = {
	outlooks: readonly SeatOutlook[];
};

// Fallback for seats the game has not drawn where they can be found: one row per seat in the panel.
export function TableOutlooks({ outlooks }: TableOutlooksProps): ReactElement {
	return (
		<section className="flex flex-col gap-2">
			<p className="text-xs text-muted-foreground">Table</p>
			<ValueList
				rows={outlooks.map(seat => ({
					key: String(seat.seatNumber),
					label: seat.isOwnSeat ? 'You' : `Seat ${seat.seatNumber + 1}`,
					value: (
						<span className="inline-flex gap-3">
							{seat.hands.map(standing => (
								<HandStanding key={standing.handIndex} standing={standing} />
							))}
						</span>
					),
				}))}
			/>
		</section>
	);
}
