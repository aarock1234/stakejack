import { Fragment } from 'react';
import type { ReactElement } from 'react';

import { Layers, Scale, Spade, Wallet } from 'lucide-react';

import { AdvisorStatus } from '@/advisor/advisor-view';
import type { AdvisorView, SeatOutlook, ShoeSummary } from '@/advisor/advisor-view';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { BetAdvice } from './bet-advice';
import { formatCount, formatMoney, formatShare } from './format';
import { HandAdvice } from './hand-advice';
import { InsuranceAdvice } from './insurance-advice';
import { TableOutlooks } from './table-outlooks';
import { TableOverview } from './table-overview';

type ShoeStripProps = {
	shoe: ShoeSummary;
};

// Always visible: where the count stands and who holds the edge on the next hand.
function ShoeStrip({ shoe }: ShoeStripProps): ReactElement {
	const count = shoe.trueCount === undefined ? 'No count yet' : `Count ${formatCount(shoe.trueCount)}`;
	const edge = `${shoe.edge > 0 ? 'Your edge' : 'House'} ${formatShare(Math.abs(shoe.edge))}`;

	return (
		<div className="flex items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
			<span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
				<Layers aria-hidden className="size-3.5" />
				<span className="tabular-nums">{count}</span>
			</span>
			<span
				className={cn(
					'flex shrink-0 items-center gap-1.5 whitespace-nowrap',
					shoe.edge > 0 && 'text-outcome-win'
				)}
			>
				<Scale aria-hidden className="size-3.5" />
				<span className="tabular-nums">{edge}</span>
			</span>
		</div>
	);
}

type PanelBodyProps = {
	view: AdvisorView;
};

// The one thing that matters right now: the hand being played, the insurance offer, the next bet, or,
// with nothing to decide, an overview of the player's hand, the shoe, and the session.
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

type PanelCardProps = {
	view: AdvisorView;
	// Seats the game has not drawn where outlooks could rest beside them; listed in the panel instead.
	unanchoredOutlooks: readonly SeatOutlook[];
	className?: string;
};

// The panel as drawn, independent of where its data comes from.
export function PanelCard({ view, unanchoredOutlooks, className }: PanelCardProps): ReactElement {
	const isConnecting = view.status === AdvisorStatus.CONNECTING;

	return (
		<Card
			aria-label="Stakejack advice"
			aria-live="polite"
			className={cn(
				'w-68 gap-0 overflow-hidden rounded-2xl py-0 font-sans shadow-[inset_0_1px_0_oklch(1_0_0/6%),0_24px_48px_-12px_oklch(0_0_0/65%)] backdrop-blur-xl',
				className
			)}
		>
			<CardHeader className="grid-rows-1 px-4 py-3">
				<CardTitle className="flex items-center gap-2 text-xs font-medium tracking-tight">
					<span
						aria-hidden
						className="grid size-5 place-items-center rounded-md bg-foreground text-background"
					>
						<Spade className="size-3" strokeWidth={2.5} />
					</span>
					Stakejack
				</CardTitle>
				<CardAction className="row-span-1 flex items-center gap-1.5 self-center text-xs text-muted-foreground">
					{view.wallet ? (
						<>
							<Wallet aria-hidden className="size-3.5" />
							<span className="font-mono tabular-nums">
								{formatMoney(view.wallet.balance, view.wallet.currency)}
							</span>
						</>
					) : (
						headerHint(view.status)
					)}
				</CardAction>
			</CardHeader>

			{!isConnecting && <ShoeStrip shoe={view.shoe} />}

			{!isConnecting && (
				<CardContent className="flex flex-col gap-5 border-t px-4 py-4">
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
