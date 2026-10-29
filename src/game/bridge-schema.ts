import { z } from 'zod';

import { ApiPath, BridgeSource } from './bridge';
import type { BridgeMessage } from './bridge';

// Kept apart from bridge.ts so the page-world tap does not bundle Zod.
const bridgeMessageSchema = z.discriminatedUnion('source', [
	z.object({
		source: z.literal(BridgeSource.SOCKET_RECEIVED),
		data: z.string(),
	}),
	z.object({
		source: z.literal(BridgeSource.SOCKET_SENT),
		data: z.string(),
	}),
	z.object({
		source: z.literal(BridgeSource.API_RESPONSE),
		path: z.enum(ApiPath),
		data: z.string(),
	}),
]) satisfies z.ZodType<BridgeMessage>;

function parseDetail(detail: unknown): unknown {
	if (typeof detail !== 'string') {
		return undefined;
	}

	try {
		return JSON.parse(detail);
	} catch {
		return undefined;
	}
}

export function decodeBridgeMessage(detail: unknown): BridgeMessage | undefined {
	const result = bridgeMessageSchema.safeParse(parseDetail(detail));

	return result.success ? result.data : undefined;
}

// Everything the page-world tap has seen so far, oldest first. A message the advisor no longer
// understands, perhaps from an older tap, is skipped rather than discarding the rest.
export function decodeBridgeHistory(detail: unknown): BridgeMessage[] {
	const entries = z.array(z.unknown()).safeParse(parseDetail(detail));

	if (!entries.success) {
		return [];
	}

	return entries.data.flatMap(entry => {
		const result = bridgeMessageSchema.safeParse(entry);

		return result.success ? [result.data] : [];
	});
}
