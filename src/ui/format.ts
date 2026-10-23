import { bestTotal, handPoints, isSoft, Rank } from '@/game/cards';
import { Action } from '@/strategy/advice';

const ACTION_LABELS: Readonly<Record<Action, string>> = {
	[Action.HIT]: 'Hit',
	[Action.STAND]: 'Stand',
	[Action.DOUBLE]: 'Double',
	[Action.SPLIT]: 'Split',
	[Action.CASH_OUT]: 'Cash out',
};

export function actionLabel(action: Action): string {
	return ACTION_LABELS[action];
}

export function rankLabel(rank: Rank): string {
	return rank === Rank.TEN ? '10' : rank;
}

// "Pair of 8s" while the pair can still be split, otherwise "Soft 18" or "Hard 12".
export function handLabel(cards: readonly Rank[], canSplit: boolean): string {
	const [firstCard] = cards;

	if (canSplit && firstCard) {
		return `Pair of ${rankLabel(firstCard)}s`;
	}

	const hand = handPoints(cards);
	const softness = isSoft(hand) ? 'Soft' : 'Hard';

	return `${softness} ${bestTotal(hand)}`;
}

const percentFormat = new Intl.NumberFormat('en-US', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	signDisplay: 'exceptZero',
});

const shareFormat = new Intl.NumberFormat('en-US', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

const countFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
	signDisplay: 'exceptZero',
});

function withTypographicMinus(text: string): string {
	return text.replace('-', '−');
}

// A signed share of the stake, such as "+12.4%" or "−48.1%".
export function formatPercent(fraction: number): string {
	return withTypographicMinus(percentFormat.format(fraction));
}

// An unsigned share, such as "0.6%".
export function formatShare(fraction: number): string {
	return shareFormat.format(fraction);
}

export function formatCount(count: number): string {
	return withTypographicMinus(countFormat.format(count));
}

export function formatMoney(amount: number, currency: string): string {
	const format = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	});

	return format.format(amount);
}

// A signed amount won or lost, such as "+$12.40" or "−$6.00".
export function formatMoneyChange(amount: number, currency: string): string {
	const format = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		signDisplay: 'exceptZero',
	});

	return withTypographicMinus(format.format(amount));
}
