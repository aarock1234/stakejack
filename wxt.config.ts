import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

import { GAME_HOST_PERMISSIONS } from './src/game/game-frame';

const FIREFOX_SETTINGS = {
	gecko: {
		id: 'stakejack@stakejack.local',
		// Main-world content scripts arrived in Firefox 128.
		strict_min_version: '128.0',
		data_collection_permissions: {
			required: ['none'],
		},
	},
};

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	manifestVersion: 3,
	manifest: ({ browser }) => ({
		name: 'Stakejack',
		description: 'Shows the best blackjack move on Pragmatic Play Live Blackjack tables.',
		host_permissions: GAME_HOST_PERMISSIONS,
		// Keeps the cards seen from each table's shoe, so the count survives a reload.
		permissions: ['storage'],
		...(browser === 'firefox' && {
			browser_specific_settings: FIREFOX_SETTINGS,
		}),
	}),
	vite: () => ({
		plugins: [tailwindcss()],
		build: {
			// Content script styles are injected into the game's page, where a font file emitted to /assets
			// would resolve against the game's origin. Fonts are inlined instead.
			assetsInlineLimit: (filePath: string) => filePath.endsWith('.woff2'),
		},
	}),
});
