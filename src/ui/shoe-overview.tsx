import type { ReactElement } from 'react';

import type { ReshuffleEstimate, ShoeSummary } from '@/advisor/shoe-view';

import { Caption } from './caption';
import { formatCount, formatDecks, formatRunningCount } from './format';

// Shown behind the (i) on the shoe section.
const SHOE_INFO = [
	'The count follows every card dealt at the table: every seat and the dealer, not only yours. Twos to sixes add one, tens and aces take one away, and sevens to nines leave it alone. That total is the running count.',
	'Divided by the decks still in the shoe, it becomes the true count shown up top. That is the one that matters: each point moves the edge about half a percent your way, because the cards left are richer in tens and aces, which bring more blackjacks and more dealer busts. The aim is to bet more only when the true count gives you the edge.',
	'More players do not change the count, they only use up the shoe faster. It needs every card since the shuffle, so it waits for a fresh shoe and resets if you leave the table. Pragmatic reshuffles about halfway through the eight decks, so the reshuffle estimate is approximate and big swings are rare.',
].join('\n\n');

type CountedShoe = {
	trueCount: number;
	runningCount: number;
	decksRemaining: number;
	reshuffle: ReshuffleEstimate;
	cardsDealt: number;
};

function countedShoe(shoe: ShoeSummary): CountedShoe | undefined {
	const { trueCount, runningCount, decksRemaining, reshuffle } = shoe;

	if (
		trueCount === undefined ||
		runningCount === undefined ||
		decksRemaining === undefined ||
		reshuffle === undefined
	) {
		return undefined;
	}

	return {
		trueCount,
		runningCount,
		decksRemaining,
		reshuffle,
		cardsDealt: shoe.cardsDealt,
	};
}

// "~13 rounds to reshuffle", or the cards left before a round has shown how many a round uses.
function reshuffleLabel(reshuffle: ReshuffleEstimate): string {
	if (reshuffle.roundsLeft === undefined) {
		return `~${reshuffle.cardsLeft} cards to reshuffle`;
	}

	const rounds = reshuffle.roundsLeft === 1 ? 'round' : 'rounds';

	return `~${reshuffle.roundsLeft} ${rounds} to reshuffle`;
}

type CountedShoeProps = {
	shoe: CountedShoe;
};

// How the true count is reached: the running count spread over the decks left.
function CountWorking({ shoe }: CountedShoeProps): ReactElement {
	return (
		<p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground">
			<span className="font-mono text-foreground tabular-nums">{formatRunningCount(shoe.runningCount)}</span>
			running ÷<span className="font-mono text-foreground tabular-nums">{formatDecks(shoe.decksRemaining)}</span>
			decks =<span className="font-mono text-foreground tabular-nums">{formatCount(shoe.trueCount)}</span>
			true
		</p>
	);
}

// How far through the shoe the dealer is, up to where the reshuffle is expected.
function ReshuffleProgress({ shoe }: CountedShoeProps): ReactElement {
	const reshuffleAt = shoe.cardsDealt + shoe.reshuffle.cardsLeft;
	const progress = reshuffleAt === 0 ? 0 : shoe.cardsDealt / reshuffleAt;

	return (
		<div className="flex flex-col gap-1.5">
			<div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-foreground/60"
					style={{
						width: `${Math.min(progress, 1) * 100}%`,
					}}
				/>
			</div>
			<div className="flex justify-between text-[11px] text-muted-foreground">
				<span>
					<span className="font-mono tabular-nums">{shoe.cardsDealt}</span> cards dealt
				</span>
				<span>{reshuffleLabel(shoe.reshuffle)}</span>
			</div>
		</div>
	);
}

type ShoeOverviewProps = {
	shoe: ShoeSummary;
};

// The true count and edge already sit in the panel header; this shows how the count is reached and how
// much of the shoe is left to play.
export function ShoeOverview({ shoe }: ShoeOverviewProps): ReactElement {
	const counted = countedShoe(shoe);

	return (
		<div className="flex flex-col gap-2.5">
			<Caption info={SHOE_INFO}>The shoe</Caption>

			{counted ? (
				<>
					<CountWorking shoe={counted} />
					<ReshuffleProgress shoe={counted} />
				</>
			) : (
				<p className="text-xs text-muted-foreground">Counting starts when the dealer opens a fresh shoe.</p>
			)}
		</div>
	);
}
