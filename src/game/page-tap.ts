import { BRIDGE_EVENT, BridgeSource, isGameSocketUrl, watchedApiPath } from './bridge';
import type { ApiPath, BridgeMessage } from './bridge';

function forward(message: BridgeMessage): void {
	const event = new CustomEvent(BRIDGE_EVENT, {
		detail: JSON.stringify(message),
	});

	document.dispatchEvent(event);
}

// Replaces the page's WebSocket with a subclass that copies game frames to the extension. The game
// client builds its own socket class on top of window.WebSocket, so this must run before it loads.
function installSocketTap(): void {
	const NativeWebSocket = window.WebSocket;

	class TappedWebSocket extends NativeWebSocket {
		readonly #isGameSocket: boolean;

		constructor(url: string | URL, protocols?: string | string[]) {
			super(url, protocols);

			this.#isGameSocket = isGameSocketUrl(this.url);

			if (this.#isGameSocket) {
				console.info('stakejack: watching the game socket');

				this.addEventListener('message', event => {
					if (typeof event.data === 'string') {
						forward({
							source: BridgeSource.SOCKET_RECEIVED,
							data: event.data,
						});
					}
				});
			}
		}

		override send(data: Parameters<WebSocket['send']>[0]): void {
			if (this.#isGameSocket && typeof data === 'string') {
				forward({
					source: BridgeSource.SOCKET_SENT,
					data,
				});
			}

			super.send(data);
		}
	}

	window.WebSocket = TappedWebSocket;
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

	installSocketTap();
	installFetchTap();

	console.info(`stakejack: page tap installed in ${window.location.host}`);
}
