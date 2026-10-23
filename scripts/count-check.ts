import { Rank, RANKS } from '@/game/cards';
import { ShoeTracker } from '@/game/shoe-tracker';
import { estimateEdge, SHOE_SIZE, trueCount } from '@/strategy/betting';

// Deals shuffled eight-deck shoes through the real shoe tracker and checks the count against a direct tally.
// Usage: pnpm tsx scripts/count-check.ts

const SHOES = 2000;
// Pragmatic Play places the cut card around the middle of the shoe.
const PENETRATION = 0.5;

function freshShoe(): Rank[] {
	const shoe: Rank[] = [];

	for (const rank of RANKS) {
		const copies = rank === Rank.TEN ? 16 * 8 : 4 * 8;

		for (let copy = 0; copy < copies; copy += 1) {
			shoe.push(rank);
		}
	}

	for (let index = shoe.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(Math.random() * (index + 1));
		[shoe[index], shoe[swap]] = [shoe[swap] as Rank, shoe[index] as Rank];
	}

	return shoe;
}

function hiLo(rank: Rank): number {
	if (rank === Rank.TEN || rank === Rank.ACE) {
		return -1;
	}

	return rank === Rank.SEVEN || rank === Rank.EIGHT || rank === Rank.NINE ? 0 : 1;
}

let fullShoeImbalances = 0;
let trackerMismatches = 0;
let handsAtPlusTwo = 0;
let handsDealt = 0;
let maxTrueCount = 0;

for (let shoeIndex = 0; shoeIndex < SHOES; shoeIndex += 1) {
	const shoe = freshShoe();

	if (shoe.reduce((sum, rank) => sum + hiLo(rank), 0) !== 0) {
		fullShoeImbalances += 1;
	}

	const tracker = new ShoeTracker();
	tracker.startNewShoe('#test');

	let runningCount = 0;
	const cutCard = Math.floor(SHOE_SIZE * PENETRATION);

	// Six cards per round is a typical table: a few players and the dealer.
	for (let dealt = 0; dealt < cutCard; dealt += 6) {
		const round = shoe.slice(dealt, dealt + 6);

		tracker.record(
			`round-${dealt}`,
			round.map((rank, sequence) => ({
				rank,
				face: rank,
				suit: 'spades',
				sequence,
			}))
		);

		runningCount += round.reduce((sum, rank) => sum + hiLo(rank), 0);

		const expected = runningCount / Math.max((SHOE_SIZE - dealt - round.length) / 52, 0.5);
		const counted = trueCount(tracker.seenRanks());

		if (Math.abs(expected - counted) > 1e-9) {
			trackerMismatches += 1;
		}

		handsDealt += 1;
		maxTrueCount = Math.max(maxTrueCount, counted);

		if (counted >= 2) {
			handsAtPlusTwo += 1;
		}
	}
}

console.log(`full shoes that do not net to zero: ${fullShoeImbalances} of ${SHOES}`);
console.log(`tracker vs direct tally mismatches: ${trackerMismatches} of ${handsDealt} rounds`);
console.log(
	`rounds with true count +2 or more (edge ${(estimateEdge(2) * 100).toFixed(1)}% or better): ${((handsAtPlusTwo / handsDealt) * 100).toFixed(1)}%`
);
console.log(`highest true count seen: ${maxTrueCount.toFixed(1)}`);
