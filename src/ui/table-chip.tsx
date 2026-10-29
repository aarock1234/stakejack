import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TableChipProps = {
	label: string;
	// Marks a chip that rides on the player's money.
	isHighlighted?: boolean;
	className?: string;
	style?: CSSProperties;
	children: ReactNode;
};

// The small frosted card that rests on the table beside a hand or the dealer. It can take focus, so hovering
// or tapping it opens the details its children keep behind group-hover and group-focus.
export function TableChip({ label, isHighlighted = false, className, style, children }: TableChipProps): ReactElement {
	return (
		<div
			role="group"
			tabIndex={0}
			aria-label={label}
			className={cn(
				'group flex flex-col gap-1 rounded-lg border bg-card px-2 py-1.5 font-sans text-foreground shadow-[0_8px_20px_rgb(0_0_0/55%)] outline-none backdrop-blur-md transition-colors',
				isHighlighted ? 'border-subtle' : 'border-border',
				'hover:border-subtle focus:border-subtle',
				className
			)}
			style={style}
		>
			{children}
		</div>
	);
}
