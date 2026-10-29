import type { ReactElement } from 'react';

import type { MoveReview, SessionSummary } from '@/advisor/session-tracker';

import { Caption } from './caption';
import { formatMoney, formatMoneyChange } from './format';
import { StatGrid } from './stat-grid';
import type { Stat } from './stat-grid';

const SESSION_INFO = [
	'Result is what you actually won or lost on the rounds played since this table opened. Expected is what those bets were worth on average: the edge the count gave when each bet went down, the worse odds of side bets, and anything given up by moves that went against the advice. The gap between the two is luck.',
	'The last line compares each decision you made on your own hands with the move shown at that moment. Its cost is what the different moves gave up on average, not what they actually lost.',
].join('\n\n');

function moneyTone(amount: number): string | undefined {
	if (amount > 0) {
		return 'text-outcome-win';
	}

	return amount < 0 ? 'text-outcome-lose' : undefined;
}

function sessionStats(session: SessionSummary, currency: string): Stat[] {
	return [
		{
			key: 'result',
			label: 'Result',
			value: formatMoneyChange(session.net, currency),
			tone: moneyTone(session.net),
		},
		{
			key: 'expected',
			label: 'Expected',
			value: formatMoneyChange(session.expected, currency),
		},
		{
			key: 'rounds',
			label: 'Rounds',
			value: session.roundsPlayed,
		},
		{
			key: 'wagered',
			label: 'Wagered',
			value: formatMoney(session.wagered, currency),
		},
	];
}

// "2 of 3 moves followed the advice. The other cost about $0.03."
function moveSummary(moves: MoveReview, currency: string): string {
	const followed = `${moves.movesMatched} of ${moves.movesPlayed} moves followed the advice.`;
	const others = moves.movesPlayed - moves.movesMatched;

	if (others === 0 || moves.cost <= 0) {
		return followed;
	}

	const subject = others === 1 ? 'The other' : 'The others';

	return `${followed} ${subject} cost about ${formatMoney(moves.cost, currency)}.`;
}

type SessionOverviewProps = {
	session: SessionSummary;
	currency: string;
};

export function SessionOverview({ session, currency }: SessionOverviewProps): ReactElement {
	return (
		<div className="flex flex-col gap-2.5">
			<Caption info={SESSION_INFO}>This session</Caption>

			<StatGrid stats={sessionStats(session, currency)} className="rounded-lg bg-muted/50 px-3 py-2.5" />

			{session.moves.movesPlayed > 0 && (
				<p className="text-xs text-muted-foreground">{moveSummary(session.moves, currency)}</p>
			)}
		</div>
	);
}
