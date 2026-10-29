import type { ReactElement } from 'react';

import type { MoveReview, SeatResult, SessionSummary } from '@/advisor/session-tracker';
import { seatLabel } from '@/game/seats';
import { cn } from '@/lib/utils';

import { SectionId } from './collapsed-sections';
import { CollapsibleSection } from './collapsible-section';
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

const SEAT_INFO =
	'Your result from each seat you have played. Every seat draws from the same shuffled shoe, so over enough rounds the seats come out alike, and the differences here are the usual swings of blackjack.';

// "Seat 3, 12 rounds" beside what the seat came to.
function seatRows(bySeat: readonly SeatResult[], currency: string): ValueRow[] {
	return bySeat.map(seat => ({
		key: String(seat.seatNumber),
		label: `Seat ${seatLabel(seat.seatNumber)}, ${seat.roundsPlayed} ${seat.roundsPlayed === 1 ? 'round' : 'rounds'}`,
		value: formatMoneyChange(seat.net, currency),
		tone: moneyTone(seat.net),
	}));
}

type SessionOverviewProps = {
	session: SessionSummary;
	currency: string;
};

// "+$42.50 in 18 rounds" while folded.
function SessionSummaryLine({ session, currency }: SessionOverviewProps): ReactElement {
	const rounds = session.roundsPlayed === 1 ? 'round' : 'rounds';

	return (
		<span>
			<span className={cn('font-medium', moneyTone(session.net))}>
				{formatMoneyChange(session.net, currency)}
			</span>
			<span className="text-muted-foreground">
				{' '}
				in {session.roundsPlayed} {rounds}
			</span>
		</span>
	);
}

// "Best seat 7" while folded: the seat that has come out furthest ahead.
function bestSeatSummary(bySeat: readonly SeatResult[]): string {
	const best = bySeat.reduce((leader, seat) => (seat.net > leader.net ? seat : leader));

	return `Best seat ${seatLabel(best.seatNumber)}`;
}

export function SessionOverview({ session, currency }: SessionOverviewProps): ReactElement {
	// One seat would only repeat the total above.
	const hasPlayedSeveralSeats = session.bySeat.length > 1;

	return (
		<CollapsibleSection
			id={SectionId.SESSION}
			title="This session"
			info={SESSION_INFO}
			summary={<SessionSummaryLine session={session} currency={currency} />}
			className="gap-2.5"
		>
			<StatGrid stats={sessionStats(session, currency)} />

			{session.moves.movesPlayed > 0 && <ValueList rows={moveRows(session.moves, currency)} />}

			{hasPlayedSeveralSeats && (
				<CollapsibleSection
					id={SectionId.BY_SEAT}
					title="By seat"
					info={SEAT_INFO}
					summary={bestSeatSummary(session.bySeat)}
					className="gap-1 border-t border-border-faint pt-2.5"
				>
					<ValueList rows={seatRows(session.bySeat, currency)} />
				</CollapsibleSection>
			)}
		</CollapsibleSection>
	);
}
