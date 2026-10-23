import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

import { Rank } from '@/game/cards';
import type { ShoeSnapshot } from '@/game/shoe-tracker';

// A count is only valid if every card of the shoe was seen. The snapshot is saved as each round opens, and a
// round takes well over this long, so a newer snapshot means no cards were dealt while the page was away.
// Anything older may have missed rounds, and the shoe code (a colour) can repeat on a later shoe, so the
// count starts over instead of resuming wrong.
const MAX_AGE_MS = 40 * 1000;

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
