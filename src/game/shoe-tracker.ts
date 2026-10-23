import type { Rank } from './cards';
import type { DealtCard } from './messages';

// Every card seen from one shoe, keyed by round and sequence number, so it can be saved and resumed.
export type ShoeSnapshot = {
	shoeCode: string;
	cards: readonly (readonly [string, Rank])[];
};

// Remembers every card dealt from the current shoe. A count is only meaningful when the shoe was
// followed from its first card, either live or by resuming a snapshot saved earlier for the same shoe.
export class ShoeTracker {
	readonly #seenCards = new Map<string, Rank>();
	#shoeCode: string | undefined;
	#isTrackedFromStart = false;
	#isAwaitingHistory = false;

	get isTrackedFromStart(): boolean {
		return this.#isTrackedFromStart;
	}

	// Set when the table reports a shoe this tracker did not see begin; a saved snapshot may cover it.
	get isAwaitingHistory(): boolean {
		return this.#isAwaitingHistory;
	}

	get shoeCode(): string | undefined {
		return this.#shoeCode;
	}

	seenRanks(): Rank[] {
		return [...this.#seenCards.values()];
	}

	startNewShoe(shoeCode: string): void {
		this.#seenCards.clear();
		this.#shoeCode = shoeCode;
		this.#isTrackedFromStart = true;
		this.#isAwaitingHistory = false;
	}

	// Joining a table, or reconnecting to it, names the shoe already in play.
	identify(shoeCode: string): void {
		if (shoeCode === this.#shoeCode) {
			return;
		}

		this.#seenCards.clear();
		this.#shoeCode = shoeCode;
		this.#isTrackedFromStart = false;
		this.#isAwaitingHistory = true;
	}

	// Resumes the count from a saved snapshot of the same shoe. Cards already recorded this session are
	// kept, and duplicates collapse because both use the same keys.
	resume(snapshot: ShoeSnapshot | undefined): void {
		this.#isAwaitingHistory = false;

		if (!snapshot || snapshot.shoeCode !== this.#shoeCode || this.#isTrackedFromStart) {
			return;
		}

		for (const [key, rank] of snapshot.cards) {
			this.#seenCards.set(key, rank);
		}

		this.#isTrackedFromStart = true;
	}

	snapshot(): ShoeSnapshot | undefined {
		if (!this.#isTrackedFromStart || !this.#shoeCode) {
			return undefined;
		}

		return {
			shoeCode: this.#shoeCode,
			cards: [...this.#seenCards.entries()],
		};
	}

	// Seat snapshots repeat earlier cards, so each card is keyed by its round and sequence number.
	record(gameId: string, cards: readonly DealtCard[]): void {
		for (const card of cards) {
			this.#seenCards.set(`${gameId}:${card.sequence}`, card.rank);
		}
	}
}
