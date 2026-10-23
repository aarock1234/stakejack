import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

import { Rank } from '@/game/cards';
import type { ShoeSnapshot } from '@/game/shoe-tracker';

// A shoe lasts well under an hour, so anything older belongs to a shoe that is long gone.
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const savedShoeSchema = z.object({
	shoeCode: z.string(),
	savedAt: z.number(),
	cards: z.array(z.tuple([z.string(), z.enum(Rank)])),
});

// Where the cards seen from each table's current shoe are kept, so a reload resumes the count.
export type ShoeHistory = {
	load(tableId: string): Promise<ShoeSnapshot | undefined>;
	save(tableId: string, snapshot: ShoeSnapshot): Promise<void>;
};

function storageKey(tableId: string): `local:${string}` {
	return `local:shoe:${tableId}`;
}

// Extension storage, one entry per table. Saved data is validated on the way back in, since it may have
// been written by an older version of the extension.
export const extensionShoeHistory: ShoeHistory = {
	async load(tableId) {
		const result = savedShoeSchema.safeParse(await storage.getItem(storageKey(tableId)));

		if (!result.success || Date.now() - result.data.savedAt > MAX_AGE_MS) {
			return undefined;
		}

		return {
			shoeCode: result.data.shoeCode,
			cards: result.data.cards,
		};
	},

	async save(tableId, snapshot) {
		await storage.setItem(storageKey(tableId), {
			shoeCode: snapshot.shoeCode,
			savedAt: Date.now(),
			cards: snapshot.cards,
		});
	},
};
