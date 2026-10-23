import type { ReactElement } from 'react';

import { Suit } from '@/game/cards';
import type { CardFace } from '@/game/cards';
import { cn } from '@/lib/utils';

const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
	[Suit.HEARTS]: '♥',
	[Suit.DIAMONDS]: '♦',
	[Suit.CLUBS]: '♣',
	[Suit.SPADES]: '♠',
};

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
	[Suit.HEARTS]: 'hearts',
	[Suit.DIAMONDS]: 'diamonds',
	[Suit.CLUBS]: 'clubs',
	[Suit.SPADES]: 'spades',
};

function isRedSuit(suit: Suit): boolean {
	return suit === Suit.HEARTS || suit === Suit.DIAMONDS;
}

type PlayingCardProps = {
	card: CardFace;
};

// A small paper card: the face in the corner and the suit pip in the middle, as on a real card.
export function PlayingCard({ card }: PlayingCardProps): ReactElement {
	return (
		<span
			role="img"
			aria-label={`${card.face} of ${SUIT_NAMES[card.suit]}`}
			className={cn(
				'relative inline-flex h-10 w-7 shrink-0 flex-col rounded-[5px] bg-card-paper p-1 font-mono shadow-[0_1px_2px_oklch(0_0_0/45%),inset_0_-1px_0_oklch(0_0_0/12%)]',
				isRedSuit(card.suit) ? 'text-card-ink-red' : 'text-card-ink'
			)}
		>
			<span className="text-[11px] leading-none font-semibold tracking-tighter">{card.face}</span>
			<span className="mt-auto self-end text-sm leading-none">{SUIT_SYMBOLS[card.suit]}</span>
		</span>
	);
}
