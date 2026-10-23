import { ChevronsUp, Hand, HandCoins, Plus, Split } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Action } from '@/strategy/advice';

type ActionAppearance = {
	icon: LucideIcon;
	// Text color for the move's name.
	text: string;
	// Faint wash of the same color behind its icon.
	tint: string;
};

// Each move keeps one soft accent and one icon, so the recommendation reads at a glance.
export const ACTION_APPEARANCE: Readonly<Record<Action, ActionAppearance>> = {
	[Action.HIT]: {
		icon: Plus,
		text: 'text-action-hit',
		tint: 'bg-action-hit/12',
	},
	[Action.STAND]: {
		icon: Hand,
		text: 'text-action-stand',
		tint: 'bg-action-stand/12',
	},
	[Action.DOUBLE]: {
		icon: ChevronsUp,
		text: 'text-action-double',
		tint: 'bg-action-double/12',
	},
	[Action.SPLIT]: {
		icon: Split,
		text: 'text-action-split',
		tint: 'bg-action-split/12',
	},
	[Action.CASH_OUT]: {
		icon: HandCoins,
		text: 'text-action-cash-out',
		tint: 'bg-action-cash-out/12',
	},
};
