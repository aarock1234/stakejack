import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
	chromePackageName,
	FIREFOX_ADDON_ID,
	FIREFOX_UPDATE_LIST_NAME,
	firefoxPackageName,
	releaseDownloadUrl,
} from '@/updates/releases';

// Gathers the files for a GitHub release into .output/release-<version>: the signed Firefox package, the
// Chrome zip, and the update list Firefox polls. Run pnpm sign:firefox and pnpm zip first.
// Usage: pnpm release:prepare

const OUTPUT_DIRECTORY = '.output';

const packageSchema = z.object({
	version: z.string(),
});

// Firefox's update list format: https://extensionworkshop.com/documentation/manage/updating-your-extension/
type FirefoxUpdateList = {
	addons: Record<
		string,
		{
			updates: {
				version: string;
				update_link: string;
				update_hash: string;
			}[];
		}
	>;
};

async function readVersion(): Promise<string> {
	const packageJson = packageSchema.parse(JSON.parse(await readFile('package.json', 'utf8')));

	return packageJson.version;
}

// web-ext names the signed package after the add-on's id hash, such as "d67853115f4b4b30b670-0.3.6.xpi".
async function findSignedFirefoxPackage(version: string): Promise<string> {
	const fileNames = await readdir(OUTPUT_DIRECTORY);

	const signedPackage = fileNames.find(
		fileName => fileName.endsWith(`-${version}.xpi`) && !fileName.startsWith('stakejack-')
	);

	if (!signedPackage) {
		throw new Error(`no signed Firefox package for ${version}, run pnpm sign:firefox first`);
	}

	return path.join(OUTPUT_DIRECTORY, signedPackage);
}

async function sha256Of(filePath: string): Promise<string> {
	const hash = createHash('sha256').update(await readFile(filePath));

	return `sha256:${hash.digest('hex')}`;
}

function firefoxUpdateList(version: string, packageHash: string): FirefoxUpdateList {
	return {
		addons: {
			[FIREFOX_ADDON_ID]: {
				updates: [
					{
						version,
						update_link: releaseDownloadUrl(version, firefoxPackageName(version)),
						update_hash: packageHash,
					},
				],
			},
		},
	};
}

async function main(): Promise<void> {
	const version = await readVersion();
	const releaseDirectory = path.join(OUTPUT_DIRECTORY, `release-${version}`);

	const signedPackage = await findSignedFirefoxPackage(version);
	const chromePackage = path.join(OUTPUT_DIRECTORY, chromePackageName(version));

	await mkdir(releaseDirectory, {
		recursive: true,
	});

	const firefoxRelease = path.join(releaseDirectory, firefoxPackageName(version));
	const chromeRelease = path.join(releaseDirectory, chromePackageName(version));
	const updateList = path.join(releaseDirectory, FIREFOX_UPDATE_LIST_NAME);

	await copyFile(signedPackage, firefoxRelease);
	await copyFile(chromePackage, chromeRelease);

	const updates = firefoxUpdateList(version, await sha256Of(firefoxRelease));

	await writeFile(updateList, `${JSON.stringify(updates, null, '\t')}\n`);

	console.log(`release files for ${version} are in ${releaseDirectory}`);
	console.log(
		`publish with: gh release create v${version} --title "Stakejack ${version}" ${firefoxRelease} ${chromeRelease} ${updateList}`
	);
}

await main();
