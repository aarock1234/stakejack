import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { ChevronRight, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

// Lets a caption fold its section away, leaving a one-line summary beside it.
export type CaptionCollapse = {
	isCollapsed: boolean;
	onToggle: () => void;
	// What the folded section comes to, such as "+$42.50 in 18 rounds".
	summary?: ReactNode;
};

type CaptionProps = {
	children: ReactNode;
	// A plain explanation shown under the caption when its info button is pressed.
	info?: string;
	collapse?: CaptionCollapse;
	className?: string;
};

type CaptionTitleProps = {
	children: ReactNode;
	collapse?: CaptionCollapse;
};

// The caption's words, which become the fold button when the section can fold.
function CaptionTitle({ children, collapse }: CaptionTitleProps): ReactElement {
	if (!collapse) {
		return <span className="truncate">{children}</span>;
	}

	return (
		<button
			type="button"
			aria-expanded={!collapse.isCollapsed}
			onClick={collapse.onToggle}
			className="-ml-0.5 flex min-w-0 cursor-pointer items-center gap-1 rounded-sm transition-colors hover:text-foreground"
		>
			<ChevronRight
				aria-hidden
				className={cn('size-3.5 shrink-0 transition-transform', !collapse.isCollapsed && 'rotate-90')}
			/>
			<span className="truncate">{children}</span>
		</button>
	);
}

// The small muted line that introduces each section, with an optional explanation behind an (i). A section
// that can fold shows a chevron, and its summary on the right while folded.
export function Caption({ children, info, collapse, className }: CaptionProps): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const infoId = useId();
	const summary = collapse?.isCollapsed ? collapse.summary : undefined;

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<CaptionTitle collapse={collapse}>{children}</CaptionTitle>
				{info && (
					<button
						type="button"
						aria-label="What does this mean?"
						aria-expanded={isOpen}
						aria-controls={infoId}
						onClick={() => setIsOpen(open => !open)}
						className={cn(
							'grid size-4 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:text-foreground',
							isOpen && 'text-foreground'
						)}
					>
						<Info aria-hidden className="size-3.5" />
					</button>
				)}
				{summary !== undefined && (
					<span className="ml-auto shrink-0 text-sm font-normal text-foreground">{summary}</span>
				)}
			</div>
			{info && isOpen && (
				<p
					id={infoId}
					className="rounded-md border border-border-faint bg-secondary px-2.5 py-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground"
				>
					{info}
				</p>
			)}
		</div>
	);
}
