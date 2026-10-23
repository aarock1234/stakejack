import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

// Where the panel sits, measured from the top-right corner so it stays beside the game's controls as the
// window resizes.
export type PanelPosition = {
	top: number;
	right: number;
};

// Below the game's lobby button and chat box, which occupy the top-right corner.
const DEFAULT_POSITION: PanelPosition = {
	top: 112,
	right: 12,
};

// How much of the panel must stay on screen, so it can always be dragged back.
const VISIBLE_MARGIN_PX = 48;

const panelPositionSchema = z.object({
	top: z.number(),
	right: z.number(),
});

const savedPosition = storage.defineItem<unknown>('local:panelPosition');

type DragStart = {
	pointerX: number;
	pointerY: number;
	position: PanelPosition;
	panelWidth: number;
};

export type DragHandle = {
	onPointerDown(event: PointerEvent<HTMLElement>): void;
	onPointerMove(event: PointerEvent<HTMLElement>): void;
	onPointerUp(event: PointerEvent<HTMLElement>): void;
	onDoubleClick(): void;
};

function clampToViewport(position: PanelPosition, panelWidth: number): PanelPosition {
	return {
		top: Math.min(Math.max(position.top, 0), window.innerHeight - VISIBLE_MARGIN_PX),
		right: Math.min(
			Math.max(position.right, VISIBLE_MARGIN_PX - panelWidth),
			window.innerWidth - VISIBLE_MARGIN_PX
		),
	};
}

function savePosition(position: PanelPosition): void {
	savedPosition.setValue(position).catch((error: unknown) => {
		console.warn('stakejack: could not save the panel position', error);
	});
}

// Lets the panel be dragged by its header and remembers where it was left. Double-clicking the header
// puts it back in its default place.
export function usePanelPosition(): {
	position: PanelPosition;
	dragHandle: DragHandle;
} {
	const [position, setPosition] = useState(DEFAULT_POSITION);
	const dragStart = useRef<DragStart | undefined>(undefined);

	useEffect(() => {
		let isCurrent = true;

		savedPosition
			.getValue()
			.then(value => {
				const result = panelPositionSchema.safeParse(value);

				if (isCurrent && result.success) {
					setPosition(result.data);
				}
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not load the panel position', error);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	const dragHandle: DragHandle = {
		onPointerDown(event) {
			if (event.button !== 0) {
				return;
			}

			const panel = event.currentTarget.closest('[data-slot="card"]');

			event.currentTarget.setPointerCapture(event.pointerId);
			dragStart.current = {
				pointerX: event.clientX,
				pointerY: event.clientY,
				position,
				panelWidth: panel?.getBoundingClientRect().width ?? 0,
			};
		},

		onPointerMove(event) {
			const start = dragStart.current;

			if (!start) {
				return;
			}

			const moved = {
				top: start.position.top + event.clientY - start.pointerY,
				right: start.position.right - (event.clientX - start.pointerX),
			};

			setPosition(clampToViewport(moved, start.panelWidth));
		},

		onPointerUp(event) {
			if (!dragStart.current) {
				return;
			}

			dragStart.current = undefined;
			event.currentTarget.releasePointerCapture(event.pointerId);
			savePosition(position);
		},

		onDoubleClick() {
			setPosition(DEFAULT_POSITION);
			savePosition(DEFAULT_POSITION);
		},
	};

	return {
		position,
		dragHandle,
	};
}
