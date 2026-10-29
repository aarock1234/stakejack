import { z } from 'zod';

export const HorizontalEdge = {
	LEFT: 'left',
	RIGHT: 'right',
} as const;

export type HorizontalEdge = (typeof HorizontalEdge)[keyof typeof HorizontalEdge];

export const VerticalEdge = {
	TOP: 'top',
	BOTTOM: 'bottom',
} as const;

export type VerticalEdge = (typeof VerticalEdge)[keyof typeof VerticalEdge];

// Where the player left the panel, measured from the window edges it sits nearest. Keeping those
// distances means a panel parked in a corner stays in that corner while the game window resizes.
export const panelPlacementSchema = z.object({
	horizontalEdge: z.enum(HorizontalEdge),
	horizontalOffset: z.number(),
	verticalEdge: z.enum(VerticalEdge),
	verticalOffset: z.number(),
});

export type PanelPlacement = z.infer<typeof panelPlacementSchema>;

// Earlier versions saved distances from the top-right corner only.
export const legacyPlacementSchema = z
	.object({
		top: z.number(),
		right: z.number(),
	})
	.transform((legacy): PanelPlacement => ({
		horizontalEdge: HorizontalEdge.RIGHT,
		horizontalOffset: legacy.right,
		verticalEdge: VerticalEdge.TOP,
		verticalOffset: legacy.top,
	}));

// Below the game's lobby button and chat box, which occupy the top-right corner.
export const DEFAULT_PLACEMENT: PanelPlacement = {
	horizontalEdge: HorizontalEdge.RIGHT,
	horizontalOffset: 12,
	verticalEdge: VerticalEdge.TOP,
	verticalOffset: 112,
};

// The breathing room kept between the panel and the window edges whenever the window is large enough.
const EDGE_MARGIN_PX = 8;

export type Size = {
	width: number;
	height: number;
};

// The panel's top-left corner in the window.
export type PanelPoint = {
	left: number;
	top: number;
};

// Keeps one axis of the panel inside the window. A panel larger than the window pins to its start, so
// the header, and with it the drag handle, is never lost.
function clampAxis(start: number, panelLength: number, viewportLength: number): number {
	const margin = panelLength + EDGE_MARGIN_PX * 2 <= viewportLength ? EDGE_MARGIN_PX : 0;
	const farthestStart = viewportLength - panelLength - margin;

	return Math.max(Math.min(start, farthestStart), margin, 0);
}

export function clampToViewport(point: PanelPoint, panel: Size, viewport: Size): PanelPoint {
	return {
		left: clampAxis(point.left, panel.width, viewport.width),
		top: clampAxis(point.top, panel.height, viewport.height),
	};
}

// Turns a placement into a point that keeps the whole panel on screen for the current window size.
export function placementToPoint(placement: PanelPlacement, panel: Size, viewport: Size): PanelPoint {
	const left =
		placement.horizontalEdge === HorizontalEdge.LEFT
			? placement.horizontalOffset
			: viewport.width - panel.width - placement.horizontalOffset;

	const top =
		placement.verticalEdge === VerticalEdge.TOP
			? placement.verticalOffset
			: viewport.height - panel.height - placement.verticalOffset;

	return clampToViewport(
		{
			left,
			top,
		},
		panel,
		viewport
	);
}

// Remembers a point by its distance from the nearest window edges.
export function pointToPlacement(point: PanelPoint, panel: Size, viewport: Size): PanelPlacement {
	const rightOffset = viewport.width - panel.width - point.left;
	const bottomOffset = viewport.height - panel.height - point.top;

	const isNearerLeft = point.left <= rightOffset;
	const isNearerTop = point.top <= bottomOffset;

	return {
		horizontalEdge: isNearerLeft ? HorizontalEdge.LEFT : HorizontalEdge.RIGHT,
		horizontalOffset: isNearerLeft ? point.left : rightOffset,
		verticalEdge: isNearerTop ? VerticalEdge.TOP : VerticalEdge.BOTTOM,
		verticalOffset: isNearerTop ? point.top : bottomOffset,
	};
}
