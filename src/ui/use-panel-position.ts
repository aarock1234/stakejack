import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, RefCallback } from 'react';

import { storage } from 'wxt/utils/storage';

import {
	DEFAULT_PLACEMENT,
	clampToViewport,
	legacyPlacementSchema,
	panelPlacementSchema,
	placementToPoint,
	pointToPlacement,
} from './panel-placement';
import type { PanelPlacement, PanelPoint, Size } from './panel-placement';

const savedPlacement = storage.defineItem<unknown>('local:panelPosition');

const EMPTY_SIZE: Size = {
	width: 0,
	height: 0,
};

type DragStart = {
	pointerX: number;
	pointerY: number;
	point: PanelPoint;
};

export type DragHandle = {
	onPointerDown(event: PointerEvent<HTMLElement>): void;
	onPointerMove(event: PointerEvent<HTMLElement>): void;
	onPointerUp(event: PointerEvent<HTMLElement>): void;
	onDoubleClick(event: MouseEvent<HTMLElement>): void;
};

// Buttons in the header, such as minimise, keep their clicks instead of starting a drag.
function isOnButton(target: EventTarget): boolean {
	return target instanceof Element && target.closest('button') !== null;
}

function readSavedPlacement(value: unknown): PanelPlacement | undefined {
	const current = panelPlacementSchema.safeParse(value);

	if (current.success) {
		return current.data;
	}

	const legacy = legacyPlacementSchema.safeParse(value);

	return legacy.success ? legacy.data : undefined;
}

function savePlacement(placement: PanelPlacement): void {
	savedPlacement.setValue(placement).catch((error: unknown) => {
		console.warn('stakejack: could not save the panel position', error);
	});
}

function currentViewport(): Size {
	return {
		width: window.innerWidth,
		height: window.innerHeight,
	};
}

// The game frame's size, followed as the browser window or the game layout changes.
function useViewportSize(): Size {
	const [viewport, setViewport] = useState(currentViewport);

	useEffect(() => {
		function update(): void {
			setViewport(currentViewport());
		}

		window.addEventListener('resize', update);

		return () => {
			window.removeEventListener('resize', update);
		};
	}, []);

	return viewport;
}

// The panel's own size, which changes with what it shows.
function useElementSize(element: HTMLElement | null): Size {
	const [size, setSize] = useState(EMPTY_SIZE);

	// Measured before paint so the panel never flashes in the wrong place.
	useLayoutEffect(() => {
		if (!element) {
			return;
		}

		function measure(target: HTMLElement): void {
			setSize({
				width: target.offsetWidth,
				height: target.offsetHeight,
			});
		}

		measure(element);

		const observer = new ResizeObserver(() => {
			measure(element);
		});

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [element]);

	return size;
}

function useSavedPlacement(): [PanelPlacement, (placement: PanelPlacement) => void] {
	const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);

	useEffect(() => {
		let isCurrent = true;

		savedPlacement
			.getValue()
			.then(value => {
				const saved = readSavedPlacement(value);

				if (isCurrent && saved) {
					setPlacement(saved);
				}
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not load the panel position', error);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	return [placement, setPlacement];
}

// Lets the panel be dragged by its header and remembers where it was left. The whole panel stays on
// screen however the window is resized, and returns to its spot when there is room again.
// Double-clicking the header puts it back in its default place.
export function usePanelPosition(): {
	panelRef: RefCallback<HTMLElement>;
	point: PanelPoint;
	dragHandle: DragHandle;
} {
	const [panel, setPanel] = useState<HTMLElement | null>(null);
	const [placement, setPlacement] = useSavedPlacement();
	const dragStart = useRef<DragStart | undefined>(undefined);

	const viewport = useViewportSize();
	const panelSize = useElementSize(panel);
	const point = placementToPoint(placement, panelSize, viewport);

	const dragHandle: DragHandle = {
		onPointerDown(event) {
			if (event.button !== 0 || isOnButton(event.target)) {
				return;
			}

			event.currentTarget.setPointerCapture(event.pointerId);
			dragStart.current = {
				pointerX: event.clientX,
				pointerY: event.clientY,
				point,
			};
		},

		onPointerMove(event) {
			const start = dragStart.current;

			if (!start) {
				return;
			}

			const moved = clampToViewport(
				{
					left: start.point.left + event.clientX - start.pointerX,
					top: start.point.top + event.clientY - start.pointerY,
				},
				panelSize,
				viewport
			);

			setPlacement(pointToPlacement(moved, panelSize, viewport));
		},

		onPointerUp(event) {
			if (!dragStart.current) {
				return;
			}

			dragStart.current = undefined;
			event.currentTarget.releasePointerCapture(event.pointerId);
			savePlacement(placement);
		},

		onDoubleClick(event) {
			if (isOnButton(event.target)) {
				return;
			}

			setPlacement(DEFAULT_PLACEMENT);
			savePlacement(DEFAULT_PLACEMENT);
		},
	};

	return {
		panelRef: setPanel,
		point,
		dragHandle,
	};
}
