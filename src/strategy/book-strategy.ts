import { handPoints } from '@/game/cards';
import type { Rank } from '@/game/cards';
import { adviseHand } from './advice';
import type { Action } from './advice';

export type PlaySituation = {
	cards: readonly Rank[];
	dealerUpCard: Rank;
	canDouble: boolean;
	canSplit: boolean;
};

// Book strategy for the table rules, worked out by the extension's own engine the first time each
// situation comes up and remembered after that. Hands with the same total, softness, and options play
// alike, which is what a printed strategy card assumes too.
export class BookStrategy {
	readonly #moves = new Map<string, Action>();

	moveFor(situation: PlaySituation): Action {
		const key = situationKey(situation);
		const known = this.#moves.get(key);

		if (known) {
			return known;
		}

		const move = adviseHand({
			playerCards: situation.cards,
			dealerUpCard: situation.dealerUpCard,
			canDouble: situation.canDouble,
			canSplit: situation.canSplit,
		}).best.action;

		this.#moves.set(key, move);

		return move;
	}
}

function situationKey(situation: PlaySituation): string {
	const points = handPoints(situation.cards);
	const pair = situation.canSplit ? situation.cards[0] : 'none';

	return [
		points.hardTotal,
		points.hasAce,
		pair,
		situation.dealerUpCard,
		situation.canDouble,
		situation.canSplit,
	].join(':');
}
