import { BetKind } from '@/game/bets';
import type { PlacedBet } from '@/game/bets';
import type { Hand } from '@/game/messages';
import type { Action } from '@/strategy/advice';
import { SIDE_BET_RETURNS } from '@/strategy/betting';

import type { HandDecision } from './advisor-view';
import { actionOf } from './player-moves';

// How closely the player's own moves followed the advice.
export type MoveReview = {
	movesPlayed: number;
	movesMatched: number;
	// What the moves that went against the advice gave up on average, in money.
	cost: number;
};

// One settled round the player bet on: everything staked, everything paid back, and the difference.
export type RoundResult = {
	wagered: number;
	paid: number;
	net: number;
};

// The rounds played from one seat. A round counts for the seat the player sat at, bets behind included.
export type SeatResult = {
	seatNumber: number;
	roundsPlayed: number;
	wagered: number;
	net: number;
};

// Everything bet and won since the table opened in this window.
export type SessionSummary = {
	// The most recent round the player bet on, once it has been paid.
	lastRound?: RoundResult;
	roundsPlayed: number;
	wagered: number;
	net: number;
	// What the bets were worth on average, given the count when each went down and the moves played.
	expected: number;
	moves: MoveReview;
	// Every seat the player has played from, in seat order.
	bySeat: readonly SeatResult[];
};

export const EMPTY_SESSION: SessionSummary = {
	roundsPlayed: 0,
	wagered: 0,
	net: 0,
	expected: 0,
	bySeat: [],
	moves: {
		movesPlayed: 0,
		movesMatched: 0,
		cost: 0,
	},
};

type Stake = {
	amount: number;
	expectedValue: number;
};

// The advice standing on one of the player's hands, and what the hand is staked at.
type OfferedAdvice = {
	decision: HandDecision;
	stake: number | undefined;
};

// Hands and bets on the table are told apart by seat, and by hand once a pair is split.
function handKey(seatNumber: number, handIndex: number): string {
	return `${seatNumber}:${handIndex}`;
}

function stakeKey(bet: PlacedBet): string {
	return `${handKey(bet.seatNumber, bet.handIndex)}:${bet.kind}:${bet.isBehind}`;
}

// Main-game stakes carry the shoe's edge; the side bets keep their own published return.
function expectedReturnRate(kind: BetKind, edge: number): number {
	switch (kind) {
		case BetKind.MAIN:
		case BetKind.DOUBLE:
		case BetKind.SPLIT:
			return edge;

		case BetKind.PERFECT_PAIRS:
			return SIDE_BET_RETURNS.perfectPairs - 1;

		case BetKind.TWENTY_ONE_PLUS_THREE:
			return SIDE_BET_RETURNS.twentyOnePlusThree - 1;
	}
}

function sumOf(stakes: Iterable<Stake>, read: (stake: Stake) => number): number {
	let total = 0;

	for (const stake of stakes) {
		total += read(stake);
	}

	return total;
}

// Adds one settled round to the results of the seat it was played from.
function withSeatRound(bySeat: readonly SeatResult[], seatNumber: number, round: RoundResult): SeatResult[] {
	const previous = bySeat.find(seat => seat.seatNumber === seatNumber);
	const others = bySeat.filter(seat => seat.seatNumber !== seatNumber);

	const updated: SeatResult = {
		seatNumber,
		roundsPlayed: (previous?.roundsPlayed ?? 0) + 1,
		wagered: (previous?.wagered ?? 0) + round.wagered,
		net: (previous?.net ?? 0) + round.net,
	};

	return [...others, updated].toSorted((left, right) => left.seatNumber - right.seatNumber);
}

// What going against the advice gave up on a hand: the best move's value minus the chosen one's, on
// the hand's stake. Unknown when the move was not among the options shown.
function moveCost(offered: OfferedAdvice, action: Action): number {
	const { advice } = offered.decision;
	const chosen = advice.options.find(option => option.action === action);

	if (!chosen || offered.stake === undefined) {
		return 0;
	}

	return (advice.best.expectedValue - chosen.expectedValue) * offered.stake;
}

// Keeps the running totals for the player's session: what each round staked and paid back, and how each
// of their moves compared with the advice they were shown.
export class SessionTracker {
	readonly #roundStakes = new Map<string, Map<string, Stake>>();
	// The seat the player sat at in each unsettled round, by round.
	readonly #roundSeats = new Map<string, number>();
	readonly #offeredAdvice = new Map<string, OfferedAdvice>();
	#summary: SessionSummary = EMPTY_SESSION;

	get summary(): SessionSummary {
		return this.#summary;
	}

	// A bet the player placed, valued at the edge the shoe gave when it went down. A restated bet
	// replaces the earlier one.
	noteBet(bet: PlacedBet, edge: number): void {
		const stakes = this.#roundStakes.get(bet.gameId) ?? new Map<string, Stake>();

		if (bet.kind === BetKind.MAIN && !bet.isBehind) {
			this.#roundSeats.set(bet.gameId, bet.seatNumber);
		}

		stakes.set(stakeKey(bet), {
			amount: bet.amount,
			expectedValue: bet.amount * expectedReturnRate(bet.kind, edge),
		});

		this.#roundStakes.set(bet.gameId, stakes);
	}

	// The round settled and paid the player back this much, stakes included.
	noteRoundPaid(gameId: string, amount: number): void {
		const stakes = this.#roundStakes.get(gameId);

		if (!stakes) {
			return;
		}

		const seatNumber = this.#roundSeats.get(gameId);

		this.#roundStakes.delete(gameId);
		this.#roundSeats.delete(gameId);

		const wagered = sumOf(stakes.values(), stake => stake.amount);
		const expected = sumOf(stakes.values(), stake => stake.expectedValue);

		const round: RoundResult = {
			wagered,
			paid: amount,
			net: amount - wagered,
		};

		const { bySeat } = this.#summary;

		this.#summary = {
			...this.#summary,
			lastRound: round,
			roundsPlayed: this.#summary.roundsPlayed + 1,
			wagered: this.#summary.wagered + round.wagered,
			net: this.#summary.net + round.net,
			expected: this.#summary.expected + expected,
			bySeat: seatNumber === undefined ? bySeat : withSeatRound(bySeat, seatNumber, round),
		};
	}

	// Remembers the advice standing on each of the player's own hands, so the move they make next can be
	// compared with it.
	noteOfferedAdvice(decisions: readonly HandDecision[], stakeAt: (seatNumber: number) => number | undefined): void {
		for (const decision of decisions) {
			if (decision.isBetBehind) {
				continue;
			}

			this.#offeredAdvice.set(handKey(decision.seatNumber, decision.handIndex), {
				decision,
				stake: stakeAt(decision.seatNumber),
			});
		}
	}

	// Looks for moves the game has carried out on one of the player's own seats.
	noteHands(seatNumber: number, hands: readonly Hand[]): void {
		for (const [handIndex, hand] of hands.entries()) {
			const key = handKey(seatNumber, handIndex);
			const offered = this.#offeredAdvice.get(key);

			if (!hand.madeMove || !offered) {
				continue;
			}

			this.#offeredAdvice.delete(key);
			this.#reviewMove(offered, actionOf(hand.madeMove));
		}
	}

	// Advice from the last round no longer applies to anything.
	startRound(): void {
		this.#offeredAdvice.clear();
	}

	#reviewMove(offered: OfferedAdvice, action: Action): void {
		const isMatch = action === offered.decision.advice.best.action;
		const cost = isMatch ? 0 : moveCost(offered, action);
		const { moves } = this.#summary;

		this.#summary = {
			...this.#summary,
			expected: this.#summary.expected - cost,
			moves: {
				movesPlayed: moves.movesPlayed + 1,
				movesMatched: moves.movesMatched + (isMatch ? 1 : 0),
				cost: moves.cost + cost,
			},
		};
	}
}
