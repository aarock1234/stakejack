import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { TablePoint } from './use-table-anchors';

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

type SeatHintChipProps = {
	anchor: TablePoint;
	// What to do at the seat, such as "Sit here", and why, in a few words.
	title: string;
	detail: string;
};

// A chip resting on a seat's bet spot that points the player to it, so the seat is easy to find.
export function SeatHintChip({ anchor, title, detail }: SeatHintChipProps): ReactElement {
	return (
		<TableChip
			label={title}
			isHighlighted
			className="fixed z-2147483647 -translate-x-1/2 -translate-y-full"
			style={{
				left: anchor.x,
				top: anchor.y,
			}}
		>
			<span className="text-xs font-medium text-outcome-win">{title}</span>
			<span className="text-micro text-muted-foreground">{detail}</span>
		</TableChip>
	);
}
