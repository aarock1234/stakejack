import type { Rank } from '@/game/cards';
import { PlayerMove } from '@/game/messages';
import type { Hand } from '@/game/messages';
import { BookStrategy } from '@/strategy/book-strategy';
import type { PlaySituation } from '@/strategy/book-strategy';

import { actionOf } from './player-moves';

// How closely one player's moves have followed book strategy since the table opened in this window.
export type PlayerRecord = {
	movesSeen: number;
	movesByTheBook: number;
};

export type PlayerRecords = ReadonlyMap<string, PlayerRecord>;

// One seat's hands as the game reports them, and who sits there.
export type ReviewedSeat = {
	seatNumber: number;
	ownerId: string;
	hands: readonly Hand[];
	dealerUpCard: Rank;
};

// What the player faced when they made the move the hand now reports. A split leaves each new hand with
// one card of the pair, so the pair is that card twice.
function situationBefore(hand: Hand, move: PlayerMove, seat: ReviewedSeat): PlaySituation | undefined {
	const cards = hand.cards.map(card => card.rank);
	const [firstCard] = cards;

	if (move === PlayerMove.SPLIT) {
		return firstCard === undefined
			? undefined
			: {
					cards: [firstCard, firstCard],
					dealerUpCard: seat.dealerUpCard,
					canDouble: true,
					canSplit: true,
				};
	}

	if (cards.length < 2) {
		return undefined;
	}

	const isStartingHand = cards.length === 2;

	return {
		cards,
		dealerUpCard: seat.dealerUpCard,
		canDouble: isStartingHand,
		canSplit: isStartingHand && seat.hands.length === 1 && firstCard === cards[1],
	};
}

// Watches every other player's moves and compares each with book strategy, so the player can pick whose
// hand to bet behind: a bet behind follows the seated player's decisions, mistakes included.
export class PlayerReview {
	readonly #book = new BookStrategy();
	readonly #records = new Map<string, PlayerRecord>();
	// Moves already judged this round. Seat snapshots repeat a move until the next card arrives.
	readonly #judged = new Set<string>();

	get records(): PlayerRecords {
		return this.#records;
	}

	startRound(): void {
		this.#judged.clear();
	}

	noteSeat(seat: ReviewedSeat): void {
		for (const [handIndex, hand] of seat.hands.entries()) {
			const move = hand.madeMove;

			// Cash out is the player's own call on their stake, not a playing decision.
			if (move === undefined || move === PlayerMove.CASH_OUT) {
				continue;
			}

			const key = `${seat.seatNumber}:${handIndex}:${hand.cards.length}`;
			const situation = situationBefore(hand, move, seat);

			if (this.#judged.has(key) || !situation) {
				continue;
			}

			this.#judged.add(key);
			this.#record(seat.ownerId, this.#book.moveFor(situation) === actionOf(move));
		}
	}

	#record(ownerId: string, isByTheBook: boolean): void {
		const previous = this.#records.get(ownerId);

		this.#records.set(ownerId, {
			movesSeen: (previous?.movesSeen ?? 0) + 1,
			movesByTheBook: (previous?.movesByTheBook ?? 0) + (isByTheBook ? 1 : 0),
		});
	}
}
