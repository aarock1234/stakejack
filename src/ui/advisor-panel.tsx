import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import type { AdvisorStore } from '@/advisor/advisor-store';
import { AdvisorStatus } from '@/advisor/advisor-view';

import { PanelCard } from './panel-card';
import { SeatOutlooks } from './seat-outlooks';
import { usePanelPosition } from './use-panel-position';
import { useSeatAnchors } from './use-seat-anchors';

type AdvisorPanelProps = {
	store: AdvisorStore;
	// Show the panel while the game client is still loading, before it has sent anything.
	isShownWhileConnecting: boolean;
};

// The live panel: follows the store, finds the game's seats, and floats over the table wherever the player
// drags it.
export function AdvisorPanel({ store, isShownWhileConnecting }: AdvisorPanelProps): ReactElement | null {
	const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const anchors = useSeatAnchors(view.outlooks.map(seat => seat.seatNumber));
	const { position, dragHandle } = usePanelPosition();

	if (view.status === AdvisorStatus.CONNECTING && !isShownWhileConnecting) {
		return null;
	}

	const unanchoredOutlooks = view.outlooks.filter(seat => !anchors.has(seat.seatNumber));

	return (
		<>
			<PanelCard
				view={view}
				unanchoredOutlooks={unanchoredOutlooks}
				dragHandle={dragHandle}
				className="fixed z-2147483647"
				style={{
					top: position.top,
					right: position.right,
				}}
			/>
			<SeatOutlooks outlooks={view.outlooks} anchors={anchors} />
		</>
	);
}
