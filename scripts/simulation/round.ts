import { bestTotal, handPoints, isBust, isNatural, Rank } from '@/game/cards';
import type { HandPoints } from '@/game/cards';
import { Action } from '@/strategy/advice';

import type { BasicStrategy } from './basic-strategy';
import type { SimulatedShoe } from './shoe';

// Seats are numbered from 0 at the left of the table as players see it. Cards go out from the highest
// seat down, and players act in the same order, so seat 0 acts last.
export const SEAT_COUNT = 7;

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
	strategy: BasicStrategy;
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

		cards.push(table.shoe.draw());

		if (move === Action.DOUBLE) {
			return finished(cards, 2);
		}
	}
}

// One split per seat. Split aces take one card each and stand; other split hands play on, doubles
// allowed, and an ace and a ten after a split is an ordinary 21.
function playSplit(pairCard: Rank, table: RoundTable): FinishedHand[] {
	return [pairCard, pairCard].map(card => {
		const cards = [card, table.shoe.draw()];

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
		cards.push(shoe.draw());
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
	seatCards: Map<number, Rank[]>;
	dealerUpCard: Rank;
} {
	const seatCards = new Map<number, Rank[]>();

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

// Plays one round with every seat taken and every player on book strategy. Returns each seat's profit, in
// units of a one-unit main bet, indexed by seat number.
export function playRound(shoe: SimulatedShoe, strategy: BasicStrategy): number[] {
	const { seatCards, dealerUpCard } = dealStartingCards(shoe);

	// Behind an ace the dealer checks the hole card first, and a blackjack ends the round there.
	const peekedHoleCard = dealerUpCard === Rank.ACE ? shoe.draw() : undefined;

	const table: RoundTable = {
		shoe,
		strategy,
		dealerUpCard,
	};

	const seatHands = new Map<number, FinishedHand[]>();
	const isDealerBlackjack = peekedHoleCard === Rank.TEN;

	for (const seat of DEAL_ORDER) {
		const cards = seatCards.get(seat) ?? [];

		seatHands.set(seat, isDealerBlackjack ? [finishedStartingHand(cards)] : playSeat(cards, table));
	}

	const dealer = playDealer([dealerUpCard, peekedHoleCard ?? shoe.draw()], shoe);

	return Array.from(
		{
			length: SEAT_COUNT,
		},
		(_, seat) => (seatHands.get(seat) ?? []).reduce((total, hand) => total + settle(hand, dealer), 0)
	);
}
