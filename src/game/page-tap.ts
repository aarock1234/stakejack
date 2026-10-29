import {
	BRIDGE_EVENT,
	BridgeSource,
	HISTORY_EVENT,
	HISTORY_REQUEST_EVENT,
	isGameSocketUrl,
	isReplayedSocketMessage,
	watchedApiPath,
} from './bridge';
import type { ApiPath, BridgeMessage } from './bridge';

// Several hours of play at a busy table. Past this, the oldest messages give way.
const HISTORY_LIMIT = 20_000;

// What the tap has seen in this page, kept for a content script that starts late, such as after an
// extension update: every socket message the advisor reads, in order, and the latest response from each
// watched API.
class TapHistory {
	readonly #socketMessages: BridgeMessage[] = [];
	readonly #latestApiResponses = new Map<ApiPath, BridgeMessage>();

	remember(message: BridgeMessage): void {
		if (message.source === BridgeSource.API_RESPONSE) {
			this.#latestApiResponses.set(message.path, message);
			return;
		}

		if (message.source === BridgeSource.SOCKET_RECEIVED && !isReplayedSocketMessage(message.data)) {
			return;
		}

		this.#socketMessages.push(message);

		if (this.#socketMessages.length > HISTORY_LIMIT) {
			this.#socketMessages.shift();
		}
	}

	// The API responses come first, so the player's wallet is known before their bets are replayed.
	messages(): BridgeMessage[] {
		return [...this.#latestApiResponses.values(), ...this.#socketMessages];
	}
}

const history = new TapHistory();

function dispatch(eventName: string, detail: unknown): void {
	const event = new CustomEvent(eventName, {
		detail: JSON.stringify(detail),
	});

	document.dispatchEvent(event);
}

function forward(message: BridgeMessage): void {
	history.remember(message);
	dispatch(BRIDGE_EVENT, message);
}

function sendHistory(): void {
	const messages = history.messages();

	if (messages.length > 0) {
		dispatch(HISTORY_EVENT, messages);
	}
}

const tappedSockets = new WeakSet<WebSocket>();

// Starts copying a game socket's incoming frames to the extension, once per socket.
function tapSocket(socket: WebSocket): void {
	if (tappedSockets.has(socket) || !isGameSocketUrl(socket.url)) {
		return;
	}

	tappedSockets.add(socket);
	console.info('stakejack: watching the game socket');

	socket.addEventListener('message', event => {
		if (typeof event.data === 'string') {
			forward({
				source: BridgeSource.SOCKET_RECEIVED,
				data: event.data,
			});
		}
	});
}

// Replaces the page's WebSocket with a subclass, so a game socket is watched from its very first frame.
// The game client builds its own socket class on top of window.WebSocket, which only works when the tap
// loads first.
function installSocketConstructorTap(): void {
	const NativeWebSocket = window.WebSocket;

	class TappedWebSocket extends NativeWebSocket {
		constructor(url: string | URL, protocols?: string | string[]) {
			super(url, protocols);
			tapSocket(this);
		}
	}

	window.WebSocket = TappedWebSocket;
}

// Firefox can run the tap after the game client has already taken hold of the original WebSocket. Every
// socket still sends through the shared prototype, and the game sends as soon as it connects, so a socket
// the constructor missed is picked up there.
function installSocketSendTap(): void {
	// The original method is kept to call on each socket, with that socket as its receiver.
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const nativeSend = WebSocket.prototype.send;

	WebSocket.prototype.send = function (this: WebSocket, data: Parameters<WebSocket['send']>[0]): void {
		tapSocket(this);

		if (tappedSockets.has(this) && typeof data === 'string') {
			forward({
				source: BridgeSource.SOCKET_SENT,
				data,
			});
		}

		nativeSend.call(this, data);
	};
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
	if (input instanceof Request) {
		return input.url;
	}

	return input instanceof URL ? input.href : input;
}

async function forwardApiResponse(path: ApiPath, response: Response): Promise<void> {
	if (!response.ok) {
		return;
	}

	forward({
		source: BridgeSource.API_RESPONSE,
		path,
		data: await response.text(),
	});
}

// Wraps fetch to copy the wallet and table config responses. The game receives the original response;
// the extension reads a clone.
function installFetchTap(): void {
	const nativeFetch = window.fetch.bind(window);

	window.fetch = async (input, init) => {
		const response = await nativeFetch(input, init);
		const path = watchedApiPath(requestUrl(input));

		if (path) {
			forwardApiResponse(path, response.clone()).catch((error: unknown) => {
				console.warn(`stakejack: could not read ${path}`, error);
			});
		}

		return response;
	};
}

// Reloading the extension injects this script again into pages that are already open. The first tap
// keeps working because it only dispatches DOM events, so a second one would forward everything twice.
const INSTALLED_MARKER = 'stakejackPageTap';

// Observes the game client without changing it: nothing is ever sent on the player's behalf.
export function installPageTap(): void {
	const root = document.documentElement;

	if (root.dataset[INSTALLED_MARKER]) {
		return;
	}

	root.dataset[INSTALLED_MARKER] = 'installed';

	installSocketConstructorTap();
	installSocketSendTap();
	installFetchTap();

	document.addEventListener(HISTORY_REQUEST_EVENT, sendHistory);

	console.info(`stakejack: page tap installed in ${window.location.host}`);
}
