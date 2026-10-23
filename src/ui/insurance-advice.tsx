import type { ReactElement } from 'react';

import { ShieldCheck, ShieldOff } from 'lucide-react';

import type { InsuranceAdvice as InsuranceAdviceValue } from '@/strategy/advice';

import { formatPercent } from './format';
import { Headline } from './headline';

type InsuranceAdviceProps = {
	insurance: InsuranceAdviceValue;
};

export function InsuranceAdvice({ insurance }: InsuranceAdviceProps): ReactElement {
	return (
		<section className="flex flex-col gap-2">
			<p className="text-xs text-muted-foreground">Dealer shows an ace · insurance</p>
			<Headline
				icon={insurance.shouldInsure ? ShieldCheck : ShieldOff}
				label={insurance.shouldInsure ? 'Take it' : 'Decline'}
				detail={formatPercent(insurance.expectedValue)}
			/>
		</section>
	);
}
