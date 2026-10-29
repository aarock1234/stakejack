import type { ReactElement, ReactNode } from 'react';

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
				<Caption>{name}, in play</Caption>
				<Headline icon={Hourglass} label={formatHandTotal(standing.total, standing.isSoft)} />
			</div>
		);
	}

	if (verdict) {
		return (
			<div className="flex flex-col gap-2">
				<Caption>
					{name}, {standing.total}
				</Caption>
				<Headline icon={verdict.icon} label={verdict.label} textColor={verdict.color} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<Caption info="The hand is done, so this is the chance the dealer ends up below it or busts. It updates with every card the dealer draws.">
				{name}, {standing.total}
			</Caption>
			<Headline icon={Target} label={formatShare(standing.outlook.win)} detail="to win" />
			<OutlookBar outlook={standing.outlook} />
			<p className="flex justify-between text-micro text-muted-foreground">
				<span>Push {formatShare(standing.outlook.push)}</span>
				<span>Lose {formatShare(standing.outlook.lose)}</span>
			</p>
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
			<Caption>{seatName(seat)}, split</Caption>
			<div className="flex gap-4">
				{seat.hands.map(standing => (
					<HandStanding key={standing.handIndex} standing={standing} />
				))}
			</div>
		</div>
	);
}

type OverviewPartProps = {
	children: ReactNode;
};

// One part of the overview. The hairlines between parts keep the dealer, hands, shoe, and session from
// running together.
function OverviewPart({ children }: OverviewPartProps): ReactElement {
	return <div className="py-4 first:pt-0 last:pb-0">{children}</div>;
}

type TableOverviewProps = {
	view: AdvisorView;
};

// Shown whenever there is nothing to decide: the dealer's hand, how the player's hands stand against it,
// the shoe, and the session. The dealer stays here until the round is cleared, so their finished hand can
// be read after the last card.
export function TableOverview({ view }: TableOverviewProps): ReactElement {
	const playedSeats = view.outlooks.filter(seat => seat.role !== SeatRole.OTHER);

	return (
		<section className="flex flex-col divide-y divide-border-faint">
			{view.dealer && (
				<OverviewPart>
					<DealerOverview dealer={view.dealer} />
				</OverviewPart>
			)}

			{playedSeats.map(seat => (
				<OverviewPart key={seat.seatNumber}>
					<PlayedSeat seat={seat} />
				</OverviewPart>
			))}

			<OverviewPart>
				<ShoeOverview shoe={view.shoe} />
			</OverviewPart>

			{view.wallet && view.session.roundsPlayed > 0 && (
				<OverviewPart>
					<SessionOverview session={view.session} currency={view.wallet.currency} />
				</OverviewPart>
			)}
		</section>
	);
}
