import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

// The panel's foldable sections, named so the player's choice can be remembered between visits.
export const SectionId = {
	DEALER: 'dealer',
	SHOE: 'shoe',
	SESSION: 'session',
	BY_SEAT: 'bySeat',
	OTHER_MOVES: 'otherMoves',
	SIDE_BETS: 'sideBets',
} as const;

export type SectionId = (typeof SectionId)[keyof typeof SectionId];

type CollapsedSections = {
	isCollapsed: (id: SectionId) => boolean;
	toggle: (id: SectionId) => void;
};

const CollapsedSectionsContext = createContext<CollapsedSections | undefined>(undefined);

const savedSections = storage.defineItem<unknown>('local:collapsedSections');

const savedSectionsSchema = z.array(z.enum(SectionId));

function saveSections(sections: ReadonlySet<SectionId>): void {
	savedSections.setValue([...sections]).catch((error: unknown) => {
		console.warn('stakejack: could not save the folded sections', error);
	});
}

type CollapsedSectionsProviderProps = {
	children: ReactNode;
};

// Keeps which sections the player has folded, in extension storage so the live panel opens as they left it.
export function CollapsedSectionsProvider({ children }: CollapsedSectionsProviderProps): ReactElement {
	const [collapsed, setCollapsed] = useState<ReadonlySet<SectionId>>(new Set());

	useEffect(() => {
		let isCurrent = true;

		savedSections
			.getValue()
			.then(value => {
				const saved = savedSectionsSchema.safeParse(value);

				if (isCurrent && saved.success) {
					setCollapsed(new Set(saved.data));
				}
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not load the folded sections', error);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	const sections: CollapsedSections = {
		isCollapsed: id => collapsed.has(id),
		toggle: id => {
			const next = new Set(collapsed);

			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}

			setCollapsed(next);
			saveSections(next);
		},
	};

	return <CollapsedSectionsContext value={sections}>{children}</CollapsedSectionsContext>;
}

// Whether one section is folded. Outside the live panel, such as on the preview page, the choice lasts only
// as long as the page.
export function useSectionCollapse(id: SectionId): {
	isCollapsed: boolean;
	toggle: () => void;
} {
	const remembered = useContext(CollapsedSectionsContext);
	const [isLocallyCollapsed, setIsLocallyCollapsed] = useState(false);

	if (remembered) {
		return {
			isCollapsed: remembered.isCollapsed(id),
			toggle: () => remembered.toggle(id),
		};
	}

	return {
		isCollapsed: isLocallyCollapsed,
		toggle: () => setIsLocallyCollapsed(collapsed => !collapsed),
	};
}
