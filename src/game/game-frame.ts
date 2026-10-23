// Pragmatic Play serves the blackjack client from rotating hostnames (for example
// client.fcxlljmmbqtczjya.net/desktop/blackjack3/), so frames are matched by path instead of host.
// Both content scripts stay dormant unless the frame opens a game socket.
export const GAME_FRAME_MATCHES = ['https://*/*blackjack*'];

// Host access ignores paths, so matching rotating hostnames needs access to every https host. Firefox
// only injects Manifest V3 content scripts where the extension holds this access.
export const GAME_HOST_PERMISSIONS = ['https://*/*'];

// The blackjack client itself: an iframe whose path names the game. Match patterns also accept URLs with
// "blackjack" only in the query, such as Pragmatic's lobby, and Stake's own page names the game while
// never hosting it.
export function isGameClientFrame(): boolean {
	const isEmbedded = window !== window.top;

	return isEmbedded && window.location.pathname.toLowerCase().includes('blackjack');
}
