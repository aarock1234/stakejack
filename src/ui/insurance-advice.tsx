import type { ReactElement } from 'react';

import { ShieldCheck, ShieldOff } from 'lucide-react';

import type { InsuranceAdvice as InsuranceAdviceValue } from '@/strategy/advice';

import { Caption } from './caption';
import { formatPercent } from './format';
import { Headline } from './headline';

type InsuranceAdviceProps = {
	insurance: InsuranceAdviceValue;
};

export function InsuranceAdvice({ insurance }: InsuranceAdviceProps): ReactElement {
	return (
		<section className="flex flex-col gap-2">
			<Caption info="Insurance is a side bet that the dealer has blackjack. It only pays off when lots of tens are left in the shoe, which is rare, so the answer is almost always no.">
				Insurance offered
			</Caption>
			<Headline
				icon={insurance.shouldInsure ? ShieldCheck : ShieldOff}
				label={insurance.shouldInsure ? 'Take it' : 'Decline'}
				detail={formatPercent(insurance.expectedValue)}
			/>
		</section>
	);
}
