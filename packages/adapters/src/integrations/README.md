# Flakiness Detective Integrations

Ready-to-use integrations that combine multiple components for specific use cases.

## Google Cloud Integration

A comprehensive integration that combines Google Cloud services for a complete flakiness detection solution.

### Overview

The Google Cloud integration provides:

- Firestore for data storage
- Google Generative AI for embeddings
- Optional Playwright-specific enhancements
- Direct compatibility with Lytics E2E Dashboard

This integration gives you a production-ready setup with minimal configuration.

### Installation

```bash
npm install @flakiness-detective/adapters firebase-admin @google/generative-ai
```

The integration requires both `firebase-admin` and `@google/generative-ai` as peer dependencies.

### Basic Usage

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

### Playwright-Specific Usage

```typescript
import { createGooglePlaywrightDetective } from '@flakiness-detective/adapters';

// Create a Playwright-specific detective with Google Cloud
const detective = createGooglePlaywrightDetective({
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-ai-api-key',
  playwright: {
    storage: {
      extractSelectors: true,
      includeSnippets: true
    },
    embedding: {
      selectors: { weight: 2.0 },
      timeouts: { weight: 1.5 }
    }
  }
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
  googleApiKey: process.env.GOOGLE_API_KEY,
  failuresCollection: 'individual_test_runs',
  clustersCollection: 'flaky_clusters',
  timeWindowDays: 7,
  failureStatusFilter: 'failed'
});

// Run detection
await detective.detect();
```

### Configuration Options

#### Standard Google Cloud Configuration

```typescript
const detective = createGoogleCloudDetective({
  // Required
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-ai-api-key',
  
  // Optional storage configuration
  storage: {
    failuresCollection: 'test_failures',
    clustersCollection: 'flaky_clusters',
    credentialsPath: './service-account-key.json'
  },
  
  // Optional embedding configuration
  embedding: {
    modelName: 'embedding-001',
    taskType: 'CLUSTERING'
  },
  
  // Optional detective configuration
  detective: {
    clustering: {
      epsilon: 0.3,
      minPoints: 2
    },
    timeWindow: {
      days: 7
    }
  }
});
```

#### Playwright-Specific Configuration

```typescript
const detective = createGooglePlaywrightDetective({
  // Required
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-ai-api-key',
  
  // Standard configuration (same as above)
  storage: { ... },
  embedding: { ... },
  detective: { ... },
  
  // Playwright-specific configuration
  playwright: {
    storage: {
      extractSelectors: true,
      includeSnippets: true,
      ignoreConsoleErrors: true
    },
    embedding: {
      selectors: { weight: 2.0 },
      timeouts: { weight: 1.5 },
      assertions: { weight: 1.8 }
    }
  }
});
```

### Architecture

The integration combines multiple components:

1. **FirestoreAdapter**: Handles data storage and retrieval
2. **GoogleGenAIProvider**: Generates embeddings for test failures
3. **PlaywrightAdapter** (optional): Adds Playwright-specific parsing
4. **PlaywrightEmbeddingProvider** (optional): Enhances embeddings for Playwright

This modular architecture allows for customization while providing sensible defaults.