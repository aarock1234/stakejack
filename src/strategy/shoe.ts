import { Rank, RANKS } from '@/game/cards';

import { TABLE_RULES } from './rules';

// Probability of drawing each rank next. Draws after the known cards are treated as independent, which
// is how book strategy for an eight deck shoe is computed.
export type ShoeOdds = ReadonlyMap<Rank, number>;

function fullShoeCount(rank: Rank): number {
	const cardsPerRankPerDeck = rank === Rank.TEN ? 16 : 4;

	return cardsPerRankPerDeck * TABLE_RULES.deckCount;
}

export function shoeOddsWithout(knownCards: readonly Rank[]): ShoeOdds {
	const counts = new Map(RANKS.map(rank => [rank, fullShoeCount(rank)]));

	for (const rank of knownCards) {
		counts.set(rank, (counts.get(rank) ?? 0) - 1);
	}

	const remaining = [...counts.values()].reduce((sum, count) => sum + count, 0);

	return new Map(RANKS.map(rank => [rank, (counts.get(rank) ?? 0) / remaining]));
}
