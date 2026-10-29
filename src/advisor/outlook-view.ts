import { bestTotal, handPoints, isBust, isNatural, isSoft } from '@/game/cards';
import type { CardFace, Rank } from '@/game/cards';
import type { Hand } from '@/game/messages';
import { sideBetWins } from '@/game/side-bets';
import type { SideBetWin } from '@/game/side-bets';
import type { TableTracker } from '@/game/table-tracker';
import { DEALER_RESULTS, DealerResult, dealerOutcomesFrom } from '@/strategy/dealer';
import { handOutlook } from '@/strategy/outlook';
import type { HandOutlook } from '@/strategy/outlook';
import { shoeOddsWithout } from '@/strategy/shoe';

import { trackedShoeCards } from './shoe-view';

// How one hand at the table stands against the dealer right now.
export type HandStanding = {
	handIndex: number;
	cards: readonly CardFace[];
	// The best total, counting an ace as eleven when that does not bust the hand.
	total: number;
	// An ace is counting as eleven, so the hand is also worth ten less.
	isSoft: boolean;
	isBust: boolean;
	// The player is still acting on this hand, so its chances are not yet meaningful.
	isInPlay: boolean;
	// Chances if the hand stands as it is now.
	outlook: HandOutlook;
};

// Whose money rides on a seat: the player's own, the player's bet behind someone else, or neither.
export const SeatRole = {
	OWN: 'own',
	BEHIND: 'behind',
	OTHER: 'other',
} as const;

export type SeatRole = (typeof SeatRole)[keyof typeof SeatRole];

export type SeatOutlook = {
	seatNumber: number;
	role: SeatRole;
	hands: readonly HandStanding[];
	// Side bets placed on the seat that its first cards have already won.
	sideBetWins: readonly SideBetWin[];
};

export type DealerChance = {
	result: DealerResult;
	probability: number;
};

// Where the dealer's hand is headed from the cards showing now.
export type DealerOutlook = {
	cards: readonly CardFace[];
	total: number;
	isSoft: boolean;
	bustChance: number;
	// Every way the dealer can still finish, in order from 17 to a bust.
	chances: readonly DealerChance[];
};

export type SeatRoles = {
	ownSeats: readonly number[];
	betBehindSeats: readonly number[];
};

function ranksOf(hand: Hand): Rank[] {
	return hand.cards.map(card => card.rank);
}

// Cards known to have left the shoe: the whole shoe when it has been followed, otherwise this round.
function knownCardsOut(table: TableTracker): readonly Rank[] {
	return trackedShoeCards(table) ?? table.roundRanks();
}

function roleOf(seatNumber: number, roles: SeatRoles): SeatRole {
	if (roles.ownSeats.includes(seatNumber)) {
		return SeatRole.OWN;
	}

	return roles.betBehindSeats.includes(seatNumber) ? SeatRole.BEHIND : SeatRole.OTHER;
}

function describeStandings(
	hands: readonly Hand[],
	dealerCards: readonly Rank[],
	cardsOut: readonly Rank[]
): HandStanding[] {
	const standings: HandStanding[] = [];

	for (const [handIndex, hand] of hands.entries()) {
		if (hand.cards.length < 2) {
			continue;
		}

		const playerCards = ranksOf(hand);
		const points = handPoints(playerCards);

		standings.push({
			handIndex,
			cards: hand.cards,
			total: bestTotal(points),
			isSoft: isSoft(points),
			isBust: isBust(points),
			isInPlay: !hand.isDealingCompleted && !isBust(points) && !isNatural(points),
			outlook: handOutlook({
				playerCards,
				dealerCards,
				isSplitHand: hands.length > 1,
				cardsOut,
			}),
		});
	}

	return standings;
}

// Outlooks for every hand with at least two cards, once the dealer shows a card.
export function describeOutlooks(table: TableTracker, roles: SeatRoles): SeatOutlook[] {
	const dealerCards = table.dealerCards();

	if (dealerCards.length === 0) {
		return [];
	}

	const cardsOut = knownCardsOut(table);
	const [dealerUpCard] = table.dealerFaces();
	const outlooks: SeatOutlook[] = [];

	for (const seatNumber of table.seatsInPlay()) {
		const hands = describeStandings(table.handsAt(seatNumber), dealerCards, cardsOut);

		if (hands.length > 0) {
			outlooks.push({
				seatNumber,
				role: roleOf(seatNumber, roles),
				hands,
				sideBetWins: sideBetWins({
					startingCards: table.startingCardsAt(seatNumber),
					dealerUpCard,
					bets: table.sideBetsAt(seatNumber),
				}),
			});
		}
	}

	return outlooks;
}

// The dealer's chances of each finish from the cards they show.
export function dealerOutlook(cards: readonly CardFace[], cardsOut: readonly Rank[]): DealerOutlook {
	const dealerCards = cards.map(card => card.rank);
	const points = handPoints(dealerCards);
	const outcomes = dealerOutcomesFrom(dealerCards, shoeOddsWithout(cardsOut));

	const chances = DEALER_RESULTS.map(result => ({
		result,
		probability: outcomes.get(result) ?? 0,
	}));

	return {
		cards,
		total: bestTotal(points),
		isSoft: isSoft(points),
		bustChance: outcomes.get(DealerResult.BUST) ?? 0,
		chances: chances.filter(chance => chance.probability > 0),
	};
}

// Where the dealer is headed, once they show a card.
export function describeDealer(table: TableTracker): DealerOutlook | undefined {
	const cards = table.dealerFaces();

	if (cards.length === 0) {
		return undefined;
	}

	return dealerOutlook(cards, knownCardsOut(table));
}
