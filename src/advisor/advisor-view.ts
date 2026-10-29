import type { Wallet } from '@/game/api-responses';
import { Rank } from '@/game/cards';
import type { CardFace } from '@/game/cards';
import type { DecisionOffer, Hand } from '@/game/messages';
import type { TableTracker } from '@/game/table-tracker';
import { adviseHand, adviseInsurance } from '@/strategy/advice';
import type { Action, DecisionSituation, HandAdvice, InsuranceAdvice } from '@/strategy/advice';
import { adviseBet } from '@/strategy/betting';
import type { BetAdvice } from '@/strategy/betting';

import { describeDealer, describeOutlooks } from './outlook-view';
import type { DealerOutlook, SeatOutlook, SeatRoles } from './outlook-view';
import { EMPTY_SESSION } from './session-tracker';
import type { SessionSummary } from './session-tracker';
import { currentTrueCount, describeShoe, trackedShoeCards, UNTRACKED_SHOE } from './shoe-view';
import type { ShoeSummary } from './shoe-view';

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
	// The player only bets behind this hand, so its owner makes the moves.
	isBetBehind: boolean;
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

export type AdvisorView = {
	status: AdvisorStatus;
	wallet?: Wallet;
	session: SessionSummary;
	shoe: ShoeSummary;
	bet?: BetRecommendation;
	insurance?: InsuranceAdvice;
	decisions: readonly HandDecision[];
	outlooks: readonly SeatOutlook[];
	dealer?: DealerOutlook;
};

export const CONNECTING_VIEW: AdvisorView = {
	status: AdvisorStatus.CONNECTING,
	session: EMPTY_SESSION,
	shoe: UNTRACKED_SHOE,
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

// A seat the player has money on: their own, or one they bet behind.
type PlayedSeat = {
	seatNumber: number;
	isBetBehind: boolean;
};

function describeSeatDecisions(table: TableTracker, seat: PlayedSeat, round: RoundContext): HandDecision[] {
	const { seatNumber } = seat;

	// The cash out quoted on a hand is priced on its owner's main bet, even for players betting behind.
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
			isBetBehind: seat.isBetBehind,
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

function describeBet(table: TableTracker): BetRecommendation | undefined {
	const { wallet, limits } = table;

	if (!table.isBettingOpen || !wallet || !limits) {
		return undefined;
	}

	const count = currentTrueCount(table);

	return {
		...adviseBet({
			balance: wallet.balance,
			limits,
			trueCount: count,
		}),
		trueCount: count,
	};
}

// The player's own seats first, then any they bet behind.
function describePlayedSeats(roles: SeatRoles): PlayedSeat[] {
	const owned = roles.ownSeats.map(seatNumber => ({
		seatNumber,
		isBetBehind: false,
	}));

	const behind = roles.betBehindSeats.map(seatNumber => ({
		seatNumber,
		isBetBehind: true,
	}));

	return [...owned, ...behind];
}

export function describeTable(table: TableTracker, session: SessionSummary): AdvisorView {
	if (!table.hasGameTraffic) {
		return CONNECTING_VIEW;
	}

	const seats = table.ownSeats();

	const roles: SeatRoles = {
		ownSeats: seats,
		betBehindSeats: table.betBehindSeats(),
	};

	// What every view shares, seated or not.
	const tableView = {
		wallet: table.wallet,
		session,
		shoe: describeShoe(table),
		bet: describeBet(table),
		outlooks: describeOutlooks(table, roles),
		dealer: describeDealer(table),
	};

	const playedSeats = describePlayedSeats(roles);

	if (playedSeats.length === 0) {
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
		? playedSeats.flatMap(seat =>
				describeSeatDecisions(table, seat, {
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
