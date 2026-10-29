import { parseApiResponse } from '@/game/api-responses';
import { BridgeSource } from '@/game/bridge';
import type { ApiPath, BridgeMessage } from '@/game/bridge';
import { parseGameCommand } from '@/game/commands';
import { MessageKind, parseGameMessage } from '@/game/messages';
import type { GameMessage } from '@/game/messages';
import { TableTracker } from '@/game/table-tracker';

import { CONNECTING_VIEW, describeTable } from './advisor-view';
import type { AdvisorView } from './advisor-view';
import { PlayerReview } from './player-review';
import { SessionTracker } from './session-tracker';
import type { ShoeHistory } from './shoe-history';
import { currentEdge } from './shoe-view';

type Listener = () => void;

// The shoe history ignores snapshots older than its limit, so the shoe is saved well within it.
const SHOE_SAVE_INTERVAL_MS = 5 * 1000;

// Owns the table and the player's session for one game frame, and publishes a fresh view whenever a
// relevant message arrives. Its subscribe and getSnapshot callbacks follow React's external store
// contract. With a shoe history, it also saves the shoe every few seconds and resumes it after a reload.
export class AdvisorStore {
	readonly #table = new TableTracker();
	readonly #session = new SessionTracker();
	readonly #players = new PlayerReview();
	readonly #listeners = new Set<Listener>();
	readonly #history: ShoeHistory | undefined;
	#view: AdvisorView = CONNECTING_VIEW;
	#isLoadingHistory = false;
	#lastShoeSave = 0;

	constructor(history?: ShoeHistory) {
		this.#history = history;
	}

	handle(message: BridgeMessage): void {
		const isFirstGameFrame = message.source === BridgeSource.SOCKET_RECEIVED && !this.#table.hasGameTraffic;
		const isRelevant = this.#apply(message);

		this.#saveShoeIfDue();
		this.#resumeShoeIfNeeded();

		if (isRelevant || isFirstGameFrame) {
			this.#publish();
		}
	}

	// Catches up on everything the page saw before this store started, such as after an extension update,
	// then publishes once. Advice is only worked out again when something it depends on changes, so the
	// player's moves can still be compared with it; describing the table after every message would take
	// seconds.
	replay(messages: readonly BridgeMessage[]): void {
		let offers = this.#ownOffersKey();

		for (const message of messages) {
			this.#apply(message);

			const nextOffers = this.#ownOffersKey();

			if (nextOffers !== offers) {
				this.#describe();
				offers = nextOffers;
			}
		}

		this.#saveShoe();
		this.#resumeShoeIfNeeded();
		this.#publish();

		console.info(`stakejack: caught up on ${messages.length} earlier messages`);
	}

	subscribe = (listener: Listener): (() => void) => {
		this.#listeners.add(listener);

		return () => {
			this.#listeners.delete(listener);
		};
	};

	getSnapshot = (): AdvisorView => {
		return this.#view;
	};

	// Returns whether the message changed anything the advisor tracks.
	#apply(message: BridgeMessage): boolean {
		switch (message.source) {
			case BridgeSource.SOCKET_RECEIVED:
				this.#table.noteGameFrame();
				return this.#receive(message.data);

			case BridgeSource.SOCKET_SENT:
				return this.#send(message.data);

			case BridgeSource.API_RESPONSE:
				return this.#receiveApiResponse(message.path, message.data);
		}
	}

	#receive(data: string): boolean {
		const message = parseGameMessage(data);

		if (!message) {
			return false;
		}

		this.#table.receive(message);
		this.#followSession(message);
		this.#followOtherPlayers(message);

		return true;
	}

	// Judges the moves of everyone else at the table, to know whose hand is worth betting behind.
	#followOtherPlayers(message: GameMessage): void {
		if (message.kind === MessageKind.BETS_OPENED) {
			this.#players.startRound();
			return;
		}

		if (message.kind !== MessageKind.SEAT_HANDS || this.#table.ownSeats().includes(message.seatNumber)) {
			return;
		}

		const ownerId = this.#table.ownerOf(message.seatNumber);
		const [dealerUpCard] = this.#table.dealerCards();

		if (ownerId === undefined || ownerId === this.#table.userId || dealerUpCard === undefined) {
			return;
		}

		this.#players.noteSeat({
			seatNumber: message.seatNumber,
			ownerId,
			hands: message.hands,
			dealerUpCard,
		});
	}

	// Feeds the session the player's own bets, payouts, and moves.
	#followSession(message: GameMessage): void {
		switch (message.kind) {
			case MessageKind.BETS_OPENED:
				this.#session.startRound();
				break;

			case MessageKind.BET_PLACED:
				if (message.bet.userId === this.#table.userId) {
					this.#session.noteBet(message.bet, currentEdge(this.#table));
				}
				break;

			case MessageKind.ROUND_PAID:
				this.#session.noteRoundPaid(message.gameId, message.amount);
				break;

			case MessageKind.SEAT_HANDS:
				if (this.#table.ownSeats().includes(message.seatNumber)) {
					this.#session.noteHands(message.seatNumber, message.hands);
				}
				break;

			// Seating, the shoe, and the betting window only matter to the table.
			case MessageKind.BETS_CLOSED:
			case MessageKind.SEAT_TAKEN:
			case MessageKind.SEAT_LEFT:
			case MessageKind.SHOE_IDENTIFIED:
				break;
		}
	}

	// What the advice on the player's waiting hands depends on: which hands are waiting on a move, as
	// "seat:hand:cards" entries, and how many cards the table has shown. It changes whenever the advice
	// needs working out again, and is empty while the player has nothing to decide.
	#ownOffersKey(): string {
		const offers: string[] = [];

		for (const seatNumber of this.#table.ownSeats()) {
			for (const [handIndex, hand] of this.#table.handsAt(seatNumber).entries()) {
				if (hand.decisionOffer) {
					offers.push(`${seatNumber}:${handIndex}:${hand.cards.length}`);
				}
			}
		}

		if (offers.length === 0) {
			return '';
		}

		return `${offers.join(',')} after ${this.#table.roundRanks().length} cards`;
	}

	// Keeps a recent snapshot in storage, so a reload or an extension update finds the count where it was.
	#saveShoeIfDue(): void {
		if (Date.now() - this.#lastShoeSave >= SHOE_SAVE_INTERVAL_MS) {
			this.#saveShoe();
		}
	}

	#saveShoe(): void {
		const tableId = this.#table.tableId;
		const snapshot = this.#table.shoe.snapshot();

		if (!this.#history || !tableId || !snapshot) {
			return;
		}

		this.#lastShoeSave = Date.now();

		this.#history.save(tableId, snapshot).catch((error: unknown) => {
			console.warn('stakejack: could not save the shoe', error);
		});
	}

	// Looks for a saved snapshot once both the table and the shoe in play are known.
	#resumeShoeIfNeeded(): void {
		const tableId = this.#table.tableId;
		const shoe = this.#table.shoe;

		if (!this.#history || !tableId || !shoe.isAwaitingHistory || this.#isLoadingHistory) {
			return;
		}

		this.#isLoadingHistory = true;

		this.#history
			.load(tableId)
			.then(snapshot => {
				shoe.resume(snapshot);
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not load the shoe', error);
				shoe.resume(undefined);
			})
			.finally(() => {
				this.#isLoadingHistory = false;
				this.#publish();
			});
	}

	#send(data: string): boolean {
		const command = parseGameCommand(data);

		if (!command) {
			return false;
		}

		this.#table.send(command);

		return true;
	}

	#receiveApiResponse(path: ApiPath, data: string): boolean {
		const response = parseApiResponse(path, data);

		if (!response) {
			return false;
		}

		this.#table.receiveApiResponse(response);

		return true;
	}

	// Works out the view, and remembers the advice in it so the player's next moves can be compared.
	#describe(): AdvisorView {
		const view = describeTable(this.#table, {
			session: this.#session.summary,
			players: this.#players.records,
		});

		this.#session.noteOfferedAdvice(view.decisions, seatNumber => this.#table.mainBetAt(seatNumber));

		return view;
	}

	#publish(): void {
		this.#view = this.#describe();

		for (const listener of this.#listeners) {
			listener();
		}
	}
}
