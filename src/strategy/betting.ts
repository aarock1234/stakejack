import type { TableLimits } from '@/game/api-responses';
import { Rank } from '@/game/cards';

import { TABLE_RULES } from './rules';

// Pragmatic Play publishes a 99.41% return for the main game with perfect basic strategy.
const BASE_PLAYER_EDGE = -0.0059;

// Each point of Hi-Lo true count moves the player's edge by about half a percent.
const EDGE_PER_TRUE_COUNT = 0.005;

// Kelly sizing stakes edge ÷ variance of the bankroll; a blackjack hand's variance is about 1.3 stakes.
// Half Kelly keeps most of the growth with far smaller swings.
const HAND_VARIANCE = 1.3;
const KELLY_FRACTION = 0.5;

const CARDS_PER_DECK = 52;

// Published returns of the optional side bets. Both lose far more than the main game.
export const SIDE_BET_RETURNS = {
	perfectPairs: 0.959,
	twentyOnePlusThree: 0.963,
} as const;

function hiLoValue(rank: Rank): number {
	if (rank === Rank.TEN || rank === Rank.ACE) {
		return -1;
	}

	if (rank === Rank.SEVEN || rank === Rank.EIGHT || rank === Rank.NINE) {
		return 0;
	}

	return 1;
}

export const SHOE_SIZE = TABLE_RULES.deckCount * CARDS_PER_DECK;

// Hi-Lo: every two to six seen adds one, every ten or ace takes one away. The higher it climbs, the
// richer the rest of the shoe is in tens and aces, which favour the player.
export function runningCount(seenRanks: readonly Rank[]): number {
	return seenRanks.reduce((count, rank) => count + hiLoValue(rank), 0);
}

// Never below half a deck, so the true count stays sensible right before a shuffle.
export function decksRemaining(seenRanks: readonly Rank[]): number {
	return Math.max((SHOE_SIZE - seenRanks.length) / CARDS_PER_DECK, 0.5);
}

// The running count spread over the decks still in the shoe, which is what moves the edge.
export function trueCount(seenRanks: readonly Rank[]): number {
	return runningCount(seenRanks) / decksRemaining(seenRanks);
}

// Estimated player edge on the main bet: -0.006 means the house wins 0.6% of it on average. Without a
// count, the shoe is assumed neutral.
export function estimateEdge(count: number | undefined): number {
	return BASE_PLAYER_EDGE + EDGE_PER_TRUE_COUNT * (count ?? 0);
}

export type BetAdvice = {
	// Suggested main bet, in whole currency units within the table limits.
	amount: number;
	edge: number;
	isTableMinimum: boolean;
	canAffordMinimum: boolean;
};

export type BetSituation = {
	balance: number;
	limits: TableLimits;
	// Omitted when the shoe was not followed from its first card.
	trueCount?: number;
};

export function adviseBet(situation: BetSituation): BetAdvice {
	const { balance, limits } = situation;
	const edge = estimateEdge(situation.trueCount);
	const kellyBet = edge > 0 ? (balance * edge * KELLY_FRACTION) / HAND_VARIANCE : 0;
	const largestBet = Math.min(limits.maximumBet, balance);
	const amount = Math.floor(Math.min(Math.max(kellyBet, limits.minimumBet), largestBet));

	return {
		amount,
		edge,
		isTableMinimum: amount <= limits.minimumBet,
		canAffordMinimum: balance >= limits.minimumBet,
	};
}
