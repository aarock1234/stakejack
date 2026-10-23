// Blackjack only cares about point value, so ten, jack, queen, and king share one rank.
export const Rank = {
	ACE: 'A',
	TWO: '2',
	THREE: '3',
	FOUR: '4',
	FIVE: '5',
	SIX: '6',
	SEVEN: '7',
	EIGHT: '8',
	NINE: '9',
	TEN: 'T',
} as const;

export type Rank = (typeof Rank)[keyof typeof Rank];

export const RANKS: readonly Rank[] = Object.values(Rank);

// Pragmatic Play scan codes look like "JH6": rank, suit, then the deck the card came from.
const SCAN_CODE_RANKS: Readonly<Record<string, Rank>> = {
	'1': Rank.ACE,
	'2': Rank.TWO,
	'3': Rank.THREE,
	'4': Rank.FOUR,
	'5': Rank.FIVE,
	'6': Rank.SIX,
	'7': Rank.SEVEN,
	'8': Rank.EIGHT,
	'9': Rank.NINE,
	'0': Rank.TEN,
	J: Rank.TEN,
	Q: Rank.TEN,
	K: Rank.TEN,
};

export const Suit = {
	HEARTS: 'hearts',
	DIAMONDS: 'diamonds',
	CLUBS: 'clubs',
	SPADES: 'spades',
} as const;

export type Suit = (typeof Suit)[keyof typeof Suit];

const SCAN_CODE_SUITS: Readonly<Record<string, Suit>> = {
	H: Suit.HEARTS,
	D: Suit.DIAMONDS,
	C: Suit.CLUBS,
	S: Suit.SPADES,
};

// Scan codes write the ace as 1 and the ten as 0; every other face is printed as scanned.
const SCAN_CODE_FACES: Readonly<Record<string, string>> = {
	'1': 'A',
	'0': '10',
};

// A card as printed, alongside the rank blackjack scores it as: a queen of hearts is face "Q", rank ten.
export type CardFace = {
	rank: Rank;
	face: string;
	suit: Suit;
};

export function cardFromScanCode(scanCode: string): CardFace | undefined {
	const faceCode = scanCode.charAt(0);
	const rank = SCAN_CODE_RANKS[faceCode];
	const suit = SCAN_CODE_SUITS[scanCode.charAt(1)];

	if (!rank || !suit) {
		return undefined;
	}

	return {
		rank,
		face: SCAN_CODE_FACES[faceCode] ?? faceCode,
		suit,
	};
}

function pointValue(rank: Rank): number {
	if (rank === Rank.ACE) {
		return 1;
	}

	if (rank === Rank.TEN) {
		return 10;
	}

	return Number(rank);
}

// Everything needed to score a hand: aces counted as one, and whether one of them could count as eleven.
export type HandPoints = {
	hardTotal: number;
	hasAce: boolean;
	cardCount: number;
};

export const EMPTY_HAND: HandPoints = {
	hardTotal: 0,
	hasAce: false,
	cardCount: 0,
};

export function addCard(hand: HandPoints, rank: Rank): HandPoints {
	return {
		hardTotal: hand.hardTotal + pointValue(rank),
		hasAce: hand.hasAce || rank === Rank.ACE,
		cardCount: hand.cardCount + 1,
	};
}

export function handPoints(ranks: readonly Rank[]): HandPoints {
	return ranks.reduce(addCard, EMPTY_HAND);
}

// A hand is soft when one ace counts as eleven without busting.
export function isSoft(hand: HandPoints): boolean {
	return hand.hasAce && hand.hardTotal + 10 <= 21;
}

export function bestTotal(hand: HandPoints): number {
	return isSoft(hand) ? hand.hardTotal + 10 : hand.hardTotal;
}

export function isBust(hand: HandPoints): boolean {
	return hand.hardTotal > 21;
}

export function isNatural(hand: HandPoints): boolean {
	return hand.cardCount === 2 && bestTotal(hand) === 21;
}
