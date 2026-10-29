// The game socket numbers the seats 0 to 6 from the left of the table as players see it, but the table
// itself labels them the other way round: seat 1 sits at the dealer's left, on the right of the screen, and
// seat 7 at the far left. Cards go out from seat 1, so seat 7 acts last.
export const SEAT_COUNT = 7;

// The seat number the table shows for a seat as the socket numbers it.
export function seatLabel(seatNumber: number): number {
	return SEAT_COUNT - seatNumber;
}
