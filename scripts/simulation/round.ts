import { BetKind } from '@/game/bets';
import { bestTotal, handPoints, isBust, isNatural, Rank } from '@/game/cards';
import type { CardFace, HandPoints } from '@/game/cards';
import { SEAT_COUNT } from '@/game/seats';
import { sideBetWinnings, sideBetWins } from '@/game/side-bets';
import type { SideBetWin } from '@/game/side-bets';
import { Action } from '@/strategy/advice';
import type { BookStrategy } from '@/strategy/book-strategy';

import type { SimulatedShoe } from './shoe';

// Seats are numbered as the game socket numbers them, from 0 at the left of the table as players see it.
// Cards go out from the highest down, and players act in the same order, so seat 0 acts last.

const DEAL_ORDER: readonly number[] = Array.from(
	{
		length: SEAT_COUNT,
	},
	(_, index) => SEAT_COUNT - 1 - index
);

type FinishedHand = {
	points: HandPoints;
	stake: number;
	isBlackjack: boolean;
};

type DealerHand = {
	points: HandPoints;
	isBlackjack: boolean;
};

type RoundTable = {
	shoe: SimulatedShoe;
	strategy: BookStrategy;
	dealerUpCard: Rank;
};

function finished(cards: readonly Rank[], stake: number): FinishedHand {
	return {
		points: handPoints(cards),
		stake,
		isBlackjack: false,
	};
}

// The starting hand as it stood when a peeked dealer blackjack ended the round.
function finishedStartingHand(cards: readonly Rank[]): FinishedHand {
	return {
		points: handPoints(cards),
		stake: 1,
		isBlackjack: isNatural(handPoints(cards)),
	};
}

// Plays a hand to the end by book strategy. Doubling is only allowed on a hand's first two cards.
function playOut(startingCards: readonly Rank[], table: RoundTable): FinishedHand {
	const cards = [...startingCards];

	for (;;) {
		const points = handPoints(cards);

		if (isBust(points) || bestTotal(points) === 21) {
			return finished(cards, 1);
		}

		const move = table.strategy.moveFor({
			cards,
			dealerUpCard: table.dealerUpCard,
			canDouble: cards.length === 2,
			canSplit: false,
		});

		if (move === Action.STAND) {
			return finished(cards, 1);
		}

		cards.push(table.shoe.draw().rank);

		if (move === Action.DOUBLE) {
			return finished(cards, 2);
		}
	}
}

// One split per seat. Split aces take one card each and stand; other split hands play on, doubles
// allowed, and an ace and a ten after a split is an ordinary 21.
function playSplit(pairCard: Rank, table: RoundTable): FinishedHand[] {
	return [pairCard, pairCard].map(card => {
		const cards = [card, table.shoe.draw().rank];

		return pairCard === Rank.ACE ? finished(cards, 1) : playOut(cards, table);
	});
}

function playSeat(startingCards: readonly Rank[], table: RoundTable): FinishedHand[] {
	const [first, second] = startingCards;

	if (isNatural(handPoints(startingCards))) {
		return [
			{
				points: handPoints(startingCards),
				stake: 1,
				isBlackjack: true,
			},
		];
	}

	const canSplit = first !== undefined && first === second;

	const move = table.strategy.moveFor({
		cards: startingCards,
		dealerUpCard: table.dealerUpCard,
		canDouble: true,
		canSplit,
	});

	if (move === Action.SPLIT && first !== undefined) {
		return playSplit(first, table);
	}

	return [playOut(startingCards, table)];
}

// The dealer stands on every 17, soft ones included.
function playDealer(startingCards: readonly Rank[], shoe: SimulatedShoe): DealerHand {
	const cards = [...startingCards];

	while (bestTotal(handPoints(cards)) < 17) {
		cards.push(shoe.draw().rank);
	}

	return {
		points: handPoints(cards),
		isBlackjack: isNatural(handPoints(startingCards)),
	};
}

// Profit on one hand, in units of the original bet. A dealer blackjack takes doubled and split stakes too,
// since behind a ten the hole card is only turned after everyone has played.
function settle(hand: FinishedHand, dealer: DealerHand): number {
	if (dealer.isBlackjack) {
		return hand.isBlackjack ? 0 : -hand.stake;
	}

	if (isBust(hand.points)) {
		return -hand.stake;
	}

	if (hand.isBlackjack) {
		return 1.5;
	}

	if (isBust(dealer.points)) {
		return hand.stake;
	}

	const playerTotal = bestTotal(hand.points);
	const dealerTotal = bestTotal(dealer.points);

	if (playerTotal === dealerTotal) {
		return 0;
	}

	return playerTotal > dealerTotal ? hand.stake : -hand.stake;
}

function dealStartingCards(shoe: SimulatedShoe): {
	seatCards: Map<number, CardFace[]>;
	dealerUpCard: CardFace;
} {
	const seatCards = new Map<number, CardFace[]>();

	for (const seat of DEAL_ORDER) {
		seatCards.set(seat, [shoe.draw()]);
	}

	const dealerUpCard = shoe.draw();

	for (const seat of DEAL_ORDER) {
		seatCards.get(seat)?.push(shoe.draw());
	}

	return {
		seatCards,
		dealerUpCard,
	};
}

// What one seat's bets came to, each in units of its own one-unit stake.
export type SeatOutcome = {
	main: number;
	perfectPairs: number;
	twentyOnePlusThree: number;
};

const ONE_UNIT_SIDE_BETS = new Map([
	[BetKind.PERFECT_PAIRS, 1],
	[BetKind.TWENTY_ONE_PLUS_THREE, 1],
]);

// A side bet pays its odds when it wins and loses its stake otherwise.
function sideBetProfit(wins: readonly SideBetWin[], bet: BetKind): number {
	const win = wins.find(candidate => candidate.bet === bet);

	return win ? sideBetWinnings(win) : -1;
}

function seatOutcome(startingCards: readonly CardFace[], dealerUpCard: CardFace, mainProfit: number): SeatOutcome {
	const wins = sideBetWins({
		startingCards,
		dealerUpCard,
		stakes: ONE_UNIT_SIDE_BETS,
	});

	return {
		main: mainProfit,
		perfectPairs: sideBetProfit(wins, BetKind.PERFECT_PAIRS),
		twentyOnePlusThree: sideBetProfit(wins, BetKind.TWENTY_ONE_PLUS_THREE),
	};
}

// Plays one round with every seat taken, every player on book strategy, and every seat on both side bets.
// Returns each seat's outcome, indexed by seat number.
export function playRound(shoe: SimulatedShoe, strategy: BookStrategy): SeatOutcome[] {
	const { seatCards, dealerUpCard } = dealStartingCards(shoe);

	// Behind an ace the dealer checks the hole card first, and a blackjack ends the round there.
	const peekedHoleCard = dealerUpCard.rank === Rank.ACE ? shoe.draw().rank : undefined;

	const table: RoundTable = {
		shoe,
		strategy,
		dealerUpCard: dealerUpCard.rank,
	};

	const seatHands = new Map<number, FinishedHand[]>();
	const isDealerBlackjack = peekedHoleCard === Rank.TEN;

	for (const seat of DEAL_ORDER) {
		const cards = (seatCards.get(seat) ?? []).map(card => card.rank);

		seatHands.set(seat, isDealerBlackjack ? [finishedStartingHand(cards)] : playSeat(cards, table));
	}

	const dealer = playDealer([dealerUpCard.rank, peekedHoleCard ?? shoe.draw().rank], shoe);

	return Array.from(
		{
			length: SEAT_COUNT,
		},
		(_, seat) => {
			const mainProfit = (seatHands.get(seat) ?? []).reduce((total, hand) => total + settle(hand, dealer), 0);

			return seatOutcome(seatCards.get(seat) ?? [], dealerUpCard, mainProfit);
		}
	);
}
