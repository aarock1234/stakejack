import type { TableTracker } from '@/game/table-tracker';

import type { PlayerRecord, PlayerRecords } from './player-review';
import { currentEdge } from './shoe-view';

// A player is only judged once enough of their moves have been seen.
const MIN_MOVES_SEEN = 8;

// A seated player worth betting behind, and how often their moves have matched book strategy.
export type BetBehindSeat = {
	seatNumber: number;
	movesSeen: number;
	shareByTheBook: number;
};

// Whether to bet behind this round. A bet behind needs no seat, so a player can watch every round and only
// bet when the count gives them the edge. Simulating ten million rounds of these rules
// (scripts/seat-simulation.ts) gave +0.4% per unit bet from a true count of +1, +0.8% from +2, and +1.0%
// from +3, while betting every round from any seat lost 0.6%.
export type BetBehindAdvice = {
	isWorthBetting: boolean;
	// A seated player bets every round anyway, so sitting a round out is only advice for everyone else.
	hasOwnSeat: boolean;
	// Bets behind can only be placed while betting is open.
	isBettingOpen: boolean;
	// The other player whose decisions have followed the book most closely, once enough have been seen.
	seat?: BetBehindSeat;
};

function shareByTheBook(record: PlayerRecord): number {
	return record.movesByTheBook / record.movesSeen;
}

function isBetterSeat(candidate: BetBehindSeat, best: BetBehindSeat | undefined): boolean {
	if (!best) {
		return true;
	}

	if (candidate.shareByTheBook !== best.shareByTheBook) {
		return candidate.shareByTheBook > best.shareByTheBook;
	}

	return candidate.movesSeen > best.movesSeen;
}

function bestSeatToBetBehind(table: TableTracker, players: PlayerRecords): BetBehindSeat | undefined {
	const ownSeats = table.ownSeats();
	let best: BetBehindSeat | undefined;

	for (const seatNumber of table.occupiedSeats()) {
		const ownerId = table.ownerOf(seatNumber);
		const record = ownerId === undefined ? undefined : players.get(ownerId);

		if (ownSeats.includes(seatNumber) || !record || record.movesSeen < MIN_MOVES_SEEN) {
			continue;
		}

		const candidate: BetBehindSeat = {
			seatNumber,
			movesSeen: record.movesSeen,
			shareByTheBook: shareByTheBook(record),
		};

		if (isBetterSeat(candidate, best)) {
			best = candidate;
		}
	}

	return best;
}

// Only offered while the shoe is being counted, since the decision rests on the true count. A bet is worth
// placing once the count tips the edge to the player, at a true count of about +1.2.
export function describeBetBehind(table: TableTracker, players: PlayerRecords): BetBehindAdvice | undefined {
	if (!table.shoe.isTrackedFromStart) {
		return undefined;
	}

	return {
		isWorthBetting: currentEdge(table) > 0,
		hasOwnSeat: table.ownSeats().length > 0,
		isBettingOpen: table.isBettingOpen,
		seat: bestSeatToBetBehind(table, players),
	};
}
