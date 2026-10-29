import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { DealerOutlookChip } from '@/ui/dealer-outlook';
import { PanelCard } from '@/ui/panel-card';
import { SeatOutlookChip } from '@/ui/seat-outlooks';

import { PREVIEW_DEALER, PREVIEW_SAMPLES, PREVIEW_SEATS, SampleId } from './sample-views';
import type { PreviewSample } from './sample-views';

// Stacks for the capture layout, balanced by hand so the three columns end at similar heights.
const CAPTURE_COLUMNS: readonly (readonly SampleId[])[] = [
	[SampleId.MOVE, SampleId.BETTING, SampleId.INSURANCE],
	[SampleId.SPLIT],
	[SampleId.OVERVIEW],
];

function findSample(id: SampleId): PreviewSample | undefined {
	return PREVIEW_SAMPLES.find(sample => sample.id === id);
}

function SeatChips(): ReactElement {
	return (
		<div className="flex flex-wrap items-end gap-3">
			<DealerOutlookChip dealer={PREVIEW_DEALER} />
			{PREVIEW_SEATS.map(seat => (
				<SeatOutlookChip key={seat.seatNumber} seat={seat} />
			))}
		</div>
	);
}

// The between-decisions panel with its minimise button working, starting minimised.
function MinimisedSample(): ReactElement | null {
	const [isCollapsed, setIsCollapsed] = useState(true);
	const sample = findSample(SampleId.OVERVIEW);

	if (!sample) {
		return null;
	}

	return (
		<PanelCard
			view={sample.view}
			unanchoredOutlooks={[]}
			collapse={{
				isCollapsed,
				onToggle: () => setIsCollapsed(collapsed => !collapsed),
			}}
		/>
	);
}

// Just the panels on a transparent background, evenly spaced, for the README image. Panels are made opaque
// and their shadows tightened, since there is no table behind them. The layout reports its own size on the
// document so the screenshot can be cropped to it.
function CaptureLayout(): ReactElement {
	const layout = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const bounds = layout.current?.getBoundingClientRect();

		if (bounds) {
			document.documentElement.dataset.captureSize = `${Math.ceil(bounds.width)}x${Math.ceil(bounds.height)}`;
		}
	});

	return (
		<div
			ref={layout}
			className="inline-flex items-start gap-6 p-6 font-sans text-foreground [--card:oklch(0.165_0.002_260)]"
		>
			{CAPTURE_COLUMNS.map((column, columnIndex) => (
				<div key={columnIndex} className="flex flex-col gap-6">
					{column.map(id => {
						const sample = findSample(id);

						return (
							sample && (
								<PanelCard
									key={id}
									view={sample.view}
									unanchoredOutlooks={[]}
									className="shadow-[0_6px_16px_-6px_oklch(0_0_0/40%)]"
								/>
							)
						);
					})}
					{columnIndex === 1 && <SeatChips />}
				</div>
			))}
		</div>
	);
}

// Every state of the panel side by side, over a backdrop toned like the live dealer table.
function GalleryLayout(): ReactElement {
	return (
		<main className="min-h-screen bg-[radial-gradient(ellipse_at_top,oklch(0.32_0.05_250),oklch(0.14_0.02_250)_70%)] p-10 font-sans text-foreground">
			<header className="mb-8 flex flex-col gap-1">
				<h1 className="text-sm font-medium">Stakejack</h1>
				<p className="text-xs text-muted-foreground">Panel states rendered from sample hands.</p>
			</header>

			<div className="flex flex-wrap items-start gap-6">
				{PREVIEW_SAMPLES.map(sample => (
					<figure key={sample.id} className="flex flex-col gap-2">
						<figcaption className="text-xs text-muted-foreground">{sample.title}</figcaption>
						<PanelCard view={sample.view} unanchoredOutlooks={[]} />
					</figure>
				))}

				<figure className="flex flex-col gap-2">
					<figcaption className="text-xs text-muted-foreground">Minimised</figcaption>
					<MinimisedSample />
				</figure>
			</div>

			<figure className="mt-10 flex flex-col gap-2">
				<figcaption className="text-xs text-muted-foreground">Seat outlooks</figcaption>
				<SeatChips />
			</figure>
		</main>
	);
}

// The gallery for browsing; add ?capture to the address for the bare, cropped layout used in the README.
export function PreviewPage(): ReactElement {
	const isCapture = new URLSearchParams(window.location.search).has('capture');

	return isCapture ? <CaptureLayout /> : <GalleryLayout />;
}
