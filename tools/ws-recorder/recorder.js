(() => {
	const NativeWebSocket = window.WebSocket;
	const capturedMessages = [];

	let saveButton = null;

	function isGameSocket(url) {
		return new URL(url).pathname === '/game';
	}

	function record(direction, data) {
		capturedMessages.push({
			direction,
			time: new Date().toISOString(),
			data: typeof data === 'string' ? data : `[${Object.prototype.toString.call(data)}]`,
		});

		updateSaveButton();
	}

	class RecordingWebSocket extends NativeWebSocket {
		constructor(url, protocols) {
			super(url, protocols);

			if (!isGameSocket(this.url)) {
				return;
			}

			console.log('stakejack: recording game socket');
			this.addEventListener('message', event => record('received', event.data));
		}

		send(data) {
			if (isGameSocket(this.url)) {
				record('sent', data);
			}

			super.send(data);
		}
	}

	window.WebSocket = RecordingWebSocket;

	function downloadCapture() {
		const json = JSON.stringify(capturedMessages, null, 2);
		const file = new Blob([json], {
			type: 'application/json',
		});

		const link = document.createElement('a');
		link.href = URL.createObjectURL(file);
		link.download = `stake-blackjack-ws-${Date.now()}.json`;
		document.body.append(link);
		link.click();
		link.remove();
	}

	function createSaveButton() {
		saveButton = document.createElement('button');
		saveButton.addEventListener('click', downloadCapture);

		Object.assign(saveButton.style, {
			position: 'fixed',
			left: '8px',
			bottom: '8px',
			zIndex: '2147483647',
			padding: '6px 10px',
			font: '12px monospace',
			color: '#fff',
			background: '#c0392b',
			border: 'none',
			borderRadius: '4px',
			cursor: 'pointer',
		});

		document.body.append(saveButton);
		updateSaveButton();
	}

	function updateSaveButton() {
		if (saveButton) {
			saveButton.textContent = `save capture (${capturedMessages.length})`;
		}
	}

	window.stakejackCapture = capturedMessages;
	window.stakejackSave = downloadCapture;

	if (window.location.pathname.includes('/desktop/blackjack')) {
		document.addEventListener('DOMContentLoaded', createSaveButton);
	}
})();
