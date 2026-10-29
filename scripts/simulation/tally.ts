// Short sessions are judged by how often a stretch of this many rounds bet ends ahead.
export const SESSION_LENGTHS = [100, 1_000] as const;

export type SessionLength = (typeof SESSION_LENGTHS)[number];

// Sessions of one length, played back to back from the bettor's rounds.
class SessionTally {
	readonly #length: SessionLength;
	#roundsSoFar = 0;
	#profitSoFar = 0;
	#sessions = 0;
	#sessionsAhead = 0;

	constructor(length: SessionLength) {
		this.#length = length;
	}

	get shareAhead(): number {
		return this.#sessions === 0 ? 0 : this.#sessionsAhead / this.#sessions;
	}

	noteRound(profit: number): void {
		this.#roundsSoFar += 1;
		this.#profitSoFar += profit;

		if (this.#roundsSoFar < this.#length) {
			return;
		}

		this.#sessions += 1;

		if (this.#profitSoFar > 0) {
			this.#sessionsAhead += 1;
		}

		this.#roundsSoFar = 0;
		this.#profitSoFar = 0;
	}
}

export type TallySummary = {
	roundsBet: number;
	// Profit per unit staked, as a fraction, and its 95% margin of error.
	returnPerUnit: number;
	returnMargin: number;
	// Profit for every 100 rounds dealt at the table, whether the bettor played them or not.
	profitPer100Rounds: number;
	shareOfSessionsAhead: ReadonlyMap<SessionLength, number>;
};

// Keeps one bettor's running results across every round dealt.
export class Tally {
	#roundsDealt = 0;
	#roundsBet = 0;
	#unitsStaked = 0;
	#profit = 0;
	#profitSquares = 0;
	readonly #sessions = SESSION_LENGTHS.map(length => new SessionTally(length));

	// A round the bettor sat out still counts towards the rounds dealt.
	noteRound(unitsStaked: number, profit: number): void {
		this.#roundsDealt += 1;
		this.#profit += profit;
		this.#profitSquares += profit * profit;

		if (unitsStaked === 0) {
			return;
		}

		this.#roundsBet += 1;
		this.#unitsStaked += unitsStaked;

		for (const session of this.#sessions) {
			session.noteRound(profit);
		}
	}

	summary(): TallySummary {
		const meanProfit = this.#profit / this.#roundsDealt;
		const variance = this.#profitSquares / this.#roundsDealt - meanProfit * meanProfit;
		const standardError = Math.sqrt(variance / this.#roundsDealt);
		const roundsPerUnit = this.#roundsDealt / this.#unitsStaked;

		return {
			roundsBet: this.#roundsBet,
			returnPerUnit: this.#profit / this.#unitsStaked,
			returnMargin: 1.96 * standardError * roundsPerUnit,
			profitPer100Rounds: meanProfit * 100,
			shareOfSessionsAhead: new Map(
				SESSION_LENGTHS.map((length, index) => [length, this.#sessions[index]?.shareAhead ?? 0])
			),
		};
	}
}
