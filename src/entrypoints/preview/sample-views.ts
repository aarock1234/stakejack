import { AdvisorStatus, CONNECTING_VIEW } from '@/advisor/advisor-view';
import type { AdvisorView, HandDecision, SeatOutlook } from '@/advisor/advisor-view';
import { cardFromScanCode, Rank } from '@/game/cards';
import type { CardFace } from '@/game/cards';
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

const TRACKED_SHOE = {
	trueCount: 2.4,
	cardsDealt: 187,
	shoeSize: SHOE_SIZE,
	edge: estimateEdge(2.4),
};

const UNTRACKED_SHOE = {
	cardsDealt: 0,
	shoeSize: SHOE_SIZE,
	edge: estimateEdge(undefined),
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

const OWN_OUTLOOK: SeatOutlook = {
	seatNumber: 3,
	isOwnSeat: true,
	hands: [
		{
			handIndex: 0,
			total: 19,
			isBust: false,
			isInPlay: false,
			outlook: NINETEEN_AGAINST_SIXTEEN,
		},
	],
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
		},
	},
	{
		id: SampleId.OVERVIEW,
		title: 'Between decisions',
		view: {
			status: AdvisorStatus.SEATED,
			wallet: WALLET,
			sessionChange: 42.5,
			shoe: TRACKED_SHOE,
			decisions: [],
			outlooks: [OWN_OUTLOOK],
		},
	},
	{
		id: SampleId.WATCHING,
		title: 'Watching',
		view: {
			status: AdvisorStatus.WATCHING,
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

// Outlooks for the seat strip at the bottom of the preview, one per kind of result.
export const PREVIEW_SEATS: readonly SeatOutlook[] = [
	{
		seatNumber: 0,
		isOwnSeat: false,
		hands: [
			{
				handIndex: 0,
				total: 14,
				isBust: false,
				isInPlay: true,
				outlook: NINETEEN_AGAINST_SIXTEEN,
			},
		],
	},
	{
		...OWN_OUTLOOK,
		seatNumber: 1,
		isOwnSeat: false,
	},
	{
		seatNumber: 2,
		isOwnSeat: false,
		hands: [
			{
				handIndex: 0,
				total: 24,
				isBust: true,
				isInPlay: false,
				outlook: {
					win: 0,
					push: 0,
					lose: 1,
				},
			},
		],
	},
	{
		seatNumber: 4,
		isOwnSeat: false,
		hands: [
			{
				handIndex: 0,
				total: 20,
				isBust: false,
				isInPlay: false,
				outlook: {
					win: 1,
					push: 0,
					lose: 0,
				},
			},
		],
	},
];
