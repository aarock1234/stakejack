import { Fragment } from 'react';
import type { CSSProperties, ReactElement, Ref } from 'react';

import { ChevronDown, ChevronUp, Spade, Wallet } from 'lucide-react';

import { AdvisorStatus } from '@/advisor/advisor-view';
import type { AdvisorView } from '@/advisor/advisor-view';
import type { SeatOutlook } from '@/advisor/outlook-view';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { BetAdvice } from './bet-advice';
import { formatMoney } from './format';
import { HandAdvice } from './hand-advice';
import { InsuranceAdvice } from './insurance-advice';
import { ShoeStrip } from './shoe-strip';
import { TableOutlooks } from './table-outlooks';
import { TableOverview } from './table-overview';
import type { DragHandle } from './use-panel-position';

type PanelBodyProps = {
	view: AdvisorView;
};

// The one thing that matters right now: the hand being played, the insurance offer, the next bet, or,
// with nothing to decide, an overview of the player's hands, the dealer, the shoe, and the session.
function PanelBody({ view }: PanelBodyProps): ReactElement {
	if (view.decisions.length > 0) {
		const isAnyHandActive = view.decisions.some(decision => decision.isActive);

		return (
			<>
				{view.decisions.map((decision, index) => (
					<Fragment key={`${decision.seatNumber}:${decision.handIndex}`}>
						{index > 0 && <Separator />}
						<HandAdvice decision={decision} isWaiting={isAnyHandActive && !decision.isActive} />
					</Fragment>
				))}
			</>
		);
	}

	if (view.insurance) {
		return <InsuranceAdvice insurance={view.insurance} />;
	}

	if (view.bet && view.wallet) {
		return <BetAdvice bet={view.bet} currency={view.wallet.currency} />;
	}

	return <TableOverview view={view} />;
}

// Minimising is only offered on the live panel, which remembers the choice.
export type CollapseControl = {
	isCollapsed: boolean;
	onToggle: () => void;
};

function MinimiseButton({ isCollapsed, onToggle }: CollapseControl): ReactElement {
	const Icon = isCollapsed ? ChevronDown : ChevronUp;

	return (
		<button
			type="button"
			aria-label={isCollapsed ? 'Show the full panel' : 'Minimise the panel'}
			aria-expanded={!isCollapsed}
			onClick={onToggle}
			className="grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		>
			<Icon aria-hidden className="size-4" />
		</button>
	);
}

type PanelCardProps = {
	ref?: Ref<HTMLDivElement>;
	view: AdvisorView;
	// Seats the game has not drawn where outlooks could rest beside them; listed in the panel instead.
	unanchoredOutlooks: readonly SeatOutlook[];
	// Makes the header a handle for moving the panel around the table.
	dragHandle?: DragHandle;
	collapse?: CollapseControl;
	className?: string;
	style?: CSSProperties;
};

// The panel as drawn, independent of where its data comes from.
export function PanelCard({
	ref,
	view,
	unanchoredOutlooks,
	dragHandle,
	collapse,
	className,
	style,
}: PanelCardProps): ReactElement {
	const isConnecting = view.status === AdvisorStatus.CONNECTING;
	const isCollapsed = collapse?.isCollapsed === true;

	return (
		<Card
			ref={ref}
			aria-label="Stakejack advice"
			aria-live="polite"
			className={cn(
				'w-68 gap-0 overflow-hidden rounded-[12px] border-border py-0 font-sans text-sm shadow-[0_16px_40px_rgb(0_0_0/65%)] backdrop-blur-xl',
				className
			)}
			style={style}
		>
			<CardHeader
				className={cn(
					'grid-rows-1 py-2.5 pr-2.5 pl-4',
					dragHandle && 'cursor-grab touch-none select-none active:cursor-grabbing'
				)}
				title={dragHandle && 'Drag to move. Double-click to reset.'}
				{...dragHandle}
			>
				<CardTitle className="flex items-center gap-2 text-sm font-semibold">
					<span
						aria-hidden
						className="grid size-5 place-items-center rounded-[5px] bg-foreground text-background"
					>
						<Spade className="size-3" strokeWidth={2.5} />
					</span>
					Stakejack
				</CardTitle>
				<CardAction className="row-span-1 flex items-center gap-1.5 self-center text-sm text-muted-foreground">
					{view.wallet ? (
						<>
							<Wallet aria-hidden className="size-3.5" />
							<span className="font-medium text-foreground">
								{formatMoney(view.wallet.balance, view.wallet.currency)}
							</span>
						</>
					) : (
						headerHint(view.status)
					)}
					{collapse && <MinimiseButton isCollapsed={collapse.isCollapsed} onToggle={collapse.onToggle} />}
				</CardAction>
			</CardHeader>

			{!isConnecting && <ShoeStrip shoe={view.shoe} />}

			{/* The content scrolls on its own when the game window is shorter than the panel, keeping the header in reach. */}
			{!isConnecting && !isCollapsed && (
				<CardContent className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-border-faint px-4 py-4">
					<PanelBody view={view} />

					{unanchoredOutlooks.length > 0 && (
						<>
							<Separator />
							<TableOutlooks outlooks={unanchoredOutlooks} />
						</>
					)}
				</CardContent>
			)}
		</Card>
	);
}

function headerHint(status: AdvisorStatus): string {
	switch (status) {
		case AdvisorStatus.CONNECTING:
			return 'Connecting…';
		case AdvisorStatus.WATCHING:
			return 'Take a seat';
		case AdvisorStatus.SEATED:
			return '';
	}
}
