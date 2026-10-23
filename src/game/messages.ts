import { z } from 'zod';

import { cardFromScanCode } from './cards';

// Messages from the Pragmatic Play game server are JSON objects with a single key naming the message.
// Only the messages that affect advice are decoded; everything else is ignored.

// Each card dealt in a round has its own sequence number, which stays with the card when a split moves it
// to another hand.
const cardSchema = z
	.object({
		scanCode: z.string(),
		seq: z.number(),
	})
	.transform((card, context) => {
		const face = cardFromScanCode(card.scanCode);

		if (!face) {
			context.addIssue({
				code: 'custom',
				message: `unknown card scan code ${card.scanCode}`,
			});

			return z.NEVER;
		}

		return {
			...face,
			sequence: card.seq,
		};
	});

export type DealtCard = z.infer<typeof cardSchema>;

const decisionOfferSchema = z.object({
	canDouble: z.boolean(),
	canSplit: z.boolean(),
	cashOut: z.number().optional(),
});

export type DecisionOffer = z.infer<typeof decisionOfferSchema>;

const handSchema = z.object({
	cards: z.array(cardSchema),
	decisionOffer: decisionOfferSchema.optional(),
	activeHand: z.boolean().optional(),
	isDealingCompleted: z.boolean().optional(),
});

export type Hand = z.infer<typeof handSchema>;

// A full snapshot of one seat's hands. Seat -1 is the dealer; h1 appears after a split.
const playerSeatSchema = z
	.object({
		gameId: z.string(),
		seatNumber: z.number(),
		h0: handSchema.optional(),
		h1: handSchema.optional(),
	})
	.transform(seat => ({
		gameId: seat.gameId,
		seatNumber: seat.seatNumber,
		hands: [seat.h0, seat.h1].filter(hand => hand !== undefined),
	}));

const SeatEvent = {
	SIT: 'sit',
	STAND: 'stand',
} as const;

const seatSchema = z.object({
	user_id: z.string(),
	num: z.coerce.number(),
	event: z.enum(SeatEvent),
});

const BetCategory = {
	MAIN: 'MAIN',
} as const;

const betSchema = z.object({
	gameId: z.string(),
	seat: z.coerce.number(),
	amount: z.coerce.number(),
	betCategory: z.string(),
	userId: z.string(),
});

const bettingWindowSchema = z.object({
	game: z.string(),
});

// Every connection opens with the current shoe's code, which stays the same until the dealer changes
// shoes. A shoe change repeats the message with changeShoe: "true".
const currentShoeSchema = z.object({
	code: z.string(),
	changeShoe: z.string().optional(),
});

export const MessageKind = {
	SEAT_HANDS: 'seatHands',
	SEAT_TAKEN: 'seatTaken',
	SEAT_LEFT: 'seatLeft',
	MAIN_BET: 'mainBet',
	BETS_OPENED: 'betsOpened',
	BETS_CLOSED: 'betsClosed',
	SHOE_IDENTIFIED: 'shoeIdentified',
} as const;

const gameMessageSchema = z.union([
	z
		.object({
			playerSeat: playerSeatSchema,
		})
		.transform(message => ({
			kind: MessageKind.SEAT_HANDS,
			...message.playerSeat,
		})),
	z
		.object({
			seat: seatSchema,
		})
		.transform(message => ({
			kind: message.seat.event === SeatEvent.SIT ? MessageKind.SEAT_TAKEN : MessageKind.SEAT_LEFT,
			seatNumber: message.seat.num,
			userId: message.seat.user_id,
		})),
	z
		.object({
			bet: betSchema.refine(bet => bet.betCategory === BetCategory.MAIN),
		})
		.transform(message => ({
			kind: MessageKind.MAIN_BET,
			gameId: message.bet.gameId,
			seatNumber: message.bet.seat,
			userId: message.bet.userId,
			amount: message.bet.amount,
		})),
	z
		.object({
			betsopen: bettingWindowSchema,
		})
		.transform(message => ({
			kind: MessageKind.BETS_OPENED,
			gameId: message.betsopen.game,
		})),
	z
		.object({
			betsclosed: bettingWindowSchema,
		})
		.transform(message => ({
			kind: MessageKind.BETS_CLOSED,
			gameId: message.betsclosed.game,
		})),
	z
		.object({
			currentShoe: currentShoeSchema,
		})
		.transform(message => ({
			kind: MessageKind.SHOE_IDENTIFIED,
			shoeCode: message.currentShoe.code,
			isNewShoe: message.currentShoe.changeShoe === 'true',
		})),
]);

export type GameMessage = z.infer<typeof gameMessageSchema>;

export function parseGameMessage(data: string): GameMessage | undefined {
	let json: unknown;

	try {
		json = JSON.parse(data);
	} catch {
		return undefined;
	}

	const result = gameMessageSchema.safeParse(json);

	return result.success ? result.data : undefined;
}
