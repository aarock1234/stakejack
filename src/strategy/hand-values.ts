import { addCard, bestTotal, EMPTY_HAND, isBust, Rank } from '@/game/cards';
import type { HandPoints } from '@/game/cards';

import { DealerResult } from './dealer';
import type { DealerOutcomes } from './dealer';
import type { ShoeOdds } from './shoe';

// Expected profit of each play, measured in units of the hand's original stake. A dealer blackjack beats
// every player hand that is still standing, including doubled and split hands, which is what the ten-up
// no-peek rule means for the player.
export class HandValues {
	readonly #odds: ShoeOdds;
	readonly #dealer: DealerOutcomes;
	readonly #playOnCache = new Map<string, number>();

	constructor(odds: ShoeOdds, dealer: DealerOutcomes) {
		this.#odds = odds;
		this.#dealer = dealer;
	}

	stand(hand: HandPoints): number {
		if (isBust(hand)) {
			return -1;
		}

		const playerTotal = bestTotal(hand);
		let expectedValue = 0;

		for (const [result, probability] of this.#dealer) {
			expectedValue += probability * standingResult(playerTotal, result);
		}

		return expectedValue;
	}

	// Take one card, then keep playing the best of hitting and standing.
	hit(hand: HandPoints): number {
		return this.#drawOne(hand, nextHand => this.#playOn(nextHand));
	}

	// Double the stake for exactly one more card.
	double(hand: HandPoints): number {
		return 2 * this.#drawOne(hand, nextHand => this.stand(nextHand));
	}

	// Split once: each new hand gets a second card and plays on its own stake. Split aces receive one card
	// and must stand; other split hands may hit or double but not split again.
	split(pairRank: Rank): number {
		const splitHand = addCard(EMPTY_HAND, pairRank);

		const singleHandValue = this.#drawOne(splitHand, nextHand => {
			if (pairRank === Rank.ACE) {
				return this.stand(nextHand);
			}

			return Math.max(this.stand(nextHand), this.hit(nextHand), this.double(nextHand));
		});

		return 2 * singleHandValue;
	}

	#drawOne(hand: HandPoints, valueAfterDraw: (nextHand: HandPoints) => number): number {
		let expectedValue = 0;

		for (const [rank, probability] of this.#odds) {
			expectedValue += probability * valueAfterDraw(addCard(hand, rank));
		}

		return expectedValue;
	}

	#playOn(hand: HandPoints): number {
		if (isBust(hand)) {
			return -1;
		}

		const key = `${hand.hardTotal}:${hand.hasAce}`;
		const cached = this.#playOnCache.get(key);

		if (cached !== undefined) {
			return cached;
		}

		const standValue = this.stand(hand);
		const value = bestTotal(hand) === 21 ? standValue : Math.max(standValue, this.hit(hand));

		this.#playOnCache.set(key, value);

		return value;
	}
}

function standingResult(playerTotal: number, dealerResult: DealerResult): number {
	if (dealerResult === DealerResult.BUST) {
		return 1;
	}

	if (dealerResult === DealerResult.BLACKJACK) {
		return -1;
	}

	return Math.sign(playerTotal - dealerResult);
}
