import type { ReactElement } from 'react';

import { PanelCard } from '@/ui/panel-card';
import { SeatOutlookChip } from '@/ui/seat-outlooks';

import { PREVIEW_SAMPLES, PREVIEW_SEATS } from './sample-views';

// Every state of the panel side by side, over a backdrop toned like the live dealer table.
export function PreviewPage(): ReactElement {
	return (
		<main className="min-h-screen bg-[radial-gradient(ellipse_at_top,oklch(0.32_0.05_250),oklch(0.14_0.02_250)_70%)] p-10 font-sans text-foreground">
			<header className="mb-8 flex flex-col gap-1">
				<h1 className="text-sm font-medium">Stakejack</h1>
				<p className="text-xs text-muted-foreground">Panel states rendered from sample hands.</p>
			</header>

			<div className="flex flex-wrap items-start gap-6">
				{PREVIEW_SAMPLES.map(sample => (
					<figure key={sample.title} className="flex flex-col gap-2">
						<figcaption className="text-xs text-muted-foreground">{sample.title}</figcaption>
						<PanelCard view={sample.view} unanchoredOutlooks={[]} />
					</figure>
				))}
			</div>

			<figure className="mt-10 flex flex-col gap-2">
				<figcaption className="text-xs text-muted-foreground">Seat outlooks</figcaption>
				<div className="flex items-end gap-4">
					{PREVIEW_SEATS.map(seat => (
						<SeatOutlookChip key={seat.seatNumber} seat={seat} />
					))}
				</div>
			</figure>
		</main>
	);
}
