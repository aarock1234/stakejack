import type { TableTracker } from '@/game/table-tracker';

// A free seat worth moving to between rounds.
export type SeatSuggestion = {
	seatNumber: number;
};

// Every seat has the same odds on its own cards. What changes is how much the player has seen when they
// decide: the socket numbers seats from 0 at the left of the table as players see it, and the dealer deals
// and plays from the highest of those down. A seat further left acts after more of the table, and counted
// advice takes those cards into account, which only helps while the shoe is being counted.
export function suggestSeat(table: TableTracker): SeatSuggestion | undefined {
	const [ownSeat] = table.ownSeats();

	if (ownSeat === undefined || !table.isBettingOpen || !table.shoe.isTrackedFromStart) {
		return undefined;
	}

	const occupied = table.occupiedSeats();

	for (let seatNumber = 0; seatNumber < ownSeat; seatNumber += 1) {
		if (!occupied.has(seatNumber)) {
			return {
				seatNumber,
			};
		}
	}

	return undefined;
}
