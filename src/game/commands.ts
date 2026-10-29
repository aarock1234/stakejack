import { z } from 'zod';

// The game client sends XML commands such as
// <command channel="..."><sitdown gameMode="blackjack_desktop" seatNum="5"></sitdown></command>.
// Only the command name and the attributes identifying the player and their seats matter here.
const COMMAND_PATTERN = /^<command[^>]*>\s*<(\w+)([^>]*)>/;
const ATTRIBUTE_PATTERN = /(\w+)="([^"]*)"/g;

// Bets name their seat on nested elements: <lpbet ...><bet seat="5" amount="6" betbehind="false" .../></lpbet>.
const BET_PATTERN = /<bet\s([^>]*)>/g;

export const CommandName = {
	SIT_DOWN: 'sitdown',
	LEAVE_SEAT: 'unseat',
	// Restates every bet the player has on the table, so a bet missing from it has been taken back.
	PLACE_BETS: 'lpbet',
} as const;

const commandAttributesSchema = z.object({
	userId: z.string().optional(),
	seatNum: z.coerce.number().optional(),
});

// One <bet> element of a command, such as <bet seat="5" amount="6" betbehind="false" .../>. A bet behind
// another player's hand rides on their decisions.
const commandBetSchema = z
	.object({
		seat: z.coerce.number(),
		amount: z.coerce.number(),
		betbehind: z.stringbool().default(false),
	})
	.transform(bet => ({
		seatNumber: bet.seat,
		amount: bet.amount,
		isBehind: bet.betbehind,
	}));

export type CommandBet = z.infer<typeof commandBetSchema>;

export type GameCommand = {
	name: string;
	userId?: string;
	// Every seat this command acts for: the command's own seat and the seats it bets on as their owner.
	seatNumbers: readonly number[];
	// The player's complete list of bets behind, present only on commands that place bets.
	betsBehind?: readonly CommandBet[];
};

function readAttributes(attributeText: string): Record<string, string> {
	const attributes: Record<string, string> = {};

	for (const [, key, value] of attributeText.matchAll(ATTRIBUTE_PATTERN)) {
		if (key !== undefined && value !== undefined) {
			attributes[key] = value;
		}
	}

	return attributes;
}

function readBets(data: string): CommandBet[] {
	const bets: CommandBet[] = [];

	for (const [, attributeText = ''] of data.matchAll(BET_PATTERN)) {
		const result = commandBetSchema.safeParse(readAttributes(attributeText));

		if (result.success) {
			bets.push(result.data);
		}
	}

	return bets;
}

export function parseGameCommand(data: string): GameCommand | undefined {
	const match = COMMAND_PATTERN.exec(data);

	if (!match) {
		return undefined;
	}

	const [, name = '', attributeText = ''] = match;
	const result = commandAttributesSchema.safeParse(readAttributes(attributeText));

	if (!result.success) {
		return undefined;
	}

	const { userId, seatNum } = result.data;
	const bets = readBets(data);

	// Betting behind someone else's hand does not make the seat the player's: its owner still makes every
	// decision on it.
	const ownedBetSeats = bets.filter(bet => !bet.isBehind).map(bet => bet.seatNumber);
	const seatNumbers = seatNum === undefined ? ownedBetSeats : [seatNum, ...ownedBetSeats];

	return {
		name,
		userId,
		seatNumbers: [...new Set(seatNumbers)],
		betsBehind: name === CommandName.PLACE_BETS ? bets.filter(bet => bet.isBehind) : undefined,
	};
}
