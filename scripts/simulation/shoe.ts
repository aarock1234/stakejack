import { Rank, RANKS } from '@/game/cards';
import { SHOE_SIZE, trueCount } from '@/strategy/betting';
import { TABLE_RULES } from '@/strategy/rules';

// A seeded random source, so every run of the simulation deals the same cards.
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;

		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
	};
}

function freshCards(): Rank[] {
	const cards: Rank[] = [];

	for (const rank of RANKS) {
		const copiesPerDeck = rank === Rank.TEN ? 16 : 4;

		for (let copy = 0; copy < copiesPerDeck * TABLE_RULES.deckCount; copy += 1) {
			cards.push(rank);
		}
	}

	return cards;
}

const RESHUFFLE_AT_CARD = Math.round(SHOE_SIZE * TABLE_RULES.reshuffleShare);

// An eight-deck shoe dealt to the cut card, then reshuffled before the next round.
export class SimulatedShoe {
	readonly #random: () => number;
	#cards: Rank[] = [];
	#dealt = 0;

	constructor(random: () => number) {
		this.#random = random;
		this.#shuffle();
	}

	// The true count as a counter sees it before the round: every card dealt since the shuffle.
	get trueCount(): number {
		return trueCount(this.#cards.slice(0, this.#dealt));
	}

	// The dealer only reshuffles between rounds, once the cut card has come out.
	startRound(): void {
		if (this.#dealt >= RESHUFFLE_AT_CARD) {
			this.#shuffle();
		}
	}

	draw(): Rank {
		const card = this.#cards[this.#dealt];

		if (card === undefined) {
			throw new Error('the shoe ran out of cards');
		}

		this.#dealt += 1;

		return card;
	}

	#shuffle(): void {
		const cards = freshCards();

		for (let index = cards.length - 1; index > 0; index -= 1) {
			const swap = Math.floor(this.#random() * (index + 1));
			const card = cards[index];
			const other = cards[swap];

			if (card !== undefined && other !== undefined) {
				cards[index] = other;
				cards[swap] = card;
			}
		}

		this.#cards = cards;
		this.#dealt = 0;
	}
}
