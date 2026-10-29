import type { ReactElement } from 'react';

import { CircleCheck, CircleMinus, CircleX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { HandStanding as HandStandingValue } from '@/advisor/outlook-view';
import { cn } from '@/lib/utils';
import type { HandOutlook } from '@/strategy/outlook';

import { formatHandTotal, formatShare } from './format';

export type Verdict = {
	label: string;
	icon: LucideIcon;
	color: string;
};

// Probabilities summed from many dealer outcomes land a hair away from exactly one.
function isCertain(probability: number): boolean {
	return probability > 0.9995;
}

// A hand whose result is already certain gets a single word instead of a chance.
export function settledVerdict(standing: HandStandingValue): Verdict | undefined {
	const { outlook } = standing;

	if (standing.isBust) {
		return {
			label: 'Bust',
			icon: CircleX,
			color: 'text-outcome-lose',
		};
	}

	if (isCertain(outlook.win)) {
		return {
			label: 'Win',
			icon: CircleCheck,
			color: 'text-outcome-win',
		};
	}

	if (isCertain(outlook.push)) {
		return {
			label: 'Push',
			icon: CircleMinus,
			color: 'text-muted-foreground',
		};
	}

	if (isCertain(outlook.lose)) {
		return {
			label: 'Lose',
			icon: CircleX,
			color: 'text-outcome-lose',
		};
	}

	return undefined;
}

type OutlookBarProps = {
	outlook: HandOutlook;
};

// A thin bar split into win, push, and lose, read left to right, with a hairline gap between the parts.
export function OutlookBar({ outlook }: OutlookBarProps): ReactElement {
	const segments = [
		{
			key: 'win',
			share: outlook.win,
			color: 'bg-outcome-win',
		},
		{
			key: 'push',
			share: outlook.push,
			color: 'bg-outcome-push',
		},
		{
			key: 'lose',
			share: outlook.lose,
			color: 'bg-outcome-lose',
		},
	];

	return (
		<div aria-hidden className="flex h-1 w-full gap-px overflow-hidden rounded-[2px]">
			{segments
				.filter(segment => segment.share > 0)
				.map(segment => (
					<span
						key={segment.key}
						className={segment.color}
						style={{
							flexGrow: segment.share,
							minWidth: 2,
						}}
					/>
				))}
		</div>
	);
}

type HandStandingProps = {
	standing: HandStandingValue;
};

// The hand's total and its chance of beating the dealer if it stands, or the settled result. A soft hand
// still being played shows both of its totals; once it is done, only the one that counts.
export function HandStanding({ standing }: HandStandingProps): ReactElement {
	if (standing.isInPlay) {
		return (
			<span className="text-xs text-muted-foreground">{formatHandTotal(standing.total, standing.isSoft)}</span>
		);
	}

	const verdict = settledVerdict(standing);

	if (verdict) {
		const Icon = verdict.icon;

		return (
			<span className={cn('flex items-center gap-1 text-xs font-medium', verdict.color)}>
				<Icon aria-hidden className="size-3" strokeWidth={2.5} />
				{verdict.label}
			</span>
		);
	}

	return (
		<div className="flex min-w-12 flex-col gap-1">
			<div className="flex items-baseline justify-between gap-2 text-xs">
				<span className="text-muted-foreground">{standing.total}</span>
				<span className="font-medium">{formatShare(standing.outlook.win)}</span>
			</div>
			<OutlookBar outlook={standing.outlook} />
		</div>
	);
}
