import type { ReactElement } from 'react';

import type { BetBehindAdvice, BetBehindSeat } from '@/advisor/bet-behind-view';
import { seatLabel } from '@/game/seats';
import { cn } from '@/lib/utils';

import { formatShare } from './format';

type BetBehindPickProps = {
	seat: BetBehindSeat;
};

// "Seat 5 follows the book 96.0% of 25 moves".
function BetBehindPick({ seat }: BetBehindPickProps): ReactElement {
	return (
		<p className="pl-4 text-xs text-muted-foreground">
			<span className="font-medium text-foreground">Seat {seatLabel(seat.seatNumber)}</span> follows the book{' '}
			{formatShare(seat.shareByTheBook)} of {seat.movesSeen} moves
		</p>
	);
}

type BetBehindAlertProps = {
	advice: BetBehindAdvice;
};

// Whether this round is worth a bet behind, shown under the count even while the panel is minimised.
// Once the count gives the player the edge it says so, along with whose decisions to follow; until then a
// player without a seat is told to sit the round out.
export function BetBehindAlert({ advice }: BetBehindAlertProps): ReactElement | null {
	if (!advice.isWorthBetting && advice.hasOwnSeat) {
		return null;
	}

	return (
		<div role="status" className="flex flex-col gap-1 border-t border-border-faint px-4 py-2.5 text-sm">
			<p className="flex items-center gap-2">
				<span
					aria-hidden
					className={cn(
						'size-2 shrink-0 rounded-full',
						advice.isWorthBetting ? 'bg-outcome-win' : 'bg-subtle'
					)}
				/>
				<span
					className={cn(
						'font-medium whitespace-nowrap',
						advice.isWorthBetting ? 'text-outcome-win' : 'text-foreground'
					)}
				>
					{advice.isWorthBetting ? 'Bet behind now' : 'Sit this round out'}
				</span>
				<span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
					{advice.isWorthBetting ? 'Your edge' : 'House edge'}
				</span>
			</p>

			{advice.isWorthBetting && advice.seat && <BetBehindPick seat={advice.seat} />}
		</div>
	);
}
