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

function cardName(card: CardFace): string {
	return `${card.face} of ${SUIT_NAMES[card.suit]}`;
}

function inkColor(card: CardFace): string {
	return isRedSuit(card.suit) ? 'text-card-ink-red' : 'text-card-ink';
}

// A small paper card: the face in the corner and the suit pip in the middle, as on a real card.
export function PlayingCard({ card }: PlayingCardProps): ReactElement {
	return (
		<span
			role="img"
			aria-label={cardName(card)}
			className={cn(
				'relative inline-flex h-10 w-7 shrink-0 flex-col rounded-[5px] bg-card-paper p-1 font-sans shadow-[0_1px_2px_rgb(0_0_0/45%),inset_0_-1px_0_rgb(0_0_0/12%)]',
				inkColor(card)
			)}
		>
			<span className="text-xs leading-none font-semibold tracking-tight">{card.face}</span>
			<span className="mt-auto self-end text-sm leading-none">{SUIT_SYMBOLS[card.suit]}</span>
		</span>
	);
}

// A card shrunk to a single line, face then suit, for the chips that rest on the table.
export function MiniPlayingCard({ card }: PlayingCardProps): ReactElement {
	return (
		<span
			role="img"
			aria-label={cardName(card)}
			className={cn(
				'inline-flex h-4.5 shrink-0 items-center gap-px rounded-[3px] bg-card-paper px-1 font-sans text-micro leading-none font-semibold tracking-tight shadow-[0_1px_1px_rgb(0_0_0/40%)]',
				inkColor(card)
			)}
		>
			{card.face}
			<span className="text-[10px]">{SUIT_SYMBOLS[card.suit]}</span>
		</span>
	);
}
