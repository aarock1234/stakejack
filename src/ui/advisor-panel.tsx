import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import type { AdvisorStore } from '@/advisor/advisor-store';
import { AdvisorStatus } from '@/advisor/advisor-view';
import type { AdvisorView } from '@/advisor/advisor-view';

import { AnchoredDealerOutlook } from './dealer-outlook';
import { PanelCard } from './panel-card';
import { SeatOutlooks } from './seat-outlooks';
import { SeatSuggestionChip } from './seat-suggestion';
import { usePanelCollapsed } from './use-panel-collapsed';
import { usePanelPosition } from './use-panel-position';
import { useTableAnchors } from './use-table-anchors';

type AdvisorPanelProps = {
	store: AdvisorStore;
	// Show the panel while the game client is still loading, before it has sent anything.
	isShownWhileConnecting: boolean;
};

// Every seat a chip rests on: those holding cards, and a free seat the player is told to move to.
function anchoredSeats(view: AdvisorView): number[] {
	const seats = view.outlooks.map(seat => seat.seatNumber);

	if (view.seatSuggestion) {
		seats.push(view.seatSuggestion.seatNumber);
	}

	return seats;
}

// The live panel: follows the store, finds the game's seats and dealer, and floats over the table wherever
// the player drags it.
export function AdvisorPanel({ store, isShownWhileConnecting }: AdvisorPanelProps): ReactElement | null {
	const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const anchors = useTableAnchors(anchoredSeats(view), view.dealer !== undefined);
	const suggestedSeatAnchor = view.seatSuggestion ? anchors.seats.get(view.seatSuggestion.seatNumber) : undefined;
	const { panelRef, point, dragHandle } = usePanelPosition();
	const { isCollapsed, toggleCollapsed } = usePanelCollapsed();

	if (view.status === AdvisorStatus.CONNECTING && !isShownWhileConnecting) {
		return null;
	}

	const unanchoredOutlooks = view.outlooks.filter(seat => !anchors.seats.has(seat.seatNumber));

	return (
		<>
			<PanelCard
				ref={panelRef}
				view={view}
				unanchoredOutlooks={unanchoredOutlooks}
				dragHandle={dragHandle}
				collapse={{
					isCollapsed,
					onToggle: toggleCollapsed,
				}}
				className="fixed z-2147483647 max-h-dvh"
				style={{
					top: point.top,
					left: point.left,
				}}
			/>

			<SeatOutlooks outlooks={view.outlooks} anchors={anchors} />

			{view.dealer && anchors.dealer && <AnchoredDealerOutlook dealer={view.dealer} anchor={anchors.dealer} />}

			{suggestedSeatAnchor && <SeatSuggestionChip anchor={suggestedSeatAnchor} />}
		</>
	);
}
