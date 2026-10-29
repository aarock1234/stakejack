import './style.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AdvisorStore } from '@/advisor/advisor-store';
import { extensionShoeHistory } from '@/advisor/shoe-history';
import { BRIDGE_EVENT, HISTORY_EVENT, HISTORY_REQUEST_EVENT } from '@/game/bridge';
import { decodeBridgeHistory, decodeBridgeMessage } from '@/game/bridge-schema';
import { GAME_FRAME_MATCHES, isGameClientFrame } from '@/game/game-frame';
import { AdvisorPanel } from '@/ui/advisor-panel';

// WXT renders the panel inside a custom element with this tag name.
const UI_NAME = 'stakejack-advisor';

// When the extension reloads, Firefox injects it again into open pages but leaves the previous panel's
// element behind, so any panel other than the one being mounted is removed.
function removeStalePanels(currentHost: HTMLElement): void {
	for (const host of document.querySelectorAll(UI_NAME)) {
		if (host !== currentHost) {
			host.remove();
		}
	}
}

export default defineContentScript({
	matches: GAME_FRAME_MATCHES,
	runAt: 'document_start',
	allFrames: true,
	cssInjectionMode: 'ui',

	async main(ctx) {
		const store = new AdvisorStore(extensionShoeHistory);

		// Elsewhere the panel waits for game traffic before appearing, so the lobby never says "Connecting".
		const isGameClient = isGameClientFrame();

		// Listen before anything else: the game's opening messages describe the whole table.
		// Read detail without instanceof: Firefox hands page-created events to content scripts as wrappers.
		ctx.addEventListener(document, BRIDGE_EVENT, event => {
			const message = decodeBridgeMessage('detail' in event ? event.detail : undefined);

			if (message) {
				store.handle(message);
			}
		});

		// After an extension update the game is already running, so catch up on what the page-world tap
		// has seen. It answers synchronously, before any further live message, or not at all on a fresh page.
		ctx.addEventListener(document, HISTORY_EVENT, event => {
			store.replay(decodeBridgeHistory('detail' in event ? event.detail : undefined));
		});

		document.dispatchEvent(new CustomEvent(HISTORY_REQUEST_EVENT));

		const ui = await createShadowRootUi(ctx, {
			name: UI_NAME,
			position: 'inline',
			anchor: 'body',
			onMount(container, _shadow, shadowHost) {
				removeStalePanels(shadowHost);

				const root = createRoot(container.appendChild(document.createElement('div')));

				root.render(
					<StrictMode>
						<AdvisorPanel store={store} isShownWhileConnecting={isGameClient} />
					</StrictMode>
				);

				console.info('stakejack: advice panel mounted');

				return root;
			},
			onRemove(root) {
				root?.unmount();
			},
		});

		ui.autoMount();
	},
});
