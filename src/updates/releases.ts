// Where Stakejack's releases are published. Each GitHub release is tagged "v" plus the version and carries
// the signed Firefox package, the Chrome zip, and the update list Firefox polls.
export const RELEASES_URL = 'https://github.com/aarock1234/stakejack/releases';

export const FIREFOX_ADDON_ID = 'stakejack@stakejack.local';

export const FIREFOX_UPDATE_LIST_NAME = 'updates.json';

// Always the newest release's update list, so installed copies find every later version.
export const FIREFOX_UPDATE_URL = `${RELEASES_URL}/latest/download/${FIREFOX_UPDATE_LIST_NAME}`;

export function firefoxPackageName(version: string): string {
	return `stakejack-${version}-firefox.xpi`;
}

export function chromePackageName(version: string): string {
	return `stakejack-${version}-chrome.zip`;
}

export function releaseDownloadUrl(version: string, fileName: string): string {
	return `${RELEASES_URL}/download/v${version}/${fileName}`;
}
