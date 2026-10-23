import type { ReactElement } from 'react';

import { Equal, Trophy, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { HandStanding as HandStandingValue } from '@/advisor/advisor-view';
import { cn } from '@/lib/utils';
import type { HandOutlook } from '@/strategy/outlook';

import { formatShare } from './format';

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
			icon: X,
			color: 'text-outcome-lose',
		};
	}

	if (isCertain(outlook.win)) {
		return {
			label: 'Win',
			icon: Trophy,
			color: 'text-outcome-win',
		};
	}

	if (isCertain(outlook.push)) {
		return {
			label: 'Push',
			icon: Equal,
			color: 'text-muted-foreground',
		};
	}

	if (isCertain(outlook.lose)) {
		return {
			label: 'Lose',
			icon: X,
			color: 'text-outcome-lose',
		};
	}

	return undefined;
}

type OutlookBarProps = {
	outlook: HandOutlook;
};

// Hairline split of win, push, and lose, read left to right.
export function OutlookBar({ outlook }: OutlookBarProps): ReactElement {
	return (
		<div aria-hidden className="flex h-0.5 w-full overflow-hidden rounded-full">
			<span
				className="bg-outcome-win"
				style={{
					flexGrow: outlook.win,
				}}
			/>
			<span
				className="bg-outcome-push"
				style={{
					flexGrow: outlook.push,
				}}
			/>
			<span
				className="bg-outcome-lose"
				style={{
					flexGrow: outlook.lose,
				}}
			/>
		</div>
	);
}

type HandStandingProps = {
	standing: HandStandingValue;
};

// The hand's total and its chance of beating the dealer if it stands, or the settled result.
export function HandStanding({ standing }: HandStandingProps): ReactElement {
	if (standing.isInPlay) {
		return <span className="font-mono text-xs text-muted-foreground tabular-nums">{standing.total}</span>;
	}

	const verdict = settledVerdict(standing);

	if (verdict) {
		return <span className={cn('font-mono text-xs font-medium', verdict.color)}>{verdict.label}</span>;
	}

	return (
		<div className="flex min-w-10 flex-col gap-1">
			<div className="flex items-baseline justify-between gap-1.5 font-mono text-xs tabular-nums">
				<span className="text-muted-foreground">{standing.total}</span>
				<span>{formatShare(standing.outlook.win)}</span>
			</div>
			<OutlookBar outlook={standing.outlook} />
		</div>
	);
}
