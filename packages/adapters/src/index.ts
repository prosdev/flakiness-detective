// Main exports for adapters package

// Re-export renamed exports for backward compatibility
import { createSimplifiedDetective } from './integrations/google-integration';
export { createSimplifiedDetective };
// Temporarily export for backward compatibility
export const createLyticsCompatibleDetective = createSimplifiedDetective;

// File system adapter
export * from './file-system/file-system-adapter';

// In-memory adapter
export * from './generic-db/memory-adapter';

// Firestore adapter
export * from './firestore/firestore-adapter';

// Embedding providers
export * from './embedding/google-genai-provider';

// Playwright-specific adapters and utilities
export * from './playwright/playwright-adapter';
export * from './playwright/playwright-embedding';
export * from './playwright/playwright-detective';

// Integrations
export * from './integrations/google-integration';

// JSON API adapter can be added later
// export * from './json-api/json-api-adapter';