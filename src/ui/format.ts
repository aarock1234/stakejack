import { BetKind } from '@/game/bets';
import { bestTotal, handPoints, isSoft, Rank } from '@/game/cards';
import { PairHand, PokerHand } from '@/game/side-bets';
import type { SideBetWin } from '@/game/side-bets';
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

const PAIR_HAND_LABELS: Readonly<Record<PairHand, string>> = {
	[PairHand.PERFECT]: 'Perfect pair',
	[PairHand.COLOURED]: 'Coloured pair',
	[PairHand.MIXED]: 'Mixed pair',
};

const POKER_HAND_LABELS: Readonly<Record<PokerHand, string>> = {
	[PokerHand.SUITED_TRIPS]: 'Suited trips',
	[PokerHand.STRAIGHT_FLUSH]: 'Straight flush',
	[PokerHand.THREE_OF_A_KIND]: 'Three of a kind',
	[PokerHand.STRAIGHT]: 'Straight',
	[PokerHand.FLUSH]: 'Flush',
};

// "Mixed pair" for Perfect Pairs, which names itself, or "21+3 Flush".
export function sideBetWinLabel(win: SideBetWin): string {
	if (win.bet === BetKind.PERFECT_PAIRS) {
		return PAIR_HAND_LABELS[win.hand];
	}

	return `21+3 ${POKER_HAND_LABELS[win.hand]}`;
}

export function rankLabel(rank: Rank): string {
	return rank === Rank.TEN ? '10' : rank;
}

// Both ways a soft hand can count, such as "5/15", as the game shows them. A soft 21 is simply 21, since
// nobody draws to it.
export function formatHandTotal(total: number, isSoftTotal: boolean): string {
	return isSoftTotal && total < 21 ? `${total - 10}/${total}` : String(total);
}

// "Pair of 8s" while the pair can still be split, otherwise "Soft 8/18" or "Hard 12".
export function handLabel(cards: readonly Rank[], canSplit: boolean): string {
	const [firstCard] = cards;

	if (canSplit && firstCard) {
		return `Pair of ${rankLabel(firstCard)}s`;
	}

	const hand = handPoints(cards);
	const softness = isSoft(hand) ? 'Soft' : 'Hard';

	return `${softness} ${formatHandTotal(bestTotal(hand), isSoft(hand))}`;
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

const runningCountFormat = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 0,
	signDisplay: 'exceptZero',
});

const decksFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

// A true count, such as "+2.4" or "−0.8".
export function formatCount(count: number): string {
	return withTypographicMinus(countFormat.format(count));
}

// A running count, always a whole number, such as "+14" or "−3".
export function formatRunningCount(count: number): string {
	return withTypographicMinus(runningCountFormat.format(count));
}

// Decks left in the shoe, such as "4.5".
export function formatDecks(decks: number): string {
	return decksFormat.format(decks);
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
