import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';
import { DealerOutlookChip } from '@/ui/dealer-outlook';
import { PanelCard } from '@/ui/panel-card';
import { SeatOutlookChip } from '@/ui/seat-outlooks';

import { PREVIEW_DEALER, PREVIEW_SAMPLES, PREVIEW_SEATS, SampleId } from './sample-views';
import type { PreviewSample } from './sample-views';

// Stacks for the capture layouts, paired so the columns already end within a few pixels of each other. The
// last panel in each column stretches to close the rest, so each image is an even rectangle.
const CAPTURE_COLUMNS: readonly (readonly SampleId[])[] = [
	[SampleId.MOVE, SampleId.SPLIT],
	[SampleId.BETTING, SampleId.INSURANCE, SampleId.WATCHING],
	[SampleId.OVERVIEW],
];

// A landscape version for chat apps: three short columns with the table chips beneath them, beside the tall
// between-hands panel.
const WIDE_CAPTURE_COLUMNS: readonly (readonly SampleId[])[] = [
	[SampleId.MOVE, SampleId.INSURANCE],
	[SampleId.SPLIT],
	[SampleId.BETTING, SampleId.WATCHING],
];

const CaptureShape = {
	TALL: 'tall',
	WIDE: 'wide',
} as const;

type CaptureShape = (typeof CaptureShape)[keyof typeof CaptureShape];

function findSample(id: SampleId): PreviewSample | undefined {
	return PREVIEW_SAMPLES.find(sample => sample.id === id);
}

type SeatChipsProps = {
	className?: string;
};

function SeatChips({ className }: SeatChipsProps): ReactElement {
	return (
		<div className={cn('flex flex-wrap items-end gap-3', className)}>
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

type CaptureColumnProps = {
	sampleIds: readonly SampleId[];
};

// One column of panels, stretched to the height of the tallest column.
function CaptureColumn({ sampleIds }: CaptureColumnProps): ReactElement {
	return (
		<div className="flex flex-col gap-6">
			{sampleIds.map(id => {
				const sample = findSample(id);

				return (
					sample && (
						<PanelCard
							key={id}
							view={sample.view}
							unanchoredOutlooks={[]}
							className="shadow-[0_6px_16px_-6px_rgb(0_0_0/40%)] last:flex-1"
						/>
					)
				);
			})}
		</div>
	);
}

// The tall image for the README: three columns of panels with equal bottoms, and the chips centred in a row
// beneath them.
function TallCapture(): ReactElement {
	return (
		<>
			<div className="grid grid-cols-3 gap-6">
				{CAPTURE_COLUMNS.map(column => (
					<CaptureColumn key={column.join()} sampleIds={column} />
				))}
			</div>

			<div className="flex justify-center">
				<SeatChips />
			</div>
		</>
	);
}

// The wide image for chat: three columns of panels over a row of chips, beside the between-hands panel,
// all ending on one line.
function WideCapture(): ReactElement {
	return (
		<div className="flex gap-6">
			<div className="flex flex-col gap-6">
				<div className="grid flex-1 grid-cols-3 gap-6">
					{WIDE_CAPTURE_COLUMNS.map(column => (
						<CaptureColumn key={column.join()} sampleIds={column} />
					))}
				</div>

				<SeatChips className="justify-center" />
			</div>

			<CaptureColumn sampleIds={[SampleId.OVERVIEW]} />
		</div>
	);
}

type CaptureLayoutProps = {
	shape: CaptureShape;
};

// The panels and table chips on a transparent background, cropped for sharing. Panels are made opaque and
// their shadows tightened, since there is no table behind them. The layout reports its own size on the
// document so the screenshot can be cropped to it.
function CaptureLayout({ shape }: CaptureLayoutProps): ReactElement {
	const layout = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const bounds = layout.current?.getBoundingClientRect();

		if (bounds) {
			document.documentElement.dataset.captureSize = `${Math.ceil(bounds.width)}x${Math.ceil(bounds.height)}`;
		}
	});

	return (
		<div ref={layout} className="inline-flex flex-col gap-6 p-6 font-sans text-foreground [--card:#0a0a0a]">
			{shape === CaptureShape.WIDE ? <WideCapture /> : <TallCapture />}
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

// The gallery for browsing. Add ?capture to the address for the bare, cropped layout used in the README, or
// ?capture=wide for the landscape one.
export function PreviewPage(): ReactElement {
	const capture = new URLSearchParams(window.location.search).get('capture');

	if (capture === null) {
		return <GalleryLayout />;
	}

	return <CaptureLayout shape={capture === CaptureShape.WIDE ? CaptureShape.WIDE : CaptureShape.TALL} />;
}
