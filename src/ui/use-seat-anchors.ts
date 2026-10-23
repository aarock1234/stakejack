import { useLayoutEffect, useState } from 'react';

// The viewport point where an outlook's bottom edge rests: just above a seat's main bet spot, shifted
// slightly toward the dealer for seats on the curve of the table.
export type SeatAnchor = {
	x: number;
	y: number;
};

export type SeatAnchors = ReadonlyMap<number, SeatAnchor>;

// The table rescales with the window and the video, so positions are re-read a few times a second.
const REFRESH_INTERVAL_MS = 250;

// Space between the bet spot and the outlook.
const GAP_PX = 6;

// Cards on the outer seats sit a little inward of their bet spots, so outlooks lean toward the dealer by
// up to this much, in proportion to how far the seat is turned.
const TILT_SHIFT_PX = 12;

// The game client marks each seat's main bet spot with a test id numbered from one.
function findBetSpot(seatNumber: number): Element | null {
	return document.querySelector(`[data-testid="mainbet_${seatNumber + 1}"]`);
}

// Seats around the curved table are turned to face the dealer. The game sets that angle as a custom
// property on each seat, which its bet spot inherits.
function seatRotationRadians(betSpot: Element): number {
	const degrees = Number.parseFloat(getComputedStyle(betSpot).getPropertyValue('--rotateBetSpot'));

	return Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : 0;
}

function anchorAbove(betSpot: Element): SeatAnchor | undefined {
	const bounds = betSpot.getBoundingClientRect();

	if (bounds.width === 0) {
		return undefined;
	}

	// Seats on the left of the table turn clockwise (positive angles) and lean right, toward the dealer.
	const towardDealer = TILT_SHIFT_PX * Math.sin(seatRotationRadians(betSpot));

	return {
		x: Math.round(bounds.left + bounds.width / 2 + towardDealer),
		y: Math.round(bounds.top - GAP_PX),
	};
}

function readAnchors(seatNumbers: readonly number[]): Map<number, SeatAnchor> {
	const anchors = new Map<number, SeatAnchor>();

	for (const seatNumber of seatNumbers) {
		const betSpot = findBetSpot(seatNumber);
		const anchor = betSpot ? anchorAbove(betSpot) : undefined;

		if (anchor) {
			anchors.set(seatNumber, anchor);
		}
	}

	return anchors;
}

function isSameAnchors(current: SeatAnchors, next: SeatAnchors): boolean {
	if (current.size !== next.size) {
		return false;
	}

	for (const [seatNumber, anchor] of next) {
		const previous = current.get(seatNumber);

		if (previous?.x !== anchor.x || previous.y !== anchor.y) {
			return false;
		}
	}

	return true;
}

// Follows where the game draws each seat so outlooks can sit on the table next to the hands.
export function useSeatAnchors(seatNumbers: readonly number[]): SeatAnchors {
	const [anchors, setAnchors] = useState<SeatAnchors>(new Map());

	// A string key keeps the effect stable while the same seats are in play.
	const seatKey = seatNumbers.join(',');

	// Measured before paint so the panel's fallback list never flashes while positions are found.
	useLayoutEffect(() => {
		const seats = seatKey === '' ? [] : seatKey.split(',').map(Number);

		function refresh(): void {
			const next = readAnchors(seats);

			setAnchors(current => (isSameAnchors(current, next) ? current : next));
		}

		refresh();

		const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(timer);
		};
	}, [seatKey]);

	return anchors;
}
