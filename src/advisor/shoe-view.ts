import type { Rank } from '@/game/cards';
import type { TableTracker } from '@/game/table-tracker';
import { decksRemaining, estimateEdge, runningCount, SHOE_SIZE, trueCount } from '@/strategy/betting';
import { TABLE_RULES } from '@/strategy/rules';

// How far the shoe has to go before the dealer reshuffles, estimated from where the cut card usually sits.
export type ReshuffleEstimate = {
	cardsLeft: number;
	// Omitted until a round has been dealt, since it depends on how many cards a round uses here.
	roundsLeft?: number;
};

// The state of the shoe, shown whenever there is nothing to decide.
export type ShoeSummary = {
	// The counts and reshuffle estimate are omitted until a fresh shoe has been followed from its first card.
	trueCount?: number;
	runningCount?: number;
	decksRemaining?: number;
	reshuffle?: ReshuffleEstimate;
	cardsDealt: number;
	shoeSize: number;
	edge: number;
};

// A shoe joined partway through: nothing to count, so the edge is the table's base house edge.
export const UNTRACKED_SHOE: ShoeSummary = {
	cardsDealt: 0,
	shoeSize: SHOE_SIZE,
	edge: estimateEdge(undefined),
};

const RESHUFFLE_AT_CARD = Math.round(SHOE_SIZE * TABLE_RULES.reshuffleShare);

// Every card dealt from the current shoe, when it has been followed from its first card.
export function trackedShoeCards(table: TableTracker): Rank[] | undefined {
	return table.shoe.isTrackedFromStart ? table.shoe.seenRanks() : undefined;
}

// The true count when the shoe is being counted.
export function currentTrueCount(table: TableTracker): number | undefined {
	const shoeCards = trackedShoeCards(table);

	return shoeCards ? trueCount(shoeCards) : undefined;
}

// The player's edge on a main bet placed now: adjusted for the count when there is one.
export function currentEdge(table: TableTracker): number {
	return estimateEdge(currentTrueCount(table));
}

function estimateReshuffle(cardsDealt: number, roundsDealt: number): ReshuffleEstimate {
	const cardsLeft = Math.max(RESHUFFLE_AT_CARD - cardsDealt, 0);

	if (roundsDealt === 0) {
		return {
			cardsLeft,
		};
	}

	const cardsPerRound = cardsDealt / roundsDealt;

	return {
		cardsLeft,
		roundsLeft: Math.floor(cardsLeft / cardsPerRound),
	};
}

export function describeShoe(table: TableTracker): ShoeSummary {
	const shoeCards = trackedShoeCards(table);

	if (!shoeCards) {
		return UNTRACKED_SHOE;
	}

	const count = trueCount(shoeCards);

	return {
		trueCount: count,
		runningCount: runningCount(shoeCards),
		decksRemaining: decksRemaining(shoeCards),
		reshuffle: estimateReshuffle(shoeCards.length, table.shoe.roundCount()),
		cardsDealt: shoeCards.length,
		shoeSize: SHOE_SIZE,
		edge: estimateEdge(count),
	};
}
