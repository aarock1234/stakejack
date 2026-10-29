import { useLayoutEffect, useState } from 'react';

// A viewport point on the game's table where a chip rests.
export type TablePoint = {
	x: number;
	y: number;
};

export type TableAnchors = {
	// Where each seat's chip's bottom edge rests: just above the seat's main bet spot, shifted slightly toward
	// the dealer for seats on the curve of the table.
	seats: ReadonlyMap<number, TablePoint>;
	// Where the dealer's chip's left edge rests, centred beside the dealer's score.
	dealer?: TablePoint;
};

const NO_ANCHORS: TableAnchors = {
	seats: new Map(),
};

// The table rescales with the window and the video, so positions are re-read a few times a second.
const REFRESH_INTERVAL_MS = 250;

// Space between a chip and the spot it rests beside.
const GAP_PX = 6;

// Cards on the outer seats sit a little inward of their bet spots, so outlooks lean toward the dealer by
// up to this much, in proportion to how far the seat is turned.
const TILT_SHIFT_PX = 12;

// The game client marks each seat's main bet spot with a test id numbered from one.
function findBetSpot(seatNumber: number): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="mainbet_${seatNumber + 1}"]`);
}

// The dealer's running total, drawn just above their cards.
function findDealerScore(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-testid="bj-dealer-score"]');
}

// Seats around the curved table are turned to face the dealer. The game sets that angle as a custom
// property on each seat, which its bet spot inherits.
function seatRotationRadians(betSpot: Element): number {
	const degrees = Number.parseFloat(getComputedStyle(betSpot).getPropertyValue('--rotateBetSpot'));

	return Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : 0;
}

// A turned bet spot's bounding box grows taller than the spot itself, so measuring from the box's top
// would float outer seats higher than the middle one. The spot's drawn height is recovered from its
// untransformed size and the scale the table is drawn at, which the box's width reveals.
function drawnHalfHeight(betSpot: HTMLElement, bounds: DOMRect, rotation: number): number {
	const cosine = Math.abs(Math.cos(rotation));
	const sine = Math.abs(Math.sin(rotation));
	const unscaledWidth = betSpot.offsetWidth * cosine + betSpot.offsetHeight * sine;

	if (unscaledWidth === 0) {
		return bounds.height / 2;
	}

	const scale = bounds.width / unscaledWidth;

	return (betSpot.offsetHeight * scale) / 2;
}

function pointAboveBetSpot(betSpot: HTMLElement): TablePoint | undefined {
	const bounds = betSpot.getBoundingClientRect();

	if (bounds.width === 0) {
		return undefined;
	}

	const rotation = seatRotationRadians(betSpot);
	const centerX = bounds.left + bounds.width / 2;
	const centerY = bounds.top + bounds.height / 2;

	// Seats on the left of the table turn clockwise (positive angles) and lean right, toward the dealer.
	const towardDealer = TILT_SHIFT_PX * Math.sin(rotation);

	return {
		x: Math.round(centerX + towardDealer),
		y: Math.round(centerY - drawnHalfHeight(betSpot, bounds, rotation) - GAP_PX),
	};
}

// The score is hidden, with no width, until the dealer shows a card.
function pointBesideDealerScore(score: HTMLElement): TablePoint | undefined {
	const bounds = score.getBoundingClientRect();

	if (bounds.width === 0) {
		return undefined;
	}

	return {
		x: Math.round(bounds.right + GAP_PX),
		y: Math.round(bounds.top + bounds.height / 2),
	};
}

function readSeatAnchors(seatNumbers: readonly number[]): Map<number, TablePoint> {
	const anchors = new Map<number, TablePoint>();

	for (const seatNumber of seatNumbers) {
		const betSpot = findBetSpot(seatNumber);
		const anchor = betSpot ? pointAboveBetSpot(betSpot) : undefined;

		if (anchor) {
			anchors.set(seatNumber, anchor);
		}
	}

	return anchors;
}

function readDealerAnchor(): TablePoint | undefined {
	const score = findDealerScore();

	return score ? pointBesideDealerScore(score) : undefined;
}

function isSamePoint(current: TablePoint | undefined, next: TablePoint | undefined): boolean {
	return current?.x === next?.x && current?.y === next?.y;
}

function isSameAnchors(current: TableAnchors, next: TableAnchors): boolean {
	if (current.seats.size !== next.seats.size || !isSamePoint(current.dealer, next.dealer)) {
		return false;
	}

	for (const [seatNumber, anchor] of next.seats) {
		if (!isSamePoint(current.seats.get(seatNumber), anchor)) {
			return false;
		}
	}

	return true;
}

// Follows where the game draws each seat and the dealer, so chips can sit on the table beside the hands.
export function useTableAnchors(seatNumbers: readonly number[], isDealerShown: boolean): TableAnchors {
	const [anchors, setAnchors] = useState(NO_ANCHORS);

	// A string key keeps the effect stable while the same seats are in play.
	const seatKey = seatNumbers.join(',');

	// Measured before paint so the panel's fallback lists never flash while positions are found.
	useLayoutEffect(() => {
		const seats = seatKey === '' ? [] : seatKey.split(',').map(Number);

		function refresh(): void {
			const next: TableAnchors = {
				seats: readSeatAnchors(seats),
				dealer: isDealerShown ? readDealerAnchor() : undefined,
			};

			setAnchors(current => (isSameAnchors(current, next) ? current : next));
		}

		refresh();

		const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);

		return () => {
			window.clearInterval(timer);
		};
	}, [seatKey, isDealerShown]);

	return anchors;
}
