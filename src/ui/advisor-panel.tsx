import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import type { AdvisorStore } from '@/advisor/advisor-store';
import { AdvisorStatus } from '@/advisor/advisor-view';
import type { AdvisorView } from '@/advisor/advisor-view';

import { AnchoredDealerOutlook } from './dealer-outlook';
import { PanelCard } from './panel-card';
import { SeatOutlooks } from './seat-outlooks';
import { SeatHintChip } from './table-chip';
import { usePanelCollapsed } from './use-panel-collapsed';
import { usePanelPosition } from './use-panel-position';
import { useTableAnchors } from './use-table-anchors';

type AdvisorPanelProps = {
	store: AdvisorStore;
	// Show the panel while the game client is still loading, before it has sent anything.
	isShownWhileConnecting: boolean;
};

// A seat the player is pointed to between rounds, marked on the table with a chip.
type SeatHint = {
	seatNumber: number;
	title: string;
	detail: string;
};

function seatHints(view: AdvisorView): SeatHint[] {
	const hints: SeatHint[] = [];

	if (view.seatSuggestion) {
		hints.push({
			seatNumber: view.seatSuggestion.seatNumber,
			title: 'Sit here',
			detail: 'Acts after more hands',
		});
	}

	const { betBehind } = view;

	if (betBehind?.isWorthBetting && betBehind.isBettingOpen && betBehind.seat) {
		hints.push({
			seatNumber: betBehind.seat.seatNumber,
			title: 'Bet behind here',
			detail: 'Plays closest to the book',
		});
	}

	return hints;
}

// The live panel: follows the store, finds the game's seats and dealer, and floats over the table wherever
// the player drags it.
export function AdvisorPanel({ store, isShownWhileConnecting }: AdvisorPanelProps): ReactElement | null {
	const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const hints = seatHints(view);
	const anchoredSeats = [...view.outlooks.map(seat => seat.seatNumber), ...hints.map(hint => hint.seatNumber)];
	const anchors = useTableAnchors(anchoredSeats, view.dealer !== undefined);
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

			{hints.map(hint => {
				const anchor = anchors.seats.get(hint.seatNumber);

				return (
					anchor && <SeatHintChip key={hint.title} anchor={anchor} title={hint.title} detail={hint.detail} />
				);
			})}
		</>
	);
}
