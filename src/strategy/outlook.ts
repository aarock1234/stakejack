import { bestTotal, handPoints, isBust, isNatural } from '@/game/cards';
import type { HandPoints, Rank } from '@/game/cards';

import { dealerOutcomesFrom, DealerResult } from './dealer';
import { shoeOddsWithout } from './shoe';

// Chances of each result if the hand stands as it is now. They add up to one.
export type HandOutlook = {
	win: number;
	push: number;
	lose: number;
};

export type OutlookSituation = {
	playerCards: readonly Rank[];
	dealerCards: readonly Rank[];
	// Split hands cannot hold a blackjack: an ace and a ten after a split is an ordinary 21.
	isSplitHand: boolean;
	// Every card known to have left the shoe, including both hands.
	cardsOut: readonly Rank[];
};

const Outcome = {
	WIN: 'win',
	PUSH: 'push',
	LOSE: 'lose',
} as const;

type Outcome = (typeof Outcome)[keyof typeof Outcome];

function settle(hand: HandPoints, hasBlackjack: boolean, dealerResult: DealerResult): Outcome {
	if (isBust(hand)) {
		return Outcome.LOSE;
	}

	if (hasBlackjack) {
		return dealerResult === DealerResult.BLACKJACK ? Outcome.PUSH : Outcome.WIN;
	}

	if (dealerResult === DealerResult.BLACKJACK) {
		return Outcome.LOSE;
	}

	if (dealerResult === DealerResult.BUST) {
		return Outcome.WIN;
	}

	const playerTotal = bestTotal(hand);

	if (playerTotal === dealerResult) {
		return Outcome.PUSH;
	}

	return playerTotal > dealerResult ? Outcome.WIN : Outcome.LOSE;
}

export function handOutlook(situation: OutlookSituation): HandOutlook {
	const hand = handPoints(situation.playerCards);
	const hasBlackjack = isNatural(hand) && !situation.isSplitHand;
	const dealer = dealerOutcomesFrom(situation.dealerCards, shoeOddsWithout(situation.cardsOut));

	const outlook: HandOutlook = {
		win: 0,
		push: 0,
		lose: 0,
	};

	for (const [dealerResult, probability] of dealer) {
		outlook[settle(hand, hasBlackjack, dealerResult)] += probability;
	}

	return outlook;
}
