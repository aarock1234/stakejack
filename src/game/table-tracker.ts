import { ApiResponseKind } from './api-responses';
import type { ApiResponse, TableLimits, Wallet } from './api-responses';
import type { CardFace, Rank } from './cards';
import { CommandName } from './commands';
import type { GameCommand } from './commands';
import { MessageKind } from './messages';
import type { GameMessage, Hand } from './messages';
import { ShoeTracker } from './shoe-tracker';

const DEALER_SEAT = -1;

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
	#startingBalance: number | undefined;
	#limits: TableLimits | undefined;
	readonly #seatOwners = new Map<number, string>();
	readonly #playerSeats = new Set<number>();
	readonly #mainBets = new Map<number, number>();
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

			case MessageKind.MAIN_BET:
				this.#followRound(message.gameId);
				this.#recordOwner(message.seatNumber, message.userId);
				this.#mainBets.set(message.seatNumber, message.amount);
				break;

			case MessageKind.SEAT_TAKEN:
				this.#recordOwner(message.seatNumber, message.userId);
				this.#claimPendingSeat(message.seatNumber, message.userId);
				break;

			case MessageKind.SEAT_LEFT:
				this.#seatOwners.delete(message.seatNumber);
				this.#playerSeats.delete(message.seatNumber);
				break;
		}
	}

	receiveApiResponse(response: ApiResponse): void {
		switch (response.kind) {
			case ApiResponseKind.WALLET:
				this.#wallet = response.wallet;
				this.#userId = response.wallet.userId;
				this.#startingBalance ??= response.wallet.balance;
				break;

			case ApiResponseKind.TABLE_CONFIG:
				this.#tableId = response.tableId;
				this.#limits = response.limits;
				break;
		}
	}

	// Seats named in the player's own commands are theirs, whatever user id the game reports.
	send(command: GameCommand): void {
		if (command.userId) {
			this.#userId = command.userId;
		}

		for (const seatNumber of command.seatNumbers) {
			if (command.name === CommandName.SIT_DOWN) {
				this.#pendingSeat = seatNumber;
			} else if (command.name === CommandName.LEAVE_SEAT) {
				this.#playerSeats.delete(seatNumber);
				this.#seatOwners.delete(seatNumber);
			} else {
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

	// Profit or loss since the first balance seen in this frame.
	get sessionChange(): number | undefined {
		if (!this.#wallet || this.#startingBalance === undefined) {
			return undefined;
		}

		return this.#wallet.balance - this.#startingBalance;
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

	mainBetAt(seatNumber: number): number | undefined {
		return this.#mainBets.get(seatNumber);
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
