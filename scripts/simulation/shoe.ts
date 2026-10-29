import { cardFromScanCode } from '@/game/cards';
import type { CardFace } from '@/game/cards';
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

// Scan codes name a card by its face, then its suit: "JH" is the jack of hearts.
const FACE_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'] as const;
const SUIT_CODES = ['H', 'D', 'C', 'S'] as const;

function freshCards(): CardFace[] {
	const cards: CardFace[] = [];

	for (let deck = 0; deck < TABLE_RULES.deckCount; deck += 1) {
		for (const face of FACE_CODES) {
			for (const suit of SUIT_CODES) {
				const card = cardFromScanCode(`${face}${suit}`);

				if (card) {
					cards.push(card);
				}
			}
		}
	}

	return cards;
}

const RESHUFFLE_AT_CARD = Math.round(SHOE_SIZE * TABLE_RULES.reshuffleShare);

// An eight-deck shoe dealt to the cut card, then reshuffled before the next round.
export class SimulatedShoe {
	readonly #random: () => number;
	#cards: CardFace[] = [];
	#dealt = 0;

	constructor(random: () => number) {
		this.#random = random;
		this.#shuffle();
	}

	// The true count as a counter sees it before the round: every card dealt since the shuffle.
	get trueCount(): number {
		return trueCount(this.#cards.slice(0, this.#dealt).map(card => card.rank));
	}

	// The dealer only reshuffles between rounds, once the cut card has come out.
	startRound(): void {
		if (this.#dealt >= RESHUFFLE_AT_CARD) {
			this.#shuffle();
		}
	}

	draw(): CardFace {
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
