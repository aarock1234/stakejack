import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { AdvisorStore } from '@/advisor/advisor-store';
import type { AdvisorView, HandDecision } from '@/advisor/advisor-view';
import type { SessionSummary } from '@/advisor/session-tracker';
import { BridgeSource } from '@/game/bridge';
import type { BridgeMessage } from '@/game/bridge';
import { actionLabel, formatCount, formatPercent, handLabel, sideBetWinLabel } from '@/ui/format';

// Replays a capture from tools/ws-recorder through the advisor and prints every piece of advice it
// would have shown. Usage: pnpm replay <capture.json>

const CaptureDirection = {
	RECEIVED: 'received',
	SENT: 'sent',
} as const;

const captureSchema = z.array(
	z.object({
		direction: z.enum(CaptureDirection),
		data: z.string(),
	})
);

type CapturedFrame = z.infer<typeof captureSchema>[number];

function toBridgeMessage(frame: CapturedFrame): BridgeMessage {
	return {
		source: frame.direction === CaptureDirection.RECEIVED ? BridgeSource.SOCKET_RECEIVED : BridgeSource.SOCKET_SENT,
		data: frame.data,
	};
}

// "Hand 1 · Pair of 2s vs 2: Split (Split +1.2%, Hit −10.0%)"
function describeDecision(decision: HandDecision): string {
	const { advice } = decision;
	const hand = decision.isSplitHand ? `Hand ${decision.handIndex + 1} · ` : '';
	const active = decision.isActive ? ' [active]' : '';
	const behind = decision.isBetBehind ? ' [behind]' : '';
	const book = decision.bookAction ? ` [book: ${actionLabel(decision.bookAction)}]` : '';
	const situation = `${hand}${handLabel(
		decision.playerCards.map(card => card.rank),
		decision.canSplit
	)} vs ${decision.dealerUpCard.face}`;

	const options = advice.options
		.map(option => `${actionLabel(option.action)} ${formatPercent(option.expectedValue)}`)
		.join(', ');

	return `seat ${decision.seatNumber} ${situation}${behind}${active}: ${actionLabel(advice.best.action)}${book} (${options})`;
}

function describeView(view: AdvisorView): string[] {
	const lines = view.decisions.map(describeDecision);

	for (const seat of view.outlooks) {
		const hands = seat.hands.map(
			standing =>
				`${standing.total}${standing.isBust ? ' bust' : ''}${standing.isInPlay ? ' (in play)' : ` win ${formatPercent(standing.outlook.win)} push ${formatPercent(standing.outlook.push)}`}`
		);

		lines.push(`  table seat ${seat.seatNumber}: ${hands.join(' | ')}`);

		for (const win of seat.sideBetWins) {
			lines.push(`  side bet won at seat ${seat.seatNumber}: ${sideBetWinLabel(win)}`);
		}
	}

	if (view.seatSuggestion) {
		lines.push(`move to seat ${view.seatSuggestion.seatNumber}`);
	}

	if (view.bet) {
		const count = view.bet.trueCount === undefined ? 'untracked' : formatCount(view.bet.trueCount);
		lines.push(`bet ${view.bet.amount} (true count ${count}, edge ${formatPercent(view.bet.edge)})`);
	}

	return lines;
}

async function main(): Promise<void> {
	const capturePath = process.argv[2];

	if (!capturePath) {
		throw new Error('usage: pnpm replay <capture.json>');
	}

	const frames = captureSchema.parse(JSON.parse(await readFile(capturePath, 'utf8')));
	const store = new AdvisorStore();
	const printed = new Set<string>();

	for (const frame of frames) {
		store.handle(toBridgeMessage(frame));

		for (const line of describeView(store.getSnapshot())) {
			if (!printed.has(line)) {
				console.log(line);
				printed.add(line);
			}
		}
	}

	console.log(`final status: ${store.getSnapshot().status}`);
	console.log(describeSession(store.getSnapshot().session));

	// A store started late, as after an extension update, catches up on the same frames in one go.
	const caughtUp = new AdvisorStore();

	caughtUp.replay(frames.map(toBridgeMessage));
	console.log(`after catching up, ${describeSession(caughtUp.getSnapshot().session)}`);
}

function describeSession(session: SessionSummary): string {
	const { moves } = session;
	const totals = `${session.roundsPlayed} rounds, wagered ${session.wagered}, net ${session.net}, expected ${session.expected.toFixed(2)}`;
	const review = `${moves.movesMatched} of ${moves.movesPlayed} moves like the advice, cost ${moves.cost.toFixed(2)}`;

	return `session: ${totals}; ${review}`;
}

await main();
