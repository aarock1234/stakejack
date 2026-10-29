// Firefox checks a self-hosted add-on for updates only about once a day. This asks far more often, so a new
// release reaches a game in progress within minutes, and applies it straight away. The page-world tap keeps
// running through the update and replays the session to the new content script, so nothing is lost.

const UPDATE_CHECK_ALARM = 'stakejack-update-check';
const UPDATE_CHECK_INTERVAL_MINUTES = 15;

async function checkForUpdate(): Promise<void> {
	try {
		await browser.runtime.requestUpdateCheck();
	} catch (error: unknown) {
		console.warn('stakejack: could not check for an update', error);
	}
}

export default defineBackground({
	// Chrome cannot update an unpacked extension, and discourages polling for store updates.
	include: ['firefox'],

	main() {
		browser.runtime.onUpdateAvailable.addListener(details => {
			console.info(`stakejack: installing version ${details.version}`);
			browser.runtime.reload();
		});

		browser.alarms.onAlarm.addListener(alarm => {
			if (alarm.name === UPDATE_CHECK_ALARM) {
				void checkForUpdate();
			}
		});

		browser.alarms
			.create(UPDATE_CHECK_ALARM, {
				delayInMinutes: 1,
				periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES,
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not schedule update checks', error);
			});
	},
});
