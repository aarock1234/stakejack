import { z } from 'zod';

import { ApiPath } from './bridge';

// GET /api/wallet/balance, which the game client polls. Amounts arrive as strings such as "205.65".
const walletSchema = z.object({
	userId: z.string(),
	balance: z.coerce.number(),
	currency: z.string(),
});

// GET /api/ui/tableConfig, fetched when the table loads.
const tableConfigSchema = z.object({
	tableId: z.string(),
	params: z.object({
		table_bet_min_limit: z.coerce.number(),
		table_bet_max_limit: z.coerce.number(),
	}),
});

export const ApiResponseKind = {
	WALLET: 'wallet',
	TABLE_CONFIG: 'tableConfig',
} as const;

export type Wallet = z.infer<typeof walletSchema>;

export type TableLimits = {
	minimumBet: number;
	maximumBet: number;
};

export type ApiResponse =
	| {
			kind: typeof ApiResponseKind.WALLET;
			wallet: Wallet;
	  }
	| {
			kind: typeof ApiResponseKind.TABLE_CONFIG;
			tableId: string;
			limits: TableLimits;
	  };

function parseJson(data: string): unknown {
	try {
		return JSON.parse(data);
	} catch {
		return undefined;
	}
}

export function parseApiResponse(path: ApiPath, data: string): ApiResponse | undefined {
	const json = parseJson(data);

	if (path === ApiPath.WALLET_BALANCE) {
		const result = walletSchema.safeParse(json);

		return result.success
			? {
					kind: ApiResponseKind.WALLET,
					wallet: result.data,
				}
			: undefined;
	}

	const result = tableConfigSchema.safeParse(json);

	return result.success
		? {
				kind: ApiResponseKind.TABLE_CONFIG,
				tableId: result.data.tableId,
				limits: {
					minimumBet: result.data.params.table_bet_min_limit,
					maximumBet: result.data.params.table_bet_max_limit,
				},
			}
		: undefined;
}
