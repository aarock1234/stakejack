import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The theme adds a display font size, which tailwind-merge must know is a size and not a text color.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			'font-size': [
				{
					text: ['display'],
				},
			],
		},
	},
});

// shadcn/ui's class name helper: joins conditional classes and resolves conflicting Tailwind utilities.
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
