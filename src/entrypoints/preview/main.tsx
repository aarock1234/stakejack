import '../advisor.content/style.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PreviewPage } from './preview-page';

const container = document.getElementById('root');

if (!container) {
	throw new Error('preview page is missing its #root element');
}

createRoot(container).render(
	<StrictMode>
		<PreviewPage />
	</StrictMode>
);
