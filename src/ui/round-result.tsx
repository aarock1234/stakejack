import type { ReactElement } from 'react';

import type { RoundResult } from '@/advisor/session-tracker';
import { cn } from '@/lib/utils';

import { formatMoney, formatMoneyChange } from './format';

function resultTone(net: number): string {
	if (net > 0) {
		return 'text-outcome-win';
	}

	return net < 0 ? 'text-outcome-lose' : 'text-foreground';
}

type RoundResultStripProps = {
	round: RoundResult;
	currency: string;
};

// What the player's last round came to once the game paid it out, main and side bets together. It stays
// up through the next round until that one is paid in turn.
export function RoundResultStrip({ round, currency }: RoundResultStripProps): ReactElement {
	return (
		<p className="flex items-baseline gap-2 border-t border-border-faint px-4 py-2.5 text-sm">
			<span className="text-muted-foreground">Last round</span>
			<span className={cn('font-medium', resultTone(round.net))}>{formatMoneyChange(round.net, currency)}</span>
			<span className="ml-auto text-xs text-muted-foreground">on {formatMoney(round.wagered, currency)}</span>
		</p>
	);
}
