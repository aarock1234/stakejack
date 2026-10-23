import { parseApiResponse } from '@/game/api-responses';
import { BridgeSource } from '@/game/bridge';
import type { ApiPath, BridgeMessage } from '@/game/bridge';
import { parseGameCommand } from '@/game/commands';
import { MessageKind, parseGameMessage } from '@/game/messages';
import { TableTracker } from '@/game/table-tracker';

import { CONNECTING_VIEW, describeTable } from './advisor-view';
import type { AdvisorView } from './advisor-view';
import type { ShoeHistory } from './shoe-history';

type Listener = () => void;

// Owns the table for one game frame and publishes a fresh view whenever a relevant message arrives.
// Its subscribe and getSnapshot callbacks follow React's external store contract. With a shoe history,
// it also saves the shoe each round and resumes it after a reload.
export class AdvisorStore {
	readonly #table = new TableTracker();
	readonly #listeners = new Set<Listener>();
	readonly #history: ShoeHistory | undefined;
	#view: AdvisorView = CONNECTING_VIEW;
	#isLoadingHistory = false;

	constructor(history?: ShoeHistory) {
		this.#history = history;
	}

	handle(message: BridgeMessage): void {
		const isFirstGameFrame = message.source === BridgeSource.SOCKET_RECEIVED && !this.#table.hasGameTraffic;
		const isRelevant = this.#apply(message);

		this.#resumeShoeIfNeeded();

		if (isRelevant || isFirstGameFrame) {
			this.#publish(describeTable(this.#table));
		}
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

		// A new round starting is a natural checkpoint: everything dealt so far belongs to the shoe.
		if (message.kind === MessageKind.BETS_OPENED) {
			this.#saveShoe();
		}

		return true;
	}

	#saveShoe(): void {
		const tableId = this.#table.tableId;
		const snapshot = this.#table.shoe.snapshot();

		if (!this.#history || !tableId || !snapshot) {
			return;
		}

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
				this.#publish(describeTable(this.#table));
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

	#publish(view: AdvisorView): void {
		this.#view = view;

		for (const listener of this.#listeners) {
			listener();
		}
	}
}
