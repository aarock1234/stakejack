import type { CSSProperties, ReactElement } from 'react';

import type { SeatOutlook } from '@/advisor/advisor-view';
import { cn } from '@/lib/utils';

import { HandStanding } from './hand-standing';
import type { SeatAnchors } from './use-seat-anchors';

type SeatOutlookChipProps = {
	seat: SeatOutlook;
	className?: string;
	style?: CSSProperties;
};

// A small frosted card with each of the seat's hands and how they stand against the dealer.
export function SeatOutlookChip({ seat, className, style }: SeatOutlookChipProps): ReactElement {
	return (
		<div
			className={cn(
				'flex gap-2.5 rounded-lg border bg-card px-2 py-1.5 font-sans text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/6%),0_8px_16px_-6px_oklch(0_0_0/60%)] backdrop-blur-md',
				className
			)}
			style={style}
		>
			{seat.hands.map(standing => (
				<HandStanding key={standing.handIndex} standing={standing} />
			))}
		</div>
	);
}

type SeatOutlooksProps = {
	outlooks: readonly SeatOutlook[];
	anchors: SeatAnchors;
};

// Chips resting just above each seat's bet spot. They ignore the pointer so the table's own controls
// stay clickable underneath.
export function SeatOutlooks({ outlooks, anchors }: SeatOutlooksProps): ReactElement {
	return (
		<>
			{outlooks.map(seat => {
				const anchor = anchors.get(seat.seatNumber);

				if (!anchor) {
					return null;
				}

				return (
					<SeatOutlookChip
						key={seat.seatNumber}
						seat={seat}
						className="pointer-events-none fixed z-2147483647 -translate-x-1/2 -translate-y-full"
						style={{
							left: anchor.x,
							top: anchor.y,
						}}
					/>
				);
			})}
		</>
	);
}
