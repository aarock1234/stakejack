import { ApiResponseKind } from './api-responses';
import type { ApiResponse, TableLimits, Wallet } from './api-responses';
import { BetKind } from './bets';
import type { PlacedBet } from './bets';
import type { CardFace, Rank } from './cards';
import { CommandName } from './commands';
import type { CommandBet, GameCommand } from './commands';
import { MessageKind } from './messages';
import type { DealtCard, GameMessage, Hand } from './messages';
import { ShoeTracker } from './shoe-tracker';

const DEALER_SEAT = -1;

const NO_SIDE_BETS: ReadonlySet<BetKind> = new Set();

// Follows one table: who sits where, the current round's hands and main bets, the shoe, the betting
// window, and the player's wallet. The player is identified from their wallet or their own outgoing
// commands, because the game socket never says "you" directly.
export class TableTracker {
	readonly shoe = new ShoeTracker();

	#gameId: string | undefined;
	#userId: string | undefined;
	#pendingSeat: number | undefined;
	#isBettingOpen = false;
	#hasGameTraffic = false;
	#tableId: string | undefined;
	#wallet: Wallet | undefined;
	#limits: TableLimits | undefined;
	readonly #seatOwners = new Map<number, string>();
	readonly #playerSeats = new Set<number>();
	readonly #mainBets = new Map<number, number>();
	readonly #sideBets = new Map<number, Set<BetKind>>();
	readonly #ownBetsBehind = new Map<number, number>();
	readonly #hands = new Map<number, readonly Hand[]>();

	// Any frame from the game socket, even one the advisor does not decode, proves a table is live here.
	noteGameFrame(): void {
		this.#hasGameTraffic = true;
	}

	get hasGameTraffic(): boolean {
		return this.#hasGameTraffic;
	}

	receive(message: GameMessage): void {
		switch (message.kind) {
			case MessageKind.BETS_OPENED:
				this.#startRound(message.gameId);
				this.#isBettingOpen = true;
				break;

			case MessageKind.BETS_CLOSED:
				this.#isBettingOpen = false;
				break;

			case MessageKind.SHOE_IDENTIFIED:
				if (message.isNewShoe) {
					this.shoe.startNewShoe(message.shoeCode);
				} else {
					this.shoe.identify(message.shoeCode);
				}
				break;

			case MessageKind.SEAT_HANDS:
				this.#followRound(message.gameId);
				this.#hands.set(message.seatNumber, message.hands);
				this.shoe.record(
					message.gameId,
					message.hands.flatMap(hand => hand.cards)
				);
				break;

			case MessageKind.BET_PLACED:
				this.#followRound(message.bet.gameId);
				this.#recordBet(message.bet);
				break;

			case MessageKind.SEAT_TAKEN:
				this.#recordOwner(message.seatNumber, message.userId);
				this.#claimPendingSeat(message.seatNumber, message.userId);
				break;

			case MessageKind.SEAT_LEFT:
				this.#seatOwners.delete(message.seatNumber);
				this.#playerSeats.delete(message.seatNumber);
				break;

			// What a round paid the player belongs to their session, not to the table.
			case MessageKind.ROUND_PAID:
				break;
		}
	}

	receiveApiResponse(response: ApiResponse): void {
		switch (response.kind) {
			case ApiResponseKind.WALLET:
				this.#wallet = response.wallet;
				this.#userId = response.wallet.userId;
				break;

			case ApiResponseKind.TABLE_CONFIG:
				this.#tableId = response.tableId;
				this.#limits = response.limits;
				break;
		}
	}

	// Seats named in the player's own commands are theirs, whatever user id the game reports, except
	// seats they only bet behind.
	send(command: GameCommand): void {
		if (command.userId) {
			this.#userId = command.userId;
		}

		if (command.betsBehind) {
			this.#replaceOwnBetsBehind(command.betsBehind);
		}

		for (const seatNumber of command.seatNumbers) {
			if (command.name === CommandName.SIT_DOWN) {
				this.#pendingSeat = seatNumber;
			} else if (command.name === CommandName.LEAVE_SEAT) {
				this.#playerSeats.delete(seatNumber);
				this.#seatOwners.delete(seatNumber);
			} else if (!this.#ownBetsBehind.has(seatNumber)) {
				this.#playerSeats.add(seatNumber);
			}
		}
	}

	get isBettingOpen(): boolean {
		return this.#isBettingOpen;
	}

	get tableId(): string | undefined {
		return this.#tableId;
	}

	get wallet(): Wallet | undefined {
		return this.#wallet;
	}

	// The player's user id, once their wallet or one of their commands has named it.
	get userId(): string | undefined {
		return this.#userId;
	}

	get limits(): TableLimits | undefined {
		return this.#limits;
	}

	ownSeats(): number[] {
		const seats = new Set(this.#playerSeats);

		for (const [seatNumber, userId] of this.#seatOwners) {
			if (userId === this.#userId) {
				seats.add(seatNumber);
			}
		}

		return [...seats].toSorted((left, right) => left - right);
	}

	dealerFaces(): readonly CardFace[] {
		return this.#hands.get(DEALER_SEAT)?.[0]?.cards ?? [];
	}

	dealerCards(): readonly Rank[] {
		const dealerHand = this.#hands.get(DEALER_SEAT)?.[0];

		return dealerHand?.cards.map(card => card.rank) ?? [];
	}

	handsAt(seatNumber: number): readonly Hand[] {
		return this.#hands.get(seatNumber) ?? [];
	}

	// Player seats holding cards this round, in seat order.
	seatsInPlay(): number[] {
		return [...this.#hands.keys()]
			.filter(seatNumber => seatNumber !== DEALER_SEAT)
			.toSorted((left, right) => left - right);
	}

	// Every card on the table this round, dealer included.
	roundRanks(): Rank[] {
		return [...this.#hands.values()].flatMap(hands => hands.flatMap(hand => hand.cards.map(card => card.rank)));
	}

	// The seat owner's own main bet, never a bet placed behind it.
	mainBetAt(seatNumber: number): number | undefined {
		return this.#mainBets.get(seatNumber);
	}

	// The side bets placed on a seat this round, by anyone sitting there.
	sideBetsAt(seatNumber: number): ReadonlySet<BetKind> {
		return this.#sideBets.get(seatNumber) ?? NO_SIDE_BETS;
	}

	// A seat's first two cards in the order they were dealt, which a split later moves into separate hands.
	startingCardsAt(seatNumber: number): readonly DealtCard[] {
		const cards = this.handsAt(seatNumber).flatMap(hand => hand.cards);

		return cards.toSorted((left, right) => left.sequence - right.sequence).slice(0, 2);
	}

	// Seats where the player has a bet behind someone else's hand this round, in seat order.
	betBehindSeats(): number[] {
		const ownSeats = this.ownSeats();

		return [...this.#ownBetsBehind.keys()]
			.filter(seatNumber => !ownSeats.includes(seatNumber))
			.toSorted((left, right) => left - right);
	}

	#isOwnedByAnother(seatNumber: number, userId: string): boolean {
		const owner = this.#seatOwners.get(seatNumber);

		return owner !== undefined && owner !== userId;
	}

	// Only main bets settle who owns a seat and what its hand is staked at. Someone betting on a seat another
	// player owns is betting behind, even if the bet does not sit on the bet-behind spot.
	#recordBet(bet: PlacedBet): void {
		if (bet.kind === BetKind.PERFECT_PAIRS || bet.kind === BetKind.TWENTY_ONE_PLUS_THREE) {
			this.#recordSideBet(bet);
			return;
		}

		if (bet.kind !== BetKind.MAIN) {
			return;
		}

		if (bet.isBehind || this.#isOwnedByAnother(bet.seatNumber, bet.userId)) {
			this.#recordBetBehind(bet);
			return;
		}

		this.#recordOwner(bet.seatNumber, bet.userId);
		this.#mainBets.set(bet.seatNumber, bet.amount);
	}

	#recordSideBet(bet: PlacedBet): void {
		const bets = this.#sideBets.get(bet.seatNumber) ?? new Set<BetKind>();

		if (bet.amount > 0) {
			bets.add(bet.kind);
		} else {
			bets.delete(bet.kind);
		}

		this.#sideBets.set(bet.seatNumber, bets);
	}

	#recordBetBehind(bet: PlacedBet): void {
		if (bet.userId === this.#userId && bet.amount > 0) {
			this.#ownBetsBehind.set(bet.seatNumber, bet.amount);
		}
	}

	// The player's bet list names every bet behind they still have, so any other is taken back.
	#replaceOwnBetsBehind(betsBehind: readonly CommandBet[]): void {
		this.#ownBetsBehind.clear();

		for (const betBehind of betsBehind) {
			if (betBehind.amount > 0) {
				this.#ownBetsBehind.set(betBehind.seatNumber, betBehind.amount);
			}
		}
	}

	// The server's word on who owns a seat overrides a claim made from the player's own commands.
	#recordOwner(seatNumber: number, userId: string): void {
		this.#seatOwners.set(seatNumber, userId);

		if (this.#userId !== undefined && userId !== this.#userId) {
			this.#playerSeats.delete(seatNumber);
		}
	}

	#followRound(gameId: string): void {
		if (gameId !== this.#gameId) {
			this.#startRound(gameId);
		}
	}

	#startRound(gameId: string): void {
		this.#gameId = gameId;
		this.#hands.clear();
		this.#mainBets.clear();
		this.#sideBets.clear();
		this.#ownBetsBehind.clear();
	}

	// A sitdown command carries no user id, but the server's seat announcement that follows it does.
	#claimPendingSeat(seatNumber: number, userId: string): void {
		if (this.#pendingSeat !== seatNumber) {
			return;
		}

		this.#userId = userId;
		this.#pendingSeat = undefined;
	}
}
