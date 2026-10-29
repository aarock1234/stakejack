import { PlayerMove } from '@/game/messages';
import { Action } from '@/strategy/advice';

const ACTIONS_BY_MOVE: Readonly<Record<PlayerMove, Action>> = {
	[PlayerMove.HIT]: Action.HIT,
	[PlayerMove.STAND]: Action.STAND,
	[PlayerMove.DOUBLE]: Action.DOUBLE,
	[PlayerMove.SPLIT]: Action.SPLIT,
	[PlayerMove.CASH_OUT]: Action.CASH_OUT,
};

// The advice's name for a move the game reports a player made.
export function actionOf(move: PlayerMove): Action {
	return ACTIONS_BY_MOVE[move];
}
