// The page-world tap forwards what the game client sees to the extension's content script as DOM events.
// The detail is a JSON string so it crosses the page and extension worlds unchanged in every browser.
export const BRIDGE_EVENT = 'stakejack:bridge';

// Game client API responses worth reading: the player's wallet and the table's bet limits.
export const ApiPath = {
	WALLET_BALANCE: '/api/wallet/balance',
	TABLE_CONFIG: '/api/ui/tableConfig',
} as const;

export type ApiPath = (typeof ApiPath)[keyof typeof ApiPath];

export const BridgeSource = {
	SOCKET_RECEIVED: 'socketReceived',
	SOCKET_SENT: 'socketSent',
	API_RESPONSE: 'apiResponse',
} as const;

export type BridgeMessage =
	| {
			source: typeof BridgeSource.SOCKET_RECEIVED | typeof BridgeSource.SOCKET_SENT;
			data: string;
	  }
	| {
			source: typeof BridgeSource.API_RESPONSE;
			path: ApiPath;
			data: string;
	  };

// The game server socket lives at /game with a tableId; chat, video, and lobby sockets are ignored.
export function isGameSocketUrl(url: string): boolean {
	const { pathname, searchParams } = new URL(url);

	return pathname === '/game' && searchParams.has('tableId');
}

export function watchedApiPath(url: string): ApiPath | undefined {
	const { pathname } = new URL(url, window.location.href);

	return Object.values(ApiPath).find(path => path === pathname);
}
