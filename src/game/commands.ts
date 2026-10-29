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

// A bet placed behind another player's hand: it rides on their decisions.
export type CommandBetBehind = {
	seatNumber: number;
	amount: number;
};

export type GameCommand = {
	name: string;
	userId?: string;
	// Every seat this command acts for: the command's own seat and the seats of any bets it places.
	seatNumbers: readonly number[];
	// The player's complete list of bets behind, present only on commands that place bets.
	betsBehind?: readonly CommandBetBehind[];
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

// Seats the player bets on as the hand's owner. Betting behind someone else's hand does not make the
// seat theirs: the other player still makes every decision on it.
function readBetSeats(data: string): number[] {
	const seats: number[] = [];

	for (const [, attributeText = ''] of data.matchAll(BET_PATTERN)) {
		const { seat, betbehind } = readAttributes(attributeText);

		if (seat !== undefined && betbehind !== 'true') {
			seats.push(Number(seat));
		}
	}

	return seats;
}

function readBetsBehind(data: string): CommandBetBehind[] {
	const betsBehind: CommandBetBehind[] = [];

	for (const [, attributeText = ''] of data.matchAll(BET_PATTERN)) {
		const { seat, amount, betbehind } = readAttributes(attributeText);
		const stake = Number(amount);

		if (seat !== undefined && betbehind === 'true' && Number.isFinite(stake)) {
			betsBehind.push({
				seatNumber: Number(seat),
				amount: stake,
			});
		}
	}

	return betsBehind;
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
	const seatNumbers = seatNum === undefined ? readBetSeats(data) : [seatNum, ...readBetSeats(data)];

	return {
		name,
		userId,
		seatNumbers: [...new Set(seatNumbers)],
		betsBehind: name === CommandName.PLACE_BETS ? readBetsBehind(data) : undefined,
	};
}
