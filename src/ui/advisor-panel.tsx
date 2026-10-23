import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import type { AdvisorStore } from '@/advisor/advisor-store';
import { AdvisorStatus } from '@/advisor/advisor-view';

import { PanelCard } from './panel-card';
import { SeatOutlooks } from './seat-outlooks';
import { useSeatAnchors } from './use-seat-anchors';

type AdvisorPanelProps = {
	store: AdvisorStore;
	// Show the panel while the game client is still loading, before it has sent anything.
	isShownWhileConnecting: boolean;
};

// The live panel: follows the store, finds the game's seats, and pins itself over the table.
export function AdvisorPanel({ store, isShownWhileConnecting }: AdvisorPanelProps): ReactElement | null {
	const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const anchors = useSeatAnchors(view.outlooks.map(seat => seat.seatNumber));

	if (view.status === AdvisorStatus.CONNECTING && !isShownWhileConnecting) {
		return null;
	}

	const unanchoredOutlooks = view.outlooks.filter(seat => !anchors.has(seat.seatNumber));

	// The panel sits below the game's lobby button and chat box, which occupy the top-right corner.
	return (
		<>
			<PanelCard
				view={view}
				unanchoredOutlooks={unanchoredOutlooks}
				className="fixed top-28 right-3 z-2147483647"
			/>
			<SeatOutlooks outlooks={view.outlooks} anchors={anchors} />
		</>
	);
}
