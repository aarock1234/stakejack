import { AdvisorStatus, CONNECTING_VIEW } from '@/advisor/advisor-view';
import type { AdvisorView, HandDecision } from '@/advisor/advisor-view';
import { dealerOutlook, SeatRole } from '@/advisor/outlook-view';
import type { SeatOutlook } from '@/advisor/outlook-view';
import { EMPTY_SESSION } from '@/advisor/session-tracker';
import type { SessionSummary } from '@/advisor/session-tracker';
import { UNTRACKED_SHOE } from '@/advisor/shoe-view';
import type { ShoeSummary } from '@/advisor/shoe-view';
import { BetKind } from '@/game/bets';
import { cardFromScanCode, Rank } from '@/game/cards';
import type { CardFace } from '@/game/cards';
import { sideBetWins } from '@/game/side-bets';
import { adviseHand, adviseInsurance } from '@/strategy/advice';
import { adviseBet, estimateEdge, SHOE_SIZE } from '@/strategy/betting';
import { handOutlook } from '@/strategy/outlook';

// Sample table states for the preview page, computed by the same engine the extension uses.

function card(scanCode: string): CardFace {
	const face = cardFromScanCode(scanCode);

	if (!face) {
		throw new Error(`invalid sample card ${scanCode}`);
	}

	return face;
}

const WALLET = {
	userId: 'preview',
	balance: 2450.75,
	currency: 'USD',
};

const LIMITS = {
	minimumBet: 5,
	maximumBet: 5000,
};

// Deep into a shoe rich in tens and aces, so the count favours the player.
const TRACKED_SHOE: ShoeSummary = {
	trueCount: 2.5,
	runningCount: 11,
	decksRemaining: 4.4,
	reshuffle: {
		cardsLeft: 21,
		roundsLeft: 1,
	},
	cardsDealt: 187,
	shoeSize: SHOE_SIZE,
	edge: estimateEdge(2.5),
};

const SESSION: SessionSummary = {
	lastRound: {
		wagered: 17,
		paid: 102,
		net: 85,
	},
	roundsPlayed: 18,
	wagered: 212,
	net: 42.5,
	expected: -2.85,
	moves: {
		movesPlayed: 16,
		movesMatched: 15,
		cost: 1.2,
	},
	bySeat: [
		{
			seatNumber: 0,
			roundsPlayed: 7,
			wagered: 81,
			net: 31.5,
		},
		{
			seatNumber: 3,
			roundsPlayed: 11,
			wagered: 131,
			net: 11,
		},
	],
};

type DecisionSample = {
	playerCards: readonly CardFace[];
	dealerUpCard: CardFace;
	handIndex?: number;
	isSplitHand?: boolean;
	isActive?: boolean;
	canDouble?: boolean;
	canSplit?: boolean;
	cashOut?: number;
};

function decision(sample: DecisionSample): HandDecision {
	const canSplit = sample.canSplit ?? false;

	return {
		seatNumber: 3,
		isBetBehind: false,
		handIndex: sample.handIndex ?? 0,
		isSplitHand: sample.isSplitHand ?? false,
		isActive: sample.isActive ?? true,
		canSplit,
		playerCards: sample.playerCards,
		dealerUpCard: sample.dealerUpCard,
		advice: adviseHand({
			playerCards: sample.playerCards.map(face => face.rank),
			dealerUpCard: sample.dealerUpCard.rank,
			canDouble: sample.canDouble ?? true,
			canSplit,
			cashOut:
				sample.cashOut === undefined
					? undefined
					: {
							amount: sample.cashOut,
							stake: 25,
						},
		}),
	};
}

// A standing 19 while the dealer draws from 16.
const NINETEEN_AGAINST_SIXTEEN = handOutlook({
	playerCards: [Rank.TEN, Rank.NINE],
	dealerCards: [Rank.SIX, Rank.TEN],
	isSplitHand: false,
	cardsOut: [Rank.TEN, Rank.NINE, Rank.SIX, Rank.TEN],
});

// A standing 17 behind another player, against the same dealer.
const SEVENTEEN_AGAINST_SIXTEEN = handOutlook({
	playerCards: [Rank.TEN, Rank.SEVEN],
	dealerCards: [Rank.SIX, Rank.TEN],
	isSplitHand: false,
	cardsOut: [Rank.TEN, Rank.NINE, Rank.TEN, Rank.SEVEN, Rank.SIX, Rank.TEN],
});

// The dealer turned a ten under their six and has to draw.
const DEALER_ON_SIXTEEN = dealerOutlook(
	[card('6H1'), card('KC2')],
	[Rank.TEN, Rank.NINE, Rank.TEN, Rank.SEVEN, Rank.SIX, Rank.TEN]
);

// A standing 20 against the same dealer.
const TWENTY_AGAINST_SIXTEEN = handOutlook({
	playerCards: [Rank.TEN, Rank.TEN],
	dealerCards: [Rank.SIX, Rank.TEN],
	isSplitHand: false,
	cardsOut: [Rank.TEN, Rank.TEN, Rank.SIX, Rank.TEN],
});

// Two kings of hearts under the dealer's six of hearts: a perfect pair and a 21+3 flush at once.
const OWN_CARDS = [card('KH1'), card('KH2')];

const OWN_SIDE_BET_STAKES = new Map([
	[BetKind.PERFECT_PAIRS, 2],
	[BetKind.TWENTY_ONE_PLUS_THREE, 5],
]);

const OWN_OUTLOOK: SeatOutlook = {
	seatNumber: 3,
	role: SeatRole.OWN,
	hands: [
		{
			handIndex: 0,
			cards: OWN_CARDS,
			total: 20,
			isSoft: false,
			isBust: false,
			isInPlay: false,
			outlook: TWENTY_AGAINST_SIXTEEN,
		},
	],
	sideBetWins: sideBetWins({
		startingCards: OWN_CARDS,
		dealerUpCard: card('6H1'),
		stakes: OWN_SIDE_BET_STAKES,
	}),
};

const BEHIND_OUTLOOK: SeatOutlook = {
	seatNumber: 5,
	role: SeatRole.BEHIND,
	hands: [
		{
			handIndex: 0,
			cards: [card('QD3'), card('7C4')],
			total: 17,
			isSoft: false,
			isBust: false,
			isInPlay: false,
			outlook: SEVENTEEN_AGAINST_SIXTEEN,
		},
	],
	sideBetWins: [],
};

export const SampleId = {
	MOVE: 'move',
	SPLIT: 'split',
	INSURANCE: 'insurance',
	BETTING: 'betting',
	OVERVIEW: 'overview',
	WATCHING: 'watching',
	LOADING: 'loading',
} as const;

export type SampleId = (typeof SampleId)[keyof typeof SampleId];

export type PreviewSample = {
	id: SampleId;
	title: string;
	view: AdvisorView;
};

export const PREVIEW_SAMPLES: readonly PreviewSample[] = [
	{
		id: SampleId.MOVE,
		title: 'Your move',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			// The first round of a session, so there is no last round to show yet.
			session: EMPTY_SESSION,
			shoe: TRACKED_SHOE,
			decisions: [
				decision({
					playerCards: [card('1S1'), card('7H2')],
					dealerUpCard: card('9C3'),
					cashOut: 21.5,
				}),
			],
			outlooks: [],
		},
	},
	{
		id: SampleId.SPLIT,
		title: 'Split hands',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			session: SESSION,
			shoe: TRACKED_SHOE,
			decisions: [
				decision({
					playerCards: [card('8D1'), card('3S2')],
					dealerUpCard: card('6H3'),
					handIndex: 0,
					isSplitHand: true,
				}),
				decision({
					playerCards: [card('8C4'), card('KD5')],
					dealerUpCard: card('6H3'),
					handIndex: 1,
					isSplitHand: true,
					isActive: false,
				}),
			],
			outlooks: [],
		},
	},
	{
		id: SampleId.INSURANCE,
		title: 'Insurance',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			session: SESSION,
			shoe: UNTRACKED_SHOE,
			insurance: adviseInsurance([Rank.TEN, Rank.EIGHT, Rank.ACE]),
			decisions: [],
			outlooks: [],
		},
	},
	{
		id: SampleId.BETTING,
		title: 'Betting',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			session: SESSION,
			shoe: TRACKED_SHOE,
			bet: {
				...adviseBet({
					balance: WALLET.balance,
					limits: LIMITS,
					trueCount: TRACKED_SHOE.trueCount,
				}),
				trueCount: TRACKED_SHOE.trueCount,
			},
			decisions: [],
			outlooks: [],
			seatSuggestion: {
				seatNumber: 0,
			},
			betBehind: {
				isWorthBetting: true,
				hasOwnSeat: true,
				isBettingOpen: true,
				seat: {
					seatNumber: 4,
					movesSeen: 25,
					shareByTheBook: 0.96,
				},
			},
		},
	},
	{
		id: SampleId.OVERVIEW,
		title: 'Between decisions',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			session: SESSION,
			shoe: TRACKED_SHOE,
			decisions: [],
			outlooks: [OWN_OUTLOOK, BEHIND_OUTLOOK],
			dealer: DEALER_ON_SIXTEEN,
		},
	},
	{
		id: SampleId.WATCHING,
		title: 'Watching',
		view: {
			status: AdvisorStatus.WATCHING,
			session: EMPTY_SESSION,
			shoe: UNTRACKED_SHOE,
			decisions: [],
			outlooks: [],
		},
	},
	{
		id: SampleId.LOADING,
		title: 'Loading',
		view: CONNECTING_VIEW,
	},
];

// Two black queens: a coloured pair for Perfect Pairs.
const PAIRED_CARDS = [card('QC1'), card('QS2')];

// The dealer's chip for the preview's table strip.
export const PREVIEW_DEALER = DEALER_ON_SIXTEEN;

// Outlooks for the seat strip at the bottom of the preview, one per kind of result.
export const PREVIEW_SEATS: readonly SeatOutlook[] = [
	{
		seatNumber: 0,
		role: SeatRole.OTHER,
		hands: [
			{
				handIndex: 0,
				cards: [card('1C1'), card('4D2')],
				total: 15,
				isSoft: true,
				isBust: false,
				isInPlay: true,
				outlook: NINETEEN_AGAINST_SIXTEEN,
			},
		],
		sideBetWins: [],
	},
	{
		...OWN_OUTLOOK,
		seatNumber: 1,
	},
	{
		seatNumber: 2,
		role: SeatRole.OTHER,
		hands: [
			{
				handIndex: 0,
				cards: [card('KH1'), card('4S2'), card('QD3')],
				total: 24,
				isSoft: false,
				isBust: true,
				isInPlay: false,
				outlook: {
					win: 0,
					push: 0,
					lose: 1,
				},
			},
		],
		sideBetWins: [],
	},
	{
		seatNumber: 4,
		role: SeatRole.OTHER,
		hands: [
			{
				handIndex: 0,
				cards: PAIRED_CARDS,
				total: 20,
				isSoft: false,
				isBust: false,
				isInPlay: false,
				outlook: {
					win: 1,
					push: 0,
					lose: 0,
				},
			},
		],
		sideBetWins: sideBetWins({
			startingCards: PAIRED_CARDS,
			stakes: new Map([[BetKind.PERFECT_PAIRS, 2]]),
		}),
	},
	BEHIND_OUTLOOK,
];
