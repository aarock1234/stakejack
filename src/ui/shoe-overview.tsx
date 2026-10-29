import type { ReactElement } from 'react';

import type { ReshuffleEstimate, ShoeSummary } from '@/advisor/shoe-view';

import { SectionId } from './collapsed-sections';
import { CollapsibleSection } from './collapsible-section';
import { formatDecks, formatRunningCount } from './format';
import { ValueList } from './value-list';

// Shown behind the (i) on the shoe section.
const SHOE_INFO = [
	'The count follows every card dealt at the table: every seat and the dealer, not only yours. Twos to sixes add one, tens and aces take one away, and sevens to nines leave it alone. That total is the running count.',
	'Divided by the decks still in the shoe, it becomes the true count shown up top. That is the one that matters: each point moves the edge about half a percent your way, because the cards left are richer in tens and aces, which bring more blackjacks and more dealer busts. The aim is to bet more only when the true count gives you the edge.',
	'More players do not change the count, they only use up the shoe faster. It needs every card since the shuffle, so it waits for a fresh shoe and resets if you leave the table. Pragmatic reshuffles about halfway through the eight decks, so the reshuffle estimate is approximate and big swings are rare.',
].join('\n\n');

type CountedShoe = {
	runningCount: number;
	decksRemaining: number;
	reshuffle: ReshuffleEstimate;
	cardsDealt: number;
};

function countedShoe(shoe: ShoeSummary): CountedShoe | undefined {
	const { runningCount, decksRemaining, reshuffle } = shoe;

	if (runningCount === undefined || decksRemaining === undefined || reshuffle === undefined) {
		return undefined;
	}

	return {
		runningCount,
		decksRemaining,
		reshuffle,
		cardsDealt: shoe.cardsDealt,
	};
}

// "~13 rounds", or the cards left before a round has shown how many a round uses.
function reshuffleLabel(reshuffle: ReshuffleEstimate): string {
	if (reshuffle.roundsLeft === undefined) {
		return `~${reshuffle.cardsLeft} cards`;
	}

	const rounds = reshuffle.roundsLeft === 1 ? 'round' : 'rounds';

	return `~${reshuffle.roundsLeft} ${rounds}`;
}

type CountedShoeProps = {
	shoe: CountedShoe;
};

// How far through the shoe the dealer is, up to where the reshuffle is expected.
function ReshuffleBar({ shoe }: CountedShoeProps): ReactElement {
	const reshuffleAt = shoe.cardsDealt + shoe.reshuffle.cardsLeft;
	const progress = reshuffleAt === 0 ? 0 : Math.min(shoe.cardsDealt / reshuffleAt, 1);

	return (
		<div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
			<div
				className="h-full rounded-full bg-subtle"
				style={{
					width: `${progress * 100}%`,
				}}
			/>
		</div>
	);
}

function CountedShoeDetails({ shoe }: CountedShoeProps): ReactElement {
	return (
		<>
			<ValueList
				rows={[
					{
						key: 'running',
						label: 'Running count',
						value: formatRunningCount(shoe.runningCount),
					},
					{
						key: 'decks',
						label: 'Decks left',
						value: formatDecks(shoe.decksRemaining),
					},
					{
						key: 'reshuffle',
						label: 'Reshuffle in',
						value: reshuffleLabel(shoe.reshuffle),
					},
				]}
			/>
			<ReshuffleBar shoe={shoe} />
		</>
	);
}

type ShoeOverviewProps = {
	shoe: ShoeSummary;
};

// "Reshuffle in ~6 rounds" while folded, or a note that the shoe is not being counted yet.
function shoeSummary(shoe: CountedShoe | undefined): string {
	return shoe ? `Reshuffle in ${reshuffleLabel(shoe.reshuffle)}` : 'Not counted yet';
}

// The true count and edge already sit in the panel header; this shows what they come from and how much of
// the shoe is left to play.
export function ShoeOverview({ shoe }: ShoeOverviewProps): ReactElement {
	const counted = countedShoe(shoe);

	return (
		<CollapsibleSection id={SectionId.SHOE} title="The shoe" info={SHOE_INFO} summary={shoeSummary(counted)}>
			{counted ? (
				<CountedShoeDetails shoe={counted} />
			) : (
				<p className="text-sm text-muted-foreground">Counting starts when the dealer opens a fresh shoe.</p>
			)}
		</CollapsibleSection>
	);
}
