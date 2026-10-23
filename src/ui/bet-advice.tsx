import type { ReactElement } from 'react';

import { CircleDollarSign } from 'lucide-react';

import type { BetRecommendation } from '@/advisor/advisor-view';
import { SIDE_BET_RETURNS } from '@/strategy/betting';

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
		return <p className="text-sm text-muted-foreground">Your balance is below the table minimum.</p>;
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					{bet.isTableMinimum ? 'Next bet · table minimum' : 'Next bet'}
				</p>
				<Headline
					icon={CircleDollarSign}
					label={<span className="font-mono tabular-nums">{formatMoney(bet.amount, currency)}</span>}
				/>
			</div>

			<ValueList
				rows={[
					{
						key: 'perfect-pairs',
						label: 'Perfect Pairs · skip',
						value: formatPercent(SIDE_BET_RETURNS.perfectPairs - 1),
					},
					{
						key: 'twenty-one-plus-three',
						label: '21+3 · skip',
						value: formatPercent(SIDE_BET_RETURNS.twentyOnePlusThree - 1),
					},
				]}
			/>
		</section>
	);
}
