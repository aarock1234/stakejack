import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';

type CaptionProps = {
	children: ReactNode;
	// A plain explanation shown under the caption when its info button is pressed.
	info?: string;
	className?: string;
};

// The small muted line that introduces each section, with an optional explanation behind an (i).
export function Caption({ children, info, className }: CaptionProps): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const infoId = useId();

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<span className="truncate">{children}</span>
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
