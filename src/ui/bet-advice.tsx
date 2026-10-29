import type { ReactElement } from 'react';

import { CircleDollarSign } from 'lucide-react';

import type { BetRecommendation } from '@/advisor/advisor-view';
import { SIDE_BET_RETURNS } from '@/strategy/betting';

import { Caption } from './caption';
import { formatMoney, formatPercent } from './format';
import { Headline } from './headline';
import { ValueList } from './value-list';

type BetAdviceProps = {
	bet: BetRecommendation;
	currency: string;
};

// The count and edge behind this amount sit in the panel header.
export function BetAdvice({ bet, currency }: BetAdviceProps): ReactElement {
	if (!bet.canAffordMinimum) {
		return <p className="text-muted-foreground">Your balance is below the table minimum.</p>;
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Caption info="Bet the table minimum while the house has the edge. When the count swings in your favour, this grows to a small share of your balance, sized so a losing streak can't wipe you out. Side bets lose more than the main game, so skip them.">
					{bet.isTableMinimum ? 'Next bet, table minimum' : 'Next bet'}
				</Caption>
				<Headline icon={CircleDollarSign} label={formatMoney(bet.amount, currency)} />
			</div>

			<div className="border-t border-border-faint pt-2">
				<ValueList
					rows={[
						{
							key: 'perfect-pairs',
							label: 'Skip Perfect Pairs',
							value: formatPercent(SIDE_BET_RETURNS.perfectPairs - 1),
						},
						{
							key: 'twenty-one-plus-three',
							label: 'Skip 21+3',
							value: formatPercent(SIDE_BET_RETURNS.twentyOnePlusThree - 1),
						},
					]}
				/>
			</div>
		</section>
	);
}
