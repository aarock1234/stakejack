import { execFileSync } from 'node:child_process';

// Signs the Firefox build with Mozilla as an unlisted add-on, using the add-ons.mozilla.org API key and
// secret kept in .env as WEB_EXT_API_KEY and WEB_EXT_API_SECRET. Run pnpm build:firefox first.
// Usage: pnpm sign:firefox

process.loadEnvFile('.env');

execFileSync(
	'pnpm',
	[
		'dlx',
		'web-ext',
		'sign',
		'--channel=unlisted',
		'--source-dir',
		'.output/firefox-mv3',
		'--artifacts-dir',
		'.output',
	],
	{
		stdio: 'inherit',
		shell: true,
	}
);
