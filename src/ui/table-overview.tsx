import type { ReactElement } from 'react';

import { Hourglass, Target } from 'lucide-react';

import type { AdvisorView } from '@/advisor/advisor-view';
import { SeatRole } from '@/advisor/outlook-view';
import type { HandStanding as HandStandingValue, SeatOutlook } from '@/advisor/outlook-view';

import { Caption } from './caption';
import { DealerOverview } from './dealer-outlook';
import { formatHandTotal, formatShare } from './format';
import { HandStanding, OutlookBar, settledVerdict } from './hand-standing';
import { Headline } from './headline';
import { SessionOverview } from './session-overview';
import { ShoeOverview } from './shoe-overview';

type PlayedHandProps = {
	// "Your hand" or "Behind seat 3".
	name: string;
	standing: HandStandingValue;
};

// A hand the player has money on, after the moves are made: its total and its chance of beating the dealer.
function PlayedHand({ name, standing }: PlayedHandProps): ReactElement {
	const verdict = settledVerdict(standing);

	if (standing.isInPlay) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">{name}, in play</p>
				<Headline
					icon={Hourglass}
					label={
						<span className="font-mono tabular-nums">
							{formatHandTotal(standing.total, standing.isSoft)}
						</span>
					}
				/>
			</div>
		);
	}

	if (verdict) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					{name}, {standing.total}
				</p>
				<Headline icon={verdict.emoji} label={verdict.label} textColor={verdict.color} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2">
				<Caption info="The hand is done, so this is the chance the dealer ends up below it or busts. It updates with every card the dealer draws.">
					{name}, {standing.total}, chance to win
				</Caption>
				<Headline
					icon={Target}
					label={<span className="font-mono tabular-nums">{formatShare(standing.outlook.win)}</span>}
				/>
			</div>
			<OutlookBar outlook={standing.outlook} />
		</div>
	);
}

type PlayedSeatProps = {
	seat: SeatOutlook;
};

function seatName(seat: SeatOutlook): string {
	return seat.role === SeatRole.BEHIND ? `Behind seat ${seat.seatNumber + 1}` : 'Your hand';
}

// A single hand gets the large treatment; split hands sit side by side.
function PlayedSeat({ seat }: PlayedSeatProps): ReactElement {
	const [onlyHand] = seat.hands;

	if (seat.hands.length === 1 && onlyHand) {
		return <PlayedHand name={seatName(seat)} standing={onlyHand} />;
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs text-muted-foreground">{seatName(seat)}, split</p>
			<div className="flex gap-4">
				{seat.hands.map(standing => (
					<HandStanding key={standing.handIndex} standing={standing} />
				))}
			</div>
		</div>
	);
}

type TableOverviewProps = {
	view: AdvisorView;
	// The dealer's chances already rest on the table beside their score.
	isDealerOnTable: boolean;
};

// Shown whenever there is nothing to decide: how the player's hands stand, the dealer, the shoe, and the
// session.
export function TableOverview({ view, isDealerOnTable }: TableOverviewProps): ReactElement {
	const playedSeats = view.outlooks.filter(seat => seat.role !== SeatRole.OTHER);

	// A hairline between each part keeps the hands, dealer, shoe, and session from running together.
	return (
		<section className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:pt-4">
			{playedSeats.map(seat => (
				<PlayedSeat key={seat.seatNumber} seat={seat} />
			))}

			{view.dealer && !isDealerOnTable && <DealerOverview dealer={view.dealer} />}

			<ShoeOverview shoe={view.shoe} />

			{view.wallet && view.session.roundsPlayed > 0 && (
				<SessionOverview session={view.session} currency={view.wallet.currency} />
			)}
		</section>
	);
}
