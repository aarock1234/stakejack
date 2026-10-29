import type { CSSProperties, ReactElement } from 'react';

import { SeatRole } from '@/advisor/outlook-view';
import type { HandStanding as HandStandingValue, SeatOutlook } from '@/advisor/outlook-view';

import { ChanceList } from './chance-list';
import type { ChanceRow } from './chance-list';
import { HandStanding } from './hand-standing';
import { MiniPlayingCard } from './playing-card';
import { TableChip } from './table-chip';
import type { TableAnchors } from './use-table-anchors';

const ROLE_LABELS: Readonly<Record<SeatRole, string | undefined>> = {
	[SeatRole.OWN]: 'You',
	[SeatRole.BEHIND]: 'Your bet behind',
	[SeatRole.OTHER]: undefined,
};

function outlookRows(standing: HandStandingValue): ChanceRow[] {
	return [
		{
			key: 'win',
			label: 'Win',
			probability: standing.outlook.win,
			color: 'text-outcome-win',
		},
		{
			key: 'push',
			label: 'Push',
			probability: standing.outlook.push,
		},
		{
			key: 'lose',
			label: 'Lose',
			probability: standing.outlook.lose,
			color: 'text-outcome-lose',
		},
	];
}

type SeatHandProps = {
	standing: HandStandingValue;
};

// The hand's cards, small enough to read at a glance, over how it stands against the dealer. Hovering or
// tapping the chip opens the full split of results.
function SeatHand({ standing }: SeatHandProps): ReactElement {
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex gap-0.5">
				{/* Cards are only ever appended to a hand, so their position is a stable identity. */}
				{standing.cards.map((card, position) => (
					<MiniPlayingCard key={position} card={card} />
				))}
			</div>

			<HandStanding standing={standing} />

			{!standing.isBust && (
				<div className="hidden pt-0.5 group-focus:block group-hover:block">
					<ChanceList rows={outlookRows(standing)} />
				</div>
			)}
		</div>
	);
}

type SeatOutlookChipProps = {
	seat: SeatOutlook;
	className?: string;
	style?: CSSProperties;
};

// A small frosted card with each of the seat's hands and how they stand against the dealer.
export function SeatOutlookChip({ seat, className, style }: SeatOutlookChipProps): ReactElement {
	const roleLabel = ROLE_LABELS[seat.role];

	return (
		<TableChip
			label={roleLabel ?? `Seat ${seat.seatNumber + 1}`}
			isHighlighted={seat.role !== SeatRole.OTHER}
			className={className}
			style={style}
		>
			{roleLabel && (
				<p className="hidden text-micro font-medium text-muted-foreground group-focus:block group-hover:block">
					{roleLabel}
				</p>
			)}

			<div className="flex gap-2.5">
				{seat.hands.map(standing => (
					<SeatHand key={standing.handIndex} standing={standing} />
				))}
			</div>
		</TableChip>
	);
}

type SeatOutlooksProps = {
	outlooks: readonly SeatOutlook[];
	anchors: TableAnchors;
};

// Chips resting just above each seat's bet spot. They grow upward when opened, away from the game's
// controls below them.
export function SeatOutlooks({ outlooks, anchors }: SeatOutlooksProps): ReactElement {
	return (
		<>
			{outlooks.map(seat => {
				const anchor = anchors.seats.get(seat.seatNumber);

				if (!anchor) {
					return null;
				}

				return (
					<SeatOutlookChip
						key={seat.seatNumber}
						seat={seat}
						className="fixed z-2147483647 -translate-x-1/2 -translate-y-full"
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
