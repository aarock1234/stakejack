import { z } from 'zod';

import { BookStrategy } from '@/strategy/book-strategy';

import {
	bettingBehindFrom,
	movingAfter,
	randomSeat,
	rotatingThrough,
	spreadingByCount,
	stayingAt,
} from './simulation/bettors';
import type { Bettor } from './simulation/bettors';
import { playRound } from './simulation/round';
import { SimulatedShoe, seededRandom } from './simulation/shoe';
import { SESSION_LENGTHS, Tally } from './simulation/tally';
import type { TallySummary } from './simulation/tally';

// Deals millions of rounds of Pragmatic Play's live blackjack at a full table, with every player on book
// strategy, and pays a set of bettors from the very same rounds: staying in one seat, swapping seats in
// different ways, and betting behind only when the count is high. Usage:
// pnpm tsx scripts/seat-simulation.ts [rounds]

const DEFAULT_ROUNDS = 2_000_000;
const SEED = 21;

const roundsSchema = z.coerce.number().int().positive().default(DEFAULT_ROUNDS);

const BETTORS: readonly Bettor[] = [
	stayingAt(0),
	stayingAt(3),
	stayingAt(6),
	rotatingThrough([3, 6, 0]),
	randomSeat(),
	movingAfter('loss'),
	movingAfter('win'),
	spreadingByCount(),
	bettingBehindFrom(1),
	bettingBehindFrom(2),
	bettingBehindFrom(3),
];

function formatPercent(fraction: number): string {
	const sign = fraction > 0 ? '+' : '';

	return `${sign}${(fraction * 100).toFixed(2)}%`;
}

function reportLine(name: string, summary: TallySummary): string {
	const sessions = SESSION_LENGTHS.map(length => {
		const share = summary.shareOfSessionsAhead.get(length) ?? 0;

		return `${(share * 100).toFixed(1)}%`.padStart(8);
	});

	return [
		name.padEnd(42),
		summary.roundsBet.toLocaleString('en-US').padStart(10),
		`${formatPercent(summary.returnPerUnit)} ± ${(summary.returnMargin * 100).toFixed(2)}%`.padStart(18),
		summary.profitPer100Rounds.toFixed(2).padStart(10),
		...sessions,
	].join('  ');
}

function main(): void {
	const rounds = roundsSchema.parse(process.argv[2]);
	const random = seededRandom(SEED);
	const shoe = new SimulatedShoe(random);
	const strategy = new BookStrategy();
	const tallies = BETTORS.map(() => new Tally());

	for (let round = 0; round < rounds; round += 1) {
		shoe.startRound();

		const start = {
			trueCount: shoe.trueCount,
			random,
		};

		const bets = BETTORS.map(bettor => bettor.nextBet(start));
		const seatOutcomes = playRound(shoe, strategy);

		for (const [index, bettor] of BETTORS.entries()) {
			const bet = bets[index];
			const profit = bet ? (seatOutcomes[bet.seat]?.main ?? 0) * bet.units : 0;

			tallies[index]?.noteRound(bet?.units ?? 0, profit);

			if (bet) {
				bettor.noteResult(profit);
			}
		}
	}

	const sessionHeadings = SESSION_LENGTHS.map(length => `ahead@${length}`.padStart(8));

	console.log(`${rounds.toLocaleString('en-US')} rounds, seed ${SEED}`);
	console.log(
		[
			'bettor'.padEnd(42),
			'rounds bet'.padStart(10),
			'return per unit'.padStart(18),
			'per 100 rds'.padStart(10),
			...sessionHeadings,
		].join('  ')
	);

	for (const [index, bettor] of BETTORS.entries()) {
		const tally = tallies[index];

		if (tally) {
			console.log(reportLine(bettor.name, tally.summary()));
		}
	}
}

main();
