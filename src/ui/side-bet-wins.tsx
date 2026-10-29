import type { ReactElement } from 'react';

import { SeatRole } from '@/advisor/outlook-view';
import type { SeatOutlook } from '@/advisor/outlook-view';
import type { SideBetWin } from '@/game/side-bets';

import { sideBetWinLabel } from './format';

type SideBetBadgesProps = {
	wins: readonly SideBetWin[];
};

// Small green tags naming each side bet a seat has won, such as "Mixed pair" or "21+3 Flush".
export function SideBetBadges({ wins }: SideBetBadgesProps): ReactElement {
	return (
		<span className="flex flex-wrap gap-1">
			{wins.map(win => (
				<span
					key={win.bet}
					className="inline-flex h-4.5 items-center rounded-[4px] bg-outcome-win/15 px-1.5 text-micro font-medium text-outcome-win"
				>
					{sideBetWinLabel(win)}
				</span>
			))}
		</span>
	);
}

type OwnSideBetWinsProps = {
	outlooks: readonly SeatOutlook[];
};

// The side bets the player has won this round, called out under the count even while the panel is
// minimised, since they pay the moment the cards are out.
export function OwnSideBetWins({ outlooks }: OwnSideBetWinsProps): ReactElement | null {
	const winningSeats = outlooks.filter(seat => seat.role === SeatRole.OWN && seat.sideBetWins.length > 0);

	if (winningSeats.length === 0) {
		return null;
	}

	return (
		<div role="status" className="flex items-center gap-2 border-t border-border-faint px-4 py-2.5 text-sm">
			<span className="font-medium text-outcome-win">Side bet won</span>
			{winningSeats.map(seat => (
				<SideBetBadges key={seat.seatNumber} wins={seat.sideBetWins} />
			))}
		</div>
	);
}
