import { SEAT_COUNT, seatLabel } from '@/game/seats';

// Where a bettor's money goes for the coming round.
export type Bet = {
	seat: number;
	units: number;
};

export type RoundStart = {
	trueCount: number;
	random: () => number;
};

// One way of playing the table: which seat to bet on each round, how much, and how to react to results.
// Every bettor is paid from the same simulated rounds, so they are compared on identical cards.
export type Bettor = {
	name: string;
	// The bet for the coming round, or nothing to sit it out.
	nextBet(round: RoundStart): Bet | undefined;
	noteResult(profit: number): void;
};

// Seat names as the table labels them.
function seatName(seat: number): string {
	return `seat ${seatLabel(seat)}`;
}

function nextSeat(seat: number): number {
	return (seat + 1) % SEAT_COUNT;
}

export function stayingAt(seat: number): Bettor {
	return {
		name: `Stay in ${seatName(seat)}`,
		nextBet() {
			return {
				seat,
				units: 1,
			};
		},
		noteResult() {},
	};
}

// Moves through a fixed cycle of seats, one per round.
export function rotatingThrough(seats: readonly number[]): Bettor {
	let turn = 0;

	return {
		name: `Rotate ${seats.map(seatName).join(', ')}`,
		nextBet() {
			const seat = seats[turn % seats.length] ?? 0;

			turn += 1;

			return {
				seat,
				units: 1,
			};
		},
		noteResult() {},
	};
}

export function randomSeat(): Bettor {
	return {
		name: 'Random seat each round',
		nextBet(round) {
			return {
				seat: Math.floor(round.random() * SEAT_COUNT),
				units: 1,
			};
		},
		noteResult() {},
	};
}

// Changes seat after a losing round, or after a winning one, as players chasing a "hot seat" do.
export function movingAfter(outcome: 'loss' | 'win'): Bettor {
	let seat = 3;

	return {
		name: `Move one seat after a ${outcome}`,
		nextBet() {
			return {
				seat,
				units: 1,
			};
		},
		noteResult(profit) {
			const isLoss = profit < 0;
			const isWin = profit > 0;

			if ((outcome === 'loss' && isLoss) || (outcome === 'win' && isWin)) {
				seat = nextSeat(seat);
			}
		},
	};
}

// Watches without betting and only bets behind a seat once the true count reaches the threshold, which a
// bet behind allows without holding a seat of your own.
export function bettingBehindFrom(threshold: number): Bettor {
	return {
		name: `Bet behind only at true count +${threshold} or more`,
		nextBet(round) {
			if (round.trueCount < threshold) {
				return undefined;
			}

			return {
				seat: 0,
				units: 1,
			};
		},
		noteResult() {},
	};
}

// Bets every round, raising the stake as the true count climbs: 1 unit at +1 or less, then 2, 4, and 8.
export function spreadingByCount(): Bettor {
	return {
		name: 'Bet every round, 1 to 8 units by count',
		nextBet(round) {
			return {
				seat: 0,
				units: spreadUnits(round.trueCount),
			};
		},
		noteResult() {},
	};
}

function spreadUnits(trueCount: number): number {
	if (trueCount >= 4) {
		return 8;
	}

	if (trueCount >= 3) {
		return 4;
	}

	return trueCount >= 2 ? 2 : 1;
}
