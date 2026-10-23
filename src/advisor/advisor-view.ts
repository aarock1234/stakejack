import type { Wallet } from '@/game/api-responses';
import { bestTotal, handPoints, isBust, isNatural, Rank } from '@/game/cards';
import type { CardFace } from '@/game/cards';
import type { DecisionOffer, Hand } from '@/game/messages';
import type { TableTracker } from '@/game/table-tracker';
import { adviseHand, adviseInsurance } from '@/strategy/advice';
import type { Action, DecisionSituation, HandAdvice, InsuranceAdvice } from '@/strategy/advice';
import { adviseBet, estimateEdge, SHOE_SIZE, trueCount } from '@/strategy/betting';
import type { BetAdvice } from '@/strategy/betting';
import { handOutlook } from '@/strategy/outlook';
import type { HandOutlook } from '@/strategy/outlook';

export const AdvisorStatus = {
	// No game traffic has been seen in this frame yet.
	CONNECTING: 'connecting',
	// The table is live, but none of its seats are known to belong to this player.
	WATCHING: 'watching',
	SEATED: 'seated',
} as const;

export type AdvisorStatus = (typeof AdvisorStatus)[keyof typeof AdvisorStatus];

export type HandDecision = {
	seatNumber: number;
	handIndex: number;
	isSplitHand: boolean;
	// The game is waiting on this hand now; other offered hands can only be decided in advance.
	isActive: boolean;
	canSplit: boolean;
	playerCards: readonly CardFace[];
	dealerUpCard: CardFace;
	// Based on the cards left in the shoe when it has been followed from the start, otherwise book strategy.
	advice: HandAdvice;
	// The book strategy move, present only when the remaining shoe changes the recommendation.
	bookAction?: Action;
};

export type BetRecommendation = BetAdvice & {
	// Omitted until a fresh shoe has been followed from its first card.
	trueCount?: number;
};

// How one hand at the table stands against the dealer right now.
export type HandStanding = {
	handIndex: number;
	total: number;
	isBust: boolean;
	// The player is still acting on this hand, so its chances are not yet meaningful.
	isInPlay: boolean;
	// Chances if the hand stands as it is now.
	outlook: HandOutlook;
};

export type SeatOutlook = {
	seatNumber: number;
	isOwnSeat: boolean;
	hands: readonly HandStanding[];
};

// The state of the shoe, shown whenever there is nothing to decide.
export type ShoeSummary = {
	// Omitted until a fresh shoe has been followed from its first card.
	trueCount?: number;
	cardsDealt: number;
	shoeSize: number;
	edge: number;
};

export type AdvisorView = {
	status: AdvisorStatus;
	wallet?: Wallet;
	// Profit or loss since the advisor first saw the balance.
	sessionChange?: number;
	shoe: ShoeSummary;
	bet?: BetRecommendation;
	insurance?: InsuranceAdvice;
	decisions: readonly HandDecision[];
	outlooks: readonly SeatOutlook[];
};

export const CONNECTING_VIEW: AdvisorView = {
	status: AdvisorStatus.CONNECTING,
	shoe: {
		cardsDealt: 0,
		shoeSize: SHOE_SIZE,
		edge: estimateEdge(undefined),
	},
	decisions: [],
	outlooks: [],
};

// What every piece of advice in a round shares: the dealer's up card and, when the shoe has been
// followed from its first card, every card dealt from it so far.
type RoundContext = {
	dealerUpCard: CardFace;
	shoeCardsOut?: readonly Rank[];
};

function ranksOf(hand: Hand): Rank[] {
	return hand.cards.map(card => card.rank);
}

function cashOutTerms(offer: DecisionOffer, stake: number | undefined): DecisionSituation['cashOut'] {
	if (offer.cashOut === undefined || stake === undefined) {
		return undefined;
	}

	return {
		amount: offer.cashOut,
		stake,
	};
}

// Advises from the remaining shoe when it is known, keeping the book move for comparison.
function adviseWithShoe(
	situation: DecisionSituation,
	round: RoundContext
): Pick<HandDecision, 'advice' | 'bookAction'> {
	const bookAdvice = adviseHand(situation);

	if (!round.shoeCardsOut) {
		return {
			advice: bookAdvice,
		};
	}

	const shoeAdvice = adviseHand({
		...situation,
		cardsOut: round.shoeCardsOut,
	});

	const isDifferentFromBook = shoeAdvice.best.action !== bookAdvice.best.action;

	return {
		advice: shoeAdvice,
		bookAction: isDifferentFromBook ? bookAdvice.best.action : undefined,
	};
}

function describeSeatDecisions(table: TableTracker, seatNumber: number, round: RoundContext): HandDecision[] {
	const stake = table.mainBetAt(seatNumber);
	const hands = table.handsAt(seatNumber);
	const decisions: HandDecision[] = [];

	for (const [handIndex, hand] of hands.entries()) {
		const offer = hand.decisionOffer;

		if (!offer) {
			continue;
		}

		const situation: DecisionSituation = {
			playerCards: ranksOf(hand),
			dealerUpCard: round.dealerUpCard.rank,
			canDouble: offer.canDouble,
			canSplit: offer.canSplit,
			cashOut: cashOutTerms(offer, stake),
		};

		decisions.push({
			seatNumber,
			handIndex,
			isSplitHand: hands.length > 1,
			isActive: hand.activeHand === true,
			canSplit: offer.canSplit,
			playerCards: hand.cards,
			dealerUpCard: round.dealerUpCard,
			...adviseWithShoe(situation, round),
		});
	}

	return decisions;
}

function isUntouchedStartingHand(hands: readonly Hand[]): boolean {
	const [firstHand] = hands;

	return hands.length === 1 && firstHand?.cards.length === 2 && !firstHand.isDealingCompleted;
}

// Insurance is offered while the dealer shows only an ace and the player has not yet acted.
function describeInsurance(
	dealerCards: readonly Rank[],
	seatHands: readonly (readonly Hand[])[],
	shoeCardsOut: readonly Rank[] | undefined
): InsuranceAdvice | undefined {
	const [upCard] = dealerCards;
	const startingHand = seatHands[0]?.[0];

	const isOfferWindow =
		upCard === Rank.ACE &&
		dealerCards.length === 1 &&
		seatHands.length > 0 &&
		seatHands.every(isUntouchedStartingHand);

	if (!isOfferWindow || !startingHand) {
		return undefined;
	}

	return adviseInsurance(shoeCardsOut ?? [...ranksOf(startingHand), Rank.ACE]);
}

function trackedShoeCards(table: TableTracker): Rank[] | undefined {
	return table.shoe.isTrackedFromStart ? table.shoe.seenRanks() : undefined;
}

// Outlooks for every hand with at least two cards, once the dealer shows a card.
function describeOutlooks(table: TableTracker, ownSeats: readonly number[]): SeatOutlook[] {
	const dealerCards = table.dealerCards();

	if (dealerCards.length === 0) {
		return [];
	}

	const cardsOut = trackedShoeCards(table) ?? table.roundRanks();
	const outlooks: SeatOutlook[] = [];

	for (const seatNumber of table.seatsInPlay()) {
		const hands = table.handsAt(seatNumber);
		const standings: HandStanding[] = [];

		for (const [handIndex, hand] of hands.entries()) {
			if (hand.cards.length < 2) {
				continue;
			}

			const playerCards = ranksOf(hand);
			const points = handPoints(playerCards);

			standings.push({
				handIndex,
				total: bestTotal(points),
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

		if (standings.length > 0) {
			outlooks.push({
				seatNumber,
				isOwnSeat: ownSeats.includes(seatNumber),
				hands: standings,
			});
		}
	}

	return outlooks;
}

function describeShoe(table: TableTracker): ShoeSummary {
	const shoeCards = trackedShoeCards(table);
	const count = shoeCards ? trueCount(shoeCards) : undefined;

	return {
		trueCount: count,
		cardsDealt: shoeCards?.length ?? 0,
		shoeSize: SHOE_SIZE,
		edge: estimateEdge(count),
	};
}

function describeBet(table: TableTracker): BetRecommendation | undefined {
	const { wallet, limits } = table;

	if (!table.isBettingOpen || !wallet || !limits) {
		return undefined;
	}

	const shoeCards = trackedShoeCards(table);
	const count = shoeCards ? trueCount(shoeCards) : undefined;

	return {
		...adviseBet({
			balance: wallet.balance,
			limits,
			trueCount: count,
		}),
		trueCount: count,
	};
}

export function describeTable(table: TableTracker): AdvisorView {
	if (!table.hasGameTraffic) {
		return CONNECTING_VIEW;
	}

	const seats = table.ownSeats();

	// What every view shares, seated or not.
	const tableView = {
		wallet: table.wallet,
		sessionChange: table.sessionChange,
		shoe: describeShoe(table),
		bet: describeBet(table),
		outlooks: describeOutlooks(table, seats),
	};

	if (seats.length === 0) {
		return {
			...tableView,
			status: AdvisorStatus.WATCHING,
			decisions: [],
		};
	}

	const dealerCards = table.dealerCards();
	const [dealerUpCard] = table.dealerFaces();
	const shoeCardsOut = trackedShoeCards(table);

	const decisions = dealerUpCard
		? seats.flatMap(seatNumber =>
				describeSeatDecisions(table, seatNumber, {
					dealerUpCard,
					shoeCardsOut,
				})
			)
		: [];

	const seatHands = seats.map(seatNumber => table.handsAt(seatNumber));

	return {
		...tableView,
		status: AdvisorStatus.SEATED,
		insurance: describeInsurance(dealerCards, seatHands, shoeCardsOut),
		decisions,
	};
}
