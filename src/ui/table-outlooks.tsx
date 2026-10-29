import type { ReactElement } from 'react';

import { SeatRole } from '@/advisor/outlook-view';
import type { SeatOutlook } from '@/advisor/outlook-view';

import { HandStanding } from './hand-standing';
import { ValueList } from './value-list';

function seatLabel(seat: SeatOutlook): string {
	switch (seat.role) {
		case SeatRole.OWN:
			return 'You';
		case SeatRole.BEHIND:
			return `Behind ${seat.seatNumber + 1}`;
		case SeatRole.OTHER:
			return `Seat ${seat.seatNumber + 1}`;
	}
}

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
					label: seatLabel(seat),
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
