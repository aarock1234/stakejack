import type { ReactElement } from 'react';

import { SeatRole } from '@/advisor/outlook-view';
import type { SeatOutlook } from '@/advisor/outlook-view';
import type { Wallet } from '@/game/api-responses';
import { sideBetWinnings } from '@/game/side-bets';
import type { SideBetWin } from '@/game/side-bets';

import { formatMoneyChange, sideBetWinLabel } from './format';

type SideBetBadgesProps = {
	wins: readonly SideBetWin[];
	// Shows what each win pays in the player's money. Without it, each badge shows the pay table's odds,
	// since other players may bet in other currencies.
	currency?: string;
};

// Small green tags naming each side bet a seat has won, such as "Mixed pair 6:1" or "21+3 Flush +$25.00".
// When both side bets hit, the tags stack so a chip on the table stays narrow.
export function SideBetBadges({ wins, currency }: SideBetBadgesProps): ReactElement {
	return (
		<span className="flex flex-col items-start gap-1">
			{wins.map(win => (
				<span
					key={win.bet}
					className="inline-flex h-4.5 items-center gap-1 rounded-[4px] bg-outcome-win/15 px-1.5 text-micro font-medium text-outcome-win"
				>
					{sideBetWinLabel(win)}
					<span className="text-outcome-win/70">
						{currency === undefined ? `${win.payout}:1` : formatMoneyChange(sideBetWinnings(win), currency)}
					</span>
				</span>
			))}
		</span>
	);
}

type OwnSideBetWinsProps = {
	outlooks: readonly SeatOutlook[];
	wallet?: Wallet;
};

// The side bets the player has won this round, called out under the count even while the panel is
// minimised, since they pay the moment the cards are out. When both hit, or several seats win, the total
// sits beside the heading and each win gets its own badge below.
export function OwnSideBetWins({ outlooks, wallet }: OwnSideBetWinsProps): ReactElement | null {
	const winningSeats = outlooks.filter(seat => seat.role === SeatRole.OWN && seat.sideBetWins.length > 0);
	const wins = winningSeats.flatMap(seat => seat.sideBetWins);

	if (wins.length === 0) {
		return null;
	}

	const totalWinnings = wins.reduce((total, win) => total + sideBetWinnings(win), 0);

	return (
		<div role="status" className="flex flex-col gap-1.5 border-t border-border-faint px-4 py-2.5 text-sm">
			<p className="flex items-baseline justify-between gap-2">
				<span className="font-medium text-outcome-win">
					{wins.length === 1 ? 'Side bet won' : 'Side bets won'}
				</span>
				{wallet && wins.length > 1 && (
					<span className="font-medium text-outcome-win">
						{formatMoneyChange(totalWinnings, wallet.currency)}
					</span>
				)}
			</p>

			{winningSeats.map(seat => (
				<SideBetBadges key={seat.seatNumber} wins={seat.sideBetWins} currency={wallet?.currency} />
			))}
		</div>
	);
}
