import { useEffect, useState } from 'react';

import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

const savedCollapsed = storage.defineItem<unknown>('local:panelCollapsed');

function saveCollapsed(isCollapsed: boolean): void {
	savedCollapsed.setValue(isCollapsed).catch((error: unknown) => {
		console.warn('stakejack: could not save whether the panel is minimised', error);
	});
}

// Whether the panel is shrunk to its header and the count, remembered between visits.
export function usePanelCollapsed(): {
	isCollapsed: boolean;
	toggleCollapsed: () => void;
} {
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		let isCurrent = true;

		savedCollapsed
			.getValue()
			.then(value => {
				const saved = z.boolean().safeParse(value);

				if (isCurrent && saved.success) {
					setIsCollapsed(saved.data);
				}
			})
			.catch((error: unknown) => {
				console.warn('stakejack: could not load whether the panel is minimised', error);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	function toggleCollapsed(): void {
		const next = !isCollapsed;

		setIsCollapsed(next);
		saveCollapsed(next);
	}

	return {
		isCollapsed,
		toggleCollapsed,
	};
}
