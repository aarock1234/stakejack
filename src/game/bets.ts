import { z } from 'zod';

// What a bet is for. Doubles and splits add a second stake to a hand, while the side bets are judged on
// the first cards alone.
export const BetKind = {
	MAIN: 'main',
	DOUBLE: 'double',
	SPLIT: 'split',
	PERFECT_PAIRS: 'perfectPairs',
	TWENTY_ONE_PLUS_THREE: 'twentyOnePlusThree',
} as const;

export type BetKind = (typeof BetKind)[keyof typeof BetKind];

const BET_KINDS_BY_CATEGORY: Readonly<Record<string, BetKind>> = {
	MAIN: BetKind.MAIN,
	DOUBLE: BetKind.DOUBLE,
	SPLIT: BetKind.SPLIT,
	PERFECT_PAIRS: BetKind.PERFECT_PAIRS,
	BJ_21_PLUS_3: BetKind.TWENTY_ONE_PLUS_THREE,
};

// Each bet names the spot it sits on: 0 is the seat's own hand, 2 and 3 the side bets, and 4 the bets
// behind it. A bet behind follows the hand, so it is doubled and split along with it.
const BET_BEHIND_POSITION = '4';

export const betSchema = z
	.object({
		gameId: z.string(),
		seat: z.coerce.number(),
		amount: z.coerce.number(),
		betCategory: z.string(),
		betPos: z.string(),
		handIndex: z.coerce.number(),
		userId: z.string(),
	})
	.transform((bet, context) => {
		const kind = BET_KINDS_BY_CATEGORY[bet.betCategory];

		if (!kind) {
			context.addIssue({
				code: 'custom',
				message: `unknown bet category ${bet.betCategory}`,
			});

			return z.NEVER;
		}

		return {
			gameId: bet.gameId,
			seatNumber: bet.seat,
			handIndex: bet.handIndex,
			userId: bet.userId,
			amount: bet.amount,
			kind,
			isBehind: bet.betPos === BET_BEHIND_POSITION,
		};
	});

export type PlacedBet = z.infer<typeof betSchema>;
