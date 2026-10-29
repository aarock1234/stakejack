import { z } from 'zod';

import { BookStrategy } from '@/strategy/book-strategy';

import { playRound } from './simulation/round';
import type { SeatOutcome } from './simulation/round';
import { seededRandom, SimulatedShoe } from './simulation/shoe';
import { SESSION_LENGTHS, Tally } from './simulation/tally';
import type { TallySummary } from './simulation/tally';

// Deals millions of rounds of Pragmatic Play's live blackjack, with both side bets on every seat, and
// compares ways of splitting a bet between Perfect Pairs, the main hand, and 21+3. It also shows what
// each bet returns at each true count, to see whether counting helps the side bets. Usage:
// pnpm tsx scripts/bet-mix-simulation.ts [rounds]

const DEFAULT_ROUNDS = 2_000_000;
const SEED = 21;

const roundsSchema = z.coerce.number().int().positive().default(DEFAULT_ROUNDS);

// Units on each bet per round, written Perfect Pairs : main : 21+3 as on the table.
type BetMix = {
	perfectPairs: number;
	main: number;
	twentyOnePlusThree: number;
};

const BET_MIXES: readonly BetMix[] = [
	{
		perfectPairs: 0,
		main: 1,
		twentyOnePlusThree: 0,
	},
	{
		perfectPairs: 2,
		main: 8,
		twentyOnePlusThree: 1,
	},
	{
		perfectPairs: 1,
		main: 8,
		twentyOnePlusThree: 1,
	},
	{
		perfectPairs: 1,
		main: 4,
		twentyOnePlusThree: 1,
	},
	{
		perfectPairs: 1,
		main: 1,
		twentyOnePlusThree: 1,
	},
	{
		perfectPairs: 1,
		main: 0,
		twentyOnePlusThree: 0,
	},
	{
		perfectPairs: 0,
		main: 0,
		twentyOnePlusThree: 1,
	},
];

function mixName(mix: BetMix): string {
	return `${mix.perfectPairs}:${mix.main}:${mix.twentyOnePlusThree}`;
}

function mixStake(mix: BetMix): number {
	return mix.perfectPairs + mix.main + mix.twentyOnePlusThree;
}

function mixProfit(mix: BetMix, outcome: SeatOutcome): number {
	return (
		mix.perfectPairs * outcome.perfectPairs +
		mix.main * outcome.main +
		mix.twentyOnePlusThree * outcome.twentyOnePlusThree
	);
}

// Rounds grouped by the true count before the deal, from -2 and below to +3 and above.
const COUNT_BUCKETS = [-2, -1, 0, 1, 2, 3] as const;

type CountBucket = (typeof COUNT_BUCKETS)[number];

function countBucket(trueCount: number): CountBucket {
	const rounded = Math.round(trueCount);

	return COUNT_BUCKETS.find(bucket => bucket >= rounded) ?? 3;
}

// The average result of every seat's bets at one true count.
class BucketReturns {
	seatsDealt = 0;
	main = 0;
	perfectPairs = 0;
	twentyOnePlusThree = 0;

	note(outcome: SeatOutcome): void {
		this.seatsDealt += 1;
		this.main += outcome.main;
		this.perfectPairs += outcome.perfectPairs;
		this.twentyOnePlusThree += outcome.twentyOnePlusThree;
	}
}

function formatPercent(fraction: number): string {
	const sign = fraction > 0 ? '+' : '';

	return `${sign}${(fraction * 100).toFixed(2)}%`;
}

function mixLine(mix: BetMix, summary: TallySummary): string {
	const sessions = SESSION_LENGTHS.map(length => {
		const share = summary.shareOfSessionsAhead.get(length) ?? 0;

		return `${(share * 100).toFixed(1)}%`.padStart(10);
	});

	return [
		mixName(mix).padEnd(8),
		String(mixStake(mix)).padStart(6),
		`${formatPercent(summary.returnPerUnit)} ± ${(summary.returnMargin * 100).toFixed(2)}%`.padStart(18),
		summary.profitPer100Rounds.toFixed(2).padStart(12),
		...sessions,
	].join('  ');
}

function bucketLabel(bucket: CountBucket): string {
	if (bucket === COUNT_BUCKETS[0]) {
		return `${bucket} or less`;
	}

	if (bucket === 3) {
		return '+3 or more';
	}

	return bucket > 0 ? `+${bucket}` : String(bucket);
}

function bucketLine(bucket: CountBucket, returns: BucketReturns, totalSeats: number): string {
	const share = returns.seatsDealt / totalSeats;

	return [
		bucketLabel(bucket).padEnd(12),
		`${(share * 100).toFixed(1)}%`.padStart(8),
		formatPercent(returns.main / returns.seatsDealt).padStart(10),
		formatPercent(returns.perfectPairs / returns.seatsDealt).padStart(14),
		formatPercent(returns.twentyOnePlusThree / returns.seatsDealt).padStart(10),
	].join('  ');
}

function main(): void {
	const rounds = roundsSchema.parse(process.argv[2]);
	const random = seededRandom(SEED);
	const shoe = new SimulatedShoe(random);
	const strategy = new BookStrategy();
	const mixTallies = BET_MIXES.map(() => new Tally());
	const bucketReturns = new Map(COUNT_BUCKETS.map(bucket => [bucket, new BucketReturns()]));
	let seatsDealt = 0;

	for (let round = 0; round < rounds; round += 1) {
		shoe.startRound();

		const bucket = countBucket(shoe.trueCount);
		const seatOutcomes = playRound(shoe, strategy);
		const [ownSeat] = seatOutcomes;

		for (const outcome of seatOutcomes) {
			bucketReturns.get(bucket)?.note(outcome);
			seatsDealt += 1;
		}

		if (!ownSeat) {
			continue;
		}

		for (const [index, mix] of BET_MIXES.entries()) {
			mixTallies[index]?.noteRound(mixStake(mix), mixProfit(mix, ownSeat));
		}
	}

	console.log(`${rounds.toLocaleString('en-US')} rounds, seed ${SEED}`);
	console.log('');
	console.log('By bet mix, Perfect Pairs : main : 21+3, one seat');
	console.log(
		[
			'mix'.padEnd(8),
			'units'.padStart(6),
			'return per unit'.padStart(18),
			'per 100 rds'.padStart(12),
			...SESSION_LENGTHS.map(length => `ahead@${length}`.padStart(10)),
		].join('  ')
	);

	for (const [index, mix] of BET_MIXES.entries()) {
		const tally = mixTallies[index];

		if (tally) {
			console.log(mixLine(mix, tally.summary()));
		}
	}

	console.log('');
	console.log('By true count before the deal, every seat');
	console.log(
		[
			'true count'.padEnd(12),
			'rounds'.padStart(8),
			'main'.padStart(10),
			'Perfect Pairs'.padStart(14),
			'21+3'.padStart(10),
		].join('  ')
	);

	for (const [bucket, returns] of bucketReturns) {
		console.log(bucketLine(bucket, returns, seatsDealt));
	}
}

main();
