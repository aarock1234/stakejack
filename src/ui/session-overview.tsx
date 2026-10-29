import type { ReactElement } from 'react';

import type { MoveReview, SessionSummary } from '@/advisor/session-tracker';

import { Caption } from './caption';
import { formatMoney, formatMoneyChange } from './format';
import { StatGrid } from './stat-grid';
import type { Stat } from './stat-grid';
import { ValueList } from './value-list';
import type { ValueRow } from './value-list';

const SESSION_INFO = [
	'Result is what you actually won or lost on the rounds played since this table opened. Expected is what those bets were worth on average: the edge the count gave when each bet went down, the worse odds of side bets, and anything given up by moves that went against the advice. The gap between the two is luck.',
	'Moves compares each decision you made on your own hands with the move shown at that moment. Their cost is what the other moves gave up on average, not what they actually lost.',
].join('\n\n');

function moneyTone(amount: number): string | undefined {
	if (amount > 0) {
		return 'text-outcome-win';
	}

	return amount < 0 ? 'text-outcome-lose' : undefined;
}

function sessionStats(session: SessionSummary, currency: string): Stat[] {
	const rounds = session.roundsPlayed === 1 ? 'round' : 'rounds';

	return [
		{
			key: 'result',
			label: 'Result',
			value: formatMoneyChange(session.net, currency),
			detail: `Expected ${formatMoneyChange(session.expected, currency)}`,
			tone: moneyTone(session.net),
		},
		{
			key: 'wagered',
			label: 'Wagered',
			value: formatMoney(session.wagered, currency),
			detail: `${session.roundsPlayed} ${rounds}`,
		},
	];
}

function moveRows(moves: MoveReview, currency: string): ValueRow[] {
	const rows: ValueRow[] = [
		{
			key: 'moves',
			label: 'Moves like the advice',
			value: `${moves.movesMatched} of ${moves.movesPlayed}`,
		},
	];

	if (moves.cost > 0) {
		rows.push({
			key: 'cost',
			label: 'Cost of the others',
			value: formatMoney(moves.cost, currency),
			tone: 'text-outcome-lose',
		});
	}

	return rows;
}

type SessionOverviewProps = {
	session: SessionSummary;
	currency: string;
};

export function SessionOverview({ session, currency }: SessionOverviewProps): ReactElement {
	return (
		<section className="flex flex-col gap-2.5">
			<Caption info={SESSION_INFO}>This session</Caption>

			<StatGrid stats={sessionStats(session, currency)} />

			{session.moves.movesPlayed > 0 && <ValueList rows={moveRows(session.moves, currency)} />}
		</section>
	);
}
