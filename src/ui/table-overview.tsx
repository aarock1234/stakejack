import type { ReactElement } from 'react';

import { Hourglass, Target } from 'lucide-react';

import type { AdvisorView, HandStanding as HandStandingValue } from '@/advisor/advisor-view';

import { Caption } from './caption';
import { formatMoneyChange, formatShare } from './format';
import { HandStanding, OutlookBar, settledVerdict } from './hand-standing';
import { Headline } from './headline';
import { ValueList } from './value-list';
import type { ValueRow } from './value-list';

type OwnHandProps = {
	standing: HandStandingValue;
};

// The player's own hand after they have acted: its total and its chance of beating the dealer.
function OwnHand({ standing }: OwnHandProps): ReactElement {
	const verdict = settledVerdict(standing);

	if (standing.isInPlay) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">Your hand, in play</p>
				<Headline icon={Hourglass} label={<span className="font-mono tabular-nums">{standing.total}</span>} />
			</div>
		);
	}

	if (verdict) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">Your hand, {standing.total}</p>
				<Headline icon={verdict.emoji} label={verdict.label} textColor={verdict.color} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2">
				<Caption info="Your hand is done, so this is the chance the dealer ends up below you or busts. It updates with every card the dealer draws.">
					Your {standing.total}, chance to win
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

type OwnHandsProps = {
	standings: readonly HandStandingValue[];
};

// A single hand gets the large treatment; split hands sit side by side.
function OwnHands({ standings }: OwnHandsProps): ReactElement | null {
	const [onlyHand] = standings;

	if (standings.length === 1 && onlyHand) {
		return <OwnHand standing={onlyHand} />;
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs text-muted-foreground">Your hands</p>
			<div className="flex gap-4">
				{standings.map(standing => (
					<HandStanding key={standing.handIndex} standing={standing} />
				))}
			</div>
		</div>
	);
}

// Shown behind the (i) on the shoe section.
const SHOE_INFO =
	'The count tracks which cards are left. Small cards leaving is good for you, tens and aces leaving is good for the house. It only works if every card since the shuffle was seen, so it waits for a fresh shoe and resets if you leave the table. Pragmatic reshuffles about halfway through the eight decks, so big swings are rare.';

// The count and edge already sit in the panel header; this adds how deep the shoe is and the session.
function overviewRows(view: AdvisorView): ValueRow[] {
	const { shoe } = view;
	const rows: ValueRow[] = [];

	rows.push({
		key: 'dealt',
		label: 'Cards dealt',
		value: shoe.trueCount === undefined ? '—' : `${shoe.cardsDealt} of ${shoe.shoeSize}`,
	});

	if (view.wallet && view.sessionChange !== undefined) {
		rows.push({
			key: 'session',
			label: 'Session P/L',
			value: formatMoneyChange(view.sessionChange, view.wallet.currency),
		});
	}

	return rows;
}

type TableOverviewProps = {
	view: AdvisorView;
};

// Shown whenever there is nothing to decide: how the player's hand stands, the shoe, and the session.
export function TableOverview({ view }: TableOverviewProps): ReactElement {
	const ownStandings = view.outlooks.filter(seat => seat.isOwnSeat).flatMap(seat => seat.hands);

	return (
		<section className="flex flex-col gap-3">
			{ownStandings.length > 0 && <OwnHands standings={ownStandings} />}
			<div className="flex flex-col gap-2">
				<Caption info={SHOE_INFO}>The shoe</Caption>
				<ValueList rows={overviewRows(view)} />
			</div>
		</section>
	);
}
