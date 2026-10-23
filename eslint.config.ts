import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
	{
		ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'tools/**', 'src/components/ui/**'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	reactHooks.configs.flat['recommended-latest'],
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: rootDir,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
				},
			],
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
				},
			],
		},
	}
);
