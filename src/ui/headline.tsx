import type { ReactElement, ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type HeadlineProps = {
	icon: LucideIcon;
	label: ReactNode;
	// A supporting figure on the right, such as the move's expected value.
	detail?: ReactNode;
	// Accent classes for the label and the icon tile; neutral when omitted.
	textColor?: string;
	tileColor?: string;
};

// The one large line in each section: what to do, set beside a small tinted icon.
export function Headline({ icon: Icon, label, detail, textColor, tileColor }: HeadlineProps): ReactElement {
	return (
		<div className="flex items-center gap-3">
			<span
				aria-hidden
				className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tileColor ?? 'bg-muted')}
			>
				<Icon className={cn('size-4', textColor ?? 'text-foreground')} strokeWidth={2.25} />
			</span>
			<p className={cn('text-display', textColor)}>{label}</p>
			{detail !== undefined && (
				<span className="ml-auto text-sm font-medium text-muted-foreground">{detail}</span>
			)}
		</div>
	);
}
