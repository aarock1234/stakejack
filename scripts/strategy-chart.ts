import { handPoints, Rank, RANKS } from '@/game/cards';
import { Action, adviseHand } from '@/strategy/advice';
import type { Action as ActionType } from '@/strategy/advice';

// Prints the engine's strategy chart for the Pragmatic Play table rules, using the same letters as
// printed basic strategy cards: H hit, S stand, D double, P split.

const DEALER_UP_CARDS: readonly Rank[] = [...RANKS.filter(rank => rank !== Rank.ACE), Rank.ACE];

const ACTION_LETTERS: Readonly<Record<ActionType, string>> = {
	[Action.HIT]: 'H',
	[Action.STAND]: 'S',
	[Action.DOUBLE]: 'D',
	[Action.SPLIT]: 'P',
	[Action.CASH_OUT]: 'C',
};

type ChartRow = {
	label: string;
	playerCards: readonly Rank[];
	canSplit: boolean;
};

function rankWorth(points: number): Rank {
	const rank = RANKS.find(candidate => handPoints([candidate]).hardTotal === points);

	if (!rank) {
		throw new Error(`no card is worth ${points} points`);
	}

	return rank;
}

function hardRows(): ChartRow[] {
	const rows: ChartRow[] = [];

	for (let total = 5; total <= 20; total += 1) {
		const firstCard = total > 12 ? Rank.TEN : Rank.TWO;
		const secondCard = rankWorth(total - handPoints([firstCard]).hardTotal);

		rows.push({
			label: `hard ${total}`,
			playerCards: [firstCard, secondCard],
			canSplit: false,
		});
	}

	return rows;
}

function softRows(): ChartRow[] {
	return [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE].map(rank => ({
		label: `A,${rank}`,
		playerCards: [Rank.ACE, rank],
		canSplit: false,
	}));
}

function pairRows(): ChartRow[] {
	return RANKS.map(rank => ({
		label: `${rank},${rank}`,
		playerCards: [rank, rank],
		canSplit: true,
	}));
}

function chartLine(row: ChartRow): string {
	const letters = DEALER_UP_CARDS.map(dealerUpCard => {
		const advice = adviseHand({
			playerCards: row.playerCards,
			dealerUpCard,
			canDouble: true,
			canSplit: row.canSplit,
		});

		return ACTION_LETTERS[advice.best.action];
	});

	return `${row.label.padEnd(9)} ${letters.join('  ')}`;
}

console.log(`${''.padEnd(9)} ${DEALER_UP_CARDS.join('  ')}`);

for (const row of [...hardRows(), ...softRows(), ...pairRows()]) {
	console.log(chartLine(row));
}
