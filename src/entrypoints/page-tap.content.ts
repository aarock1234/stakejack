import { GAME_FRAME_MATCHES } from '@/game/game-frame';
import { installPageTap } from '@/game/page-tap';

export default defineContentScript({
	matches: GAME_FRAME_MATCHES,
	world: 'MAIN',
	runAt: 'document_start',
	allFrames: true,
	main() {
		installPageTap();
	},
});
