import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Caption } from './caption';
import { useSectionCollapse } from './collapsed-sections';
import type { SectionId } from './collapsed-sections';

type CollapsibleSectionProps = {
	id: SectionId;
	title: ReactNode;
	info?: string;
	// The one line that stands in for the section while it is folded.
	summary: ReactNode;
	className?: string;
	children: ReactNode;
};

// A panel section the player can fold down to its caption and a one-line summary.
export function CollapsibleSection({
	id,
	title,
	info,
	summary,
	className,
	children,
}: CollapsibleSectionProps): ReactElement {
	const { isCollapsed, toggle } = useSectionCollapse(id);

	return (
		<section className={cn('flex flex-col gap-2', className)}>
			<Caption
				info={info}
				collapse={{
					isCollapsed,
					onToggle: toggle,
					summary,
				}}
			>
				{title}
			</Caption>

			{!isCollapsed && children}
		</section>
	);
}
