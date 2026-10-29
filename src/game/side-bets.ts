import { BetKind } from './bets';
import { Suit } from './cards';
import type { CardFace } from './cards';

// Perfect Pairs pays when the player's first two cards share a face: of the same suit, of the same colour,
// or of different colours.
export const PairHand = {
	PERFECT: 'perfect',
	COLOURED: 'coloured',
	MIXED: 'mixed',
} as const;

export type PairHand = (typeof PairHand)[keyof typeof PairHand];

// 21+3 pays when the player's first two cards and the dealer's up card make a three-card poker hand.
export const PokerHand = {
	SUITED_TRIPS: 'suitedTrips',
	STRAIGHT_FLUSH: 'straightFlush',
	THREE_OF_A_KIND: 'threeOfAKind',
	STRAIGHT: 'straight',
	FLUSH: 'flush',
} as const;

export type PokerHand = (typeof PokerHand)[keyof typeof PokerHand];

// Pragmatic Play's pay tables for both side bets, as winnings to one.
const PAIR_PAYOUTS: Readonly<Record<PairHand, number>> = {
	[PairHand.PERFECT]: 25,
	[PairHand.COLOURED]: 12,
	[PairHand.MIXED]: 6,
};

const POKER_PAYOUTS: Readonly<Record<PokerHand, number>> = {
	[PokerHand.SUITED_TRIPS]: 100,
	[PokerHand.STRAIGHT_FLUSH]: 40,
	[PokerHand.THREE_OF_A_KIND]: 30,
	[PokerHand.STRAIGHT]: 10,
	[PokerHand.FLUSH]: 5,
};

type SideBetPayout = {
	// Winnings to one: 5 means a flush wins five times the stake, which is returned on top.
	payout: number;
	stake: number;
};

export type SideBetWin = SideBetPayout &
	(
		| {
				bet: typeof BetKind.PERFECT_PAIRS;
				hand: PairHand;
		  }
		| {
				bet: typeof BetKind.TWENTY_ONE_PLUS_THREE;
				hand: PokerHand;
		  }
	);

// What a winning side bet pays on top of its stake.
export function sideBetWinnings(win: SideBetWin): number {
	return win.stake * win.payout;
}

// Where each face falls in a straight. The ace plays low, and also high after a king.
const FACE_ORDER: Readonly<Record<string, number>> = {
	A: 1,
	'2': 2,
	'3': 3,
	'4': 4,
	'5': 5,
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	J: 11,
	Q: 12,
	K: 13,
};

const ACE_HIGH = 14;

function isRed(card: CardFace): boolean {
	return card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
}

function pairHand(first: CardFace, second: CardFace): PairHand | undefined {
	if (first.face !== second.face) {
		return undefined;
	}

	if (first.suit === second.suit) {
		return PairHand.PERFECT;
	}

	return isRed(first) === isRed(second) ? PairHand.COLOURED : PairHand.MIXED;
}

function isRun(orders: readonly number[]): boolean {
	const [lowest, middle, highest] = orders.toSorted((left, right) => left - right);

	return lowest !== undefined && middle === lowest + 1 && highest === lowest + 2;
}

function isStraight(cards: readonly CardFace[]): boolean {
	const orders: number[] = [];

	for (const card of cards) {
		const order = FACE_ORDER[card.face];

		if (order === undefined) {
			return false;
		}

		orders.push(order);
	}

	const acesHigh = orders.map(order => (order === FACE_ORDER.A ? ACE_HIGH : order));

	return isRun(orders) || isRun(acesHigh);
}

function pokerHand(cards: readonly CardFace[]): PokerHand | undefined {
	const [first] = cards;

	if (!first) {
		return undefined;
	}

	const isFlush = cards.every(card => card.suit === first.suit);
	const isTrips = cards.every(card => card.face === first.face);

	if (isTrips) {
		return isFlush ? PokerHand.SUITED_TRIPS : PokerHand.THREE_OF_A_KIND;
	}

	if (isStraight(cards)) {
		return isFlush ? PokerHand.STRAIGHT_FLUSH : PokerHand.STRAIGHT;
	}

	return isFlush ? PokerHand.FLUSH : undefined;
}

export type SideBetSituation = {
	// The player's first two cards, as dealt before any split.
	startingCards: readonly CardFace[];
	dealerUpCard?: CardFace;
	// The stake on each side bet placed on the seat.
	stakes: ReadonlyMap<BetKind, number>;
};

// The side bets a seat has won, settled as soon as the cards they depend on are out.
export function sideBetWins(situation: SideBetSituation): SideBetWin[] {
	const [first, second] = situation.startingCards;
	const wins: SideBetWin[] = [];

	if (!first || !second) {
		return wins;
	}

	const pair = pairHand(first, second);
	const pairStake = situation.stakes.get(BetKind.PERFECT_PAIRS);

	if (pair && pairStake !== undefined) {
		wins.push({
			bet: BetKind.PERFECT_PAIRS,
			hand: pair,
			payout: PAIR_PAYOUTS[pair],
			stake: pairStake,
		});
	}

	const poker = situation.dealerUpCard ? pokerHand([first, second, situation.dealerUpCard]) : undefined;
	const pokerStake = situation.stakes.get(BetKind.TWENTY_ONE_PLUS_THREE);

	if (poker && pokerStake !== undefined) {
		wins.push({
			bet: BetKind.TWENTY_ONE_PLUS_THREE,
			hand: poker,
			payout: POKER_PAYOUTS[poker],
			stake: pokerStake,
		});
	}

	return wins;
}
