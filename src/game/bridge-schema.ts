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

export function decodeBridgeMessage(detail: unknown): BridgeMessage | undefined {
	if (typeof detail !== 'string') {
		return undefined;
	}

	let json: unknown;

	try {
		json = JSON.parse(detail);
	} catch {
		return undefined;
	}

	const result = bridgeMessageSchema.safeParse(json);

	return result.success ? result.data : undefined;
}
