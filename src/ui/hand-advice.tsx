import type { ReactElement } from 'react';

import type { HandDecision } from '@/advisor/advisor-view';
import { cn } from '@/lib/utils';

import { ACTION_APPEARANCE } from './action-appearance';
import { actionLabel, formatPercent, handLabel } from './format';
import { Headline } from './headline';
import { PlayingCard } from './playing-card';
import { ValueList } from './value-list';

// "Your hand · Soft 18", or "Hand 2 · Hard 12" once a pair has been split.
function handCaption(decision: HandDecision): string {
	const name = decision.isSplitHand ? `Hand ${decision.handIndex + 1}` : 'Your hand';
	const ranks = decision.playerCards.map(card => card.rank);

	return `${name} · ${handLabel(ranks, decision.canSplit)}`;
}

type HandAdviceProps = {
	decision: HandDecision;
	// Another split hand is being played right now, so this one is only a preview.
	isWaiting: boolean;
};

export function HandAdvice({ decision, isWaiting }: HandAdviceProps): ReactElement {
	const { advice } = decision;
	const appearance = ACTION_APPEARANCE[advice.best.action];
	const otherOptions = advice.options.filter(option => option !== advice.best);

	return (
		<section className={cn('flex flex-col gap-4 transition-opacity', isWaiting && 'opacity-40')}>
			<div className="flex items-end justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-2">
					<p className="truncate text-xs text-muted-foreground">{handCaption(decision)}</p>
					<div className="flex gap-1">
						{/* Cards are only ever appended to a hand, so their position is a stable identity. */}
						{decision.playerCards.map((card, position) => (
							<PlayingCard key={position} card={card} />
						))}
					</div>
				</div>

				<div className="flex flex-col items-end gap-2">
					<p className="text-xs text-muted-foreground">Dealer</p>
					<PlayingCard card={decision.dealerUpCard} />
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Headline
					icon={appearance.icon}
					label={actionLabel(advice.best.action)}
					detail={formatPercent(advice.best.expectedValue)}
					textColor={appearance.text}
					tileColor={appearance.tint}
				/>

				{decision.bookAction && (
					<p className="text-xs text-muted-foreground">
						Count play · book says {actionLabel(decision.bookAction).toLowerCase()}
					</p>
				)}
			</div>

			{otherOptions.length > 0 && (
				<ValueList
					rows={otherOptions.map(option => ({
						key: option.action,
						label: actionLabel(option.action),
						value: formatPercent(option.expectedValue),
					}))}
				/>
			)}
		</section>
	);
}
