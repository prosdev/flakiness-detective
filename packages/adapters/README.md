# @flakiness-detective/adapters

Data source adapters for flakiness detection.

## Overview

The adapters package provides implementations of the `DataAdapter` interface from the core package, allowing the Flakiness Detective to work with various data sources. Current implementations include:

- **FileSystemAdapter**: Stores and retrieves data from the local file system
- **InMemoryAdapter**: Stores data in memory (primarily for testing and demos)
- **FirestoreAdapter**: Stores and retrieves data from Google Cloud Firestore
- **GoogleGenAIProvider**: Generates embeddings using Google's Generative AI

## Quick Start

### Google Cloud Integration

```typescript
import { createGoogleCloudDetective } from '@flakiness-detective/adapters';

// Create a Google Cloud-powered detective
const detective = createGoogleCloudDetective({
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-ai-api-key'
});

// Run flakiness detection
const clusters = await detective.detect();
```

### Playwright-Specific Google Cloud Integration

```typescript
import { createGooglePlaywrightDetective } from '@flakiness-detective/adapters';

// Create a Playwright-specific detective with Google Cloud
const detective = createGooglePlaywrightDetective({
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-ai-api-key'
});

// Process Playwright test results
await detective.processResults(playwrightResults);
```

### Lytics E2E Dashboard Compatibility

```typescript
import { createLyticsCompatibleDetective } from '@flakiness-detective/adapters';

// Create a detective that matches Lytics E2E Dashboard
const detective = createLyticsCompatibleDetective({
  googleProjectId: 'lytics-playwright',
  googleApiKey: process.env.GOOGLE_API_KEY
});

// Run detection
await detective.detect();
```

## Installation

```bash
npm install @flakiness-detective/adapters
```

For Google Cloud integration, also install:

```bash
npm install firebase-admin @google/generative-ai
```

## Available Adapters

### Data Adapters

Data adapters implement the `DataAdapter` interface for storage and retrieval of test failures and clusters.

| Adapter | Description | Dependencies |
|---------|-------------|--------------|
| [FileSystemAdapter](./src/file-system) | Stores data in the local file system | None |
| [InMemoryAdapter](./src/generic-db) | Stores data in memory | None |
| [FirestoreAdapter](./src/firestore) | Stores data in Google Cloud Firestore | firebase-admin |

### Embedding Providers

Embedding providers implement the `EmbeddingProvider` interface for generating vector embeddings.

| Provider | Description | Dependencies |
|---------|-------------|--------------|
| [GoogleGenAIProvider](./src/embedding) | Generates embeddings using Google's Generative AI | @google/generative-ai |

### Framework-Specific Adapters

Framework-specific adapters provide optimized implementations for specific test frameworks.

| Adapter | Description | Dependencies |
|---------|-------------|--------------|
| [PlaywrightAdapter](./src/playwright) | Specialized adapter for Playwright tests | None |

### Integrations

Ready-to-use integrations that combine multiple components for specific use cases.

| Integration | Description | Dependencies |
|-------------|-------------|--------------|
| [GoogleIntegration](./src/integrations) | Combines Firestore and Google GenAI | firebase-admin, @google/generative-ai |

## Scripts

- `npm run build` - Compile TypeScript code
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint the source code
- `npm run format` - Format the source code
- `npm run clean` - Remove build artifacts