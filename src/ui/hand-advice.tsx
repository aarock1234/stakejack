import type { ReactElement } from 'react';

import type { HandDecision } from '@/advisor/advisor-view';
import { cn } from '@/lib/utils';

import { Caption } from './caption';
import { ACTION_APPEARANCE } from './action-appearance';
import { actionLabel, formatPercent, handLabel } from './format';
import { Headline } from './headline';
import { PlayingCard } from './playing-card';
import { ValueList } from './value-list';

// Shown behind the (i) on every move.
const MOVE_INFO =
	'The move that wins the most money over time for these exact cards. The percentages are what each choice returns on your bet on average: +10% means you make 10 cents per dollar in the long run. Once the shoe is being counted, they account for the cards already played. Cash out is hidden when its quote is priced on a different bet than the one shown, which can happen when betting behind.';

function handName(decision: HandDecision): string {
	const seatName = `Seat ${decision.seatNumber + 1}`;

	if (decision.isBetBehind) {
		return decision.isSplitHand ? `Behind ${seatName}, hand ${decision.handIndex + 1}` : `Behind ${seatName}`;
	}

	return decision.isSplitHand ? `Hand ${decision.handIndex + 1}` : 'Your hand';
}

// "Your hand, soft 18", "Hand 2, hard 12" once a pair has been split, or "Behind seat 3, hard 15".
function handCaption(decision: HandDecision): string {
	const ranks = decision.playerCards.map(card => card.rank);

	return `${handName(decision)}, ${handLabel(ranks, decision.canSplit).toLowerCase()}`;
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
					<Caption info={MOVE_INFO}>{handCaption(decision)}</Caption>
					<div className="flex gap-1">
						{/* Cards are only ever appended to a hand, so their position is a stable identity. */}
						{decision.playerCards.map((card, position) => (
							<PlayingCard key={position} card={card} />
						))}
					</div>
				</div>

				<div className="flex flex-col items-end gap-2">
					<p className="text-xs font-medium text-muted-foreground">Dealer</p>
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
						Count play. Book says {actionLabel(decision.bookAction).toLowerCase()}.
					</p>
				)}

				{decision.isBetBehind && (
					<p className="text-xs text-muted-foreground">The seated player makes this call for you.</p>
				)}
			</div>

			{otherOptions.length > 0 && (
				<div className="border-t border-border-faint pt-2">
					<ValueList
						rows={otherOptions.map(option => ({
							key: option.action,
							label: actionLabel(option.action),
							value: formatPercent(option.expectedValue),
						}))}
					/>
				</div>
			)}
		</section>
	);
}
