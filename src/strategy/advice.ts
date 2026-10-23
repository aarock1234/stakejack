import { handPoints, Rank } from '@/game/cards';

import { dealerOutcomes } from './dealer';
import { HandValues } from './hand-values';
import { shoeOddsWithout } from './shoe';

export const Action = {
	HIT: 'hit',
	STAND: 'stand',
	DOUBLE: 'double',
	SPLIT: 'split',
	CASH_OUT: 'cashOut',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

export type ActionValue = {
	action: Action;
	// Expected profit as a fraction of the hand's stake: 0.05 means +5%.
	expectedValue: number;
};

export type HandAdvice = {
	best: ActionValue;
	// Every available action, best first.
	options: readonly ActionValue[];
};

export type DecisionSituation = {
	playerCards: readonly Rank[];
	dealerUpCard: Rank;
	canDouble: boolean;
	canSplit: boolean;
	cashOut?: {
		// Pragmatic Play quotes the full amount returned, stake included.
		amount: number;
		stake: number;
	};
	// Every card known to have left the shoe, including this hand and the dealer's up card. Without it,
	// only those cards are removed, which reproduces book strategy.
	cardsOut?: readonly Rank[];
};

export function adviseHand(situation: DecisionSituation): HandAdvice {
	const cardsOut = situation.cardsOut ?? [...situation.playerCards, situation.dealerUpCard];
	const odds = shoeOddsWithout(cardsOut);
	const values = new HandValues(odds, dealerOutcomes(situation.dealerUpCard, odds));
	const hand = handPoints(situation.playerCards);

	const options: ActionValue[] = [
		{
			action: Action.STAND,
			expectedValue: values.stand(hand),
		},
		{
			action: Action.HIT,
			expectedValue: values.hit(hand),
		},
	];

	if (situation.canDouble) {
		options.push({
			action: Action.DOUBLE,
			expectedValue: values.double(hand),
		});
	}

	const [firstCard] = situation.playerCards;

	if (situation.canSplit && firstCard) {
		options.push({
			action: Action.SPLIT,
			expectedValue: values.split(firstCard),
		});
	}

	if (situation.cashOut && situation.cashOut.stake > 0) {
		options.push({
			action: Action.CASH_OUT,
			expectedValue: situation.cashOut.amount / situation.cashOut.stake - 1,
		});
	}

	const ranked = options.toSorted((left, right) => right.expectedValue - left.expectedValue);
	const [best] = ranked;

	if (!best) {
		throw new Error('no blackjack action was available');
	}

	return {
		best,
		options: ranked,
	};
}

export type InsuranceAdvice = {
	shouldInsure: boolean;
	// Expected profit per unit placed on the insurance bet, which pays 2 to 1 when the hole card is a ten.
	expectedValue: number;
};

// Cards out of the shoe include the player's hand and the dealer's ace. Insurance only pays when enough
// tens remain, which a high count can make true.
export function adviseInsurance(cardsOut: readonly Rank[]): InsuranceAdvice {
	const odds = shoeOddsWithout(cardsOut);
	const tenProbability = odds.get(Rank.TEN) ?? 0;
	const expectedValue = 3 * tenProbability - 1;

	return {
		shouldInsure: expectedValue > 0,
		expectedValue,
	};
}
