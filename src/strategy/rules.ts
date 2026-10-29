import { Rank } from '@/game/cards';

// House rules shared by Pragmatic Play's classic live blackjack tables on Stake. Splitting is allowed
// once per seat, split aces receive one card each, and doubling after a split is allowed except on aces;
// those rules shape the expected value calculations directly rather than living here as flags.
export const TABLE_RULES = {
	deckCount: 8,
	dealerStandsOnSoft17: true,

	// The dealer only checks the hole card for blackjack behind an ace. Behind a ten the hole card stays
	// hidden until every player has acted, so doubled and split bets are lost to a dealer blackjack.
	dealerPeeksWith: [Rank.ACE],

	// The cut card sits roughly halfway through the shoe, so about half of it is dealt before a reshuffle.
	reshuffleShare: 0.5,
} as const;
