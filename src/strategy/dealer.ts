import { addCard, bestTotal, EMPTY_HAND, handPoints, isBust, isNatural, isSoft } from '@/game/cards';
import type { HandPoints, Rank } from '@/game/cards';

import { TABLE_RULES } from './rules';
import type { ShoeOdds } from './shoe';

const STANDING_TOTALS = [17, 18, 19, 20, 21] as const;

export type StandingTotal = (typeof STANDING_TOTALS)[number];

export const DealerResult = {
	BLACKJACK: 'blackjack',
	BUST: 'bust',
} as const;

// The dealer finishes on a standing total, busts, or turns over a natural.
export type DealerResult = StandingTotal | (typeof DealerResult)[keyof typeof DealerResult];

// Every way the dealer can finish, from the lowest standing total to a bust.
export const DEALER_RESULTS: readonly DealerResult[] = [...STANDING_TOTALS, DealerResult.BLACKJACK, DealerResult.BUST];

export type DealerOutcomes = ReadonlyMap<DealerResult, number>;

type MutableOutcomes = Map<DealerResult, number>;

function isStandingTotal(total: number): total is StandingTotal {
	return STANDING_TOTALS.some(standingTotal => standingTotal === total);
}

function addProbability(target: MutableOutcomes, result: DealerResult, probability: number): void {
	target.set(result, (target.get(result) ?? 0) + probability);
}

function addWeighted(target: MutableOutcomes, source: DealerOutcomes, weight: number): void {
	for (const [result, probability] of source) {
		addProbability(target, result, probability * weight);
	}
}

function shouldDealerDraw(hand: HandPoints): boolean {
	const total = bestTotal(hand);

	if (total === 17 && isSoft(hand)) {
		return !TABLE_RULES.dealerStandsOnSoft17;
	}

	return total < 17;
}

function finishedResult(hand: HandPoints): DealerResult {
	if (isBust(hand)) {
		return DealerResult.BUST;
	}

	const total = bestTotal(hand);

	if (!isStandingTotal(total)) {
		throw new Error(`dealer stopped drawing on ${total}`);
	}

	return total;
}

// Draws until the dealer must stand. Results depend only on the hard total and whether an ace is held,
// so they are cached by that pair.
function createDealerPlayer(odds: ShoeOdds): (hand: HandPoints) => DealerOutcomes {
	const cache = new Map<string, DealerOutcomes>();

	function play(hand: HandPoints): DealerOutcomes {
		if (!shouldDealerDraw(hand)) {
			return new Map([[finishedResult(hand), 1]]);
		}

		const key = `${hand.hardTotal}:${hand.hasAce}`;
		const cached = cache.get(key);

		if (cached) {
			return cached;
		}

		const outcomes: MutableOutcomes = new Map();

		for (const [rank, probability] of odds) {
			addWeighted(outcomes, play(addCard(hand, rank)), probability);
		}

		cache.set(key, outcomes);

		return outcomes;
	}

	return play;
}

function dealerPeeksWith(upCard: Rank): boolean {
	return TABLE_RULES.dealerPeeksWith.some(rank => rank === upCard);
}

// Once the dealer has checked behind an ace and play continues, a dealer blackjack is ruled out.
function withoutBlackjack(outcomes: DealerOutcomes): DealerOutcomes {
	const remaining = 1 - (outcomes.get(DealerResult.BLACKJACK) ?? 0);
	const conditioned: MutableOutcomes = new Map();

	for (const [result, probability] of outcomes) {
		if (result !== DealerResult.BLACKJACK) {
			conditioned.set(result, probability / remaining);
		}
	}

	return conditioned;
}

// Final dealer results as seen by a player who still has a decision to make.
export function dealerOutcomes(upCard: Rank, odds: ShoeOdds): DealerOutcomes {
	const playDealer = createDealerPlayer(odds);
	const upHand = addCard(EMPTY_HAND, upCard);
	const outcomes: MutableOutcomes = new Map();

	for (const [holeCard, probability] of odds) {
		const startingHand = addCard(upHand, holeCard);

		if (isNatural(startingHand)) {
			addProbability(outcomes, DealerResult.BLACKJACK, probability);
		} else {
			addWeighted(outcomes, playDealer(startingHand), probability);
		}
	}

	if (dealerPeeksWith(upCard)) {
		return withoutBlackjack(outcomes);
	}

	return outcomes;
}

// Final dealer results from whatever the dealer shows now: the up card alone while players act, or the
// revealed hand once the dealer is drawing.
export function dealerOutcomesFrom(dealerCards: readonly Rank[], odds: ShoeOdds): DealerOutcomes {
	const [upCard] = dealerCards;

	if (!upCard) {
		throw new Error('the dealer has no cards yet');
	}

	if (dealerCards.length === 1) {
		return dealerOutcomes(upCard, odds);
	}

	const hand = handPoints(dealerCards);

	if (isNatural(hand)) {
		return new Map([[DealerResult.BLACKJACK, 1]]);
	}

	return createDealerPlayer(odds)(hand);
}
