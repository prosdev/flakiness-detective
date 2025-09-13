# Playwright Integration for Flakiness Detective

A specialized, opinionated implementation of the Flakiness Detective for Playwright test automation.

## Overview

This module provides Playwright-specific enhancements to the core Flakiness Detective, including:

1. **Specialized Parsing** - Deep parsing of Playwright-specific error messages and test results
2. **Optimized Embeddings** - Weighting of Playwright features like selectors and timeouts
3. **Simplified Setup** - Factory functions with Playwright-optimized defaults
4. **Enhanced Insights** - Playwright-specific flakiness pattern detection

While maintaining the extensible architecture of the core system, this implementation offers a first-class, tailored experience for Playwright users.

## Usage

```typescript
import { createPlaywrightFlakinessDetective } from '@flakiness-detective/adapters';
import { YourEmbeddingProvider } from './your-embedding-provider';

// Create your base embedding provider (Google AI, OpenAI, etc.)
const embeddingProvider = new YourEmbeddingProvider({
  apiKey: 'your-api-key'
});

// Create Playwright-specific detective with optimized defaults
const detective = createPlaywrightFlakinessDetective(
  embeddingProvider,
  {
    storage: {
      dataDir: './playwright-flakiness-data'
    }
  }
);

// Process Playwright test results
await detective.processResults(playwrightTestResults);

// Get flaky test clusters
const clusters = await detective.getClusters();
```

## Key Components

### PlaywrightAdapter

Specialized data adapter with deep parsing of Playwright test results:

```typescript
const adapter = createPlaywrightAdapter({
  dataDir: './data',
  extractSelectors: true,
  includeSnippets: true
});

// Process raw Playwright test results
await adapter.processPlaywrightResults(playwrightResults);
```

### PlaywrightEmbeddingProvider

Enhanced embedding provider that emphasizes Playwright-specific features:

```typescript
const playwrightEmbedding = createPlaywrightEmbeddingProvider(
  baseEmbeddingProvider,
  {
    selectors: { weight: 2.0 },  // Emphasize selectors
    timeouts: { weight: 1.5 },   // Emphasize timeouts
    assertions: { weight: 1.8 }  // Emphasize assertions
  }
);
```

### PlaywrightFlakinessDetective

Complete solution with optimized defaults for Playwright:

```typescript
const detective = createPlaywrightFlakinessDetective(
  baseEmbeddingProvider,
  {
    // Use defaults optimized for Playwright
    // or customize as needed
  }
);

// One-step processing
await detective.processResults(playwrightResults);
```

## Configuration

### Default Configuration

```typescript
const PLAYWRIGHT_DEFAULTS = {
  storage: {
    dataDir: './playwright-flakiness-data',
    failuresFile: 'playwright-failures.json',
    clustersFile: 'playwright-clusters.json',
    extractSelectors: true,
    includeSnippets: true,
    ignoreConsoleErrors: true,
  },
  embedding: {
    dimensions: 768,
    modelName: 'default',
    selectors: { weight: 2.0 },
    timeouts: { weight: 1.5 },
    assertions: { weight: 1.8 },
  },
  clustering: {
    epsilon: 0.3,
    minPoints: 2,
    minClusterSize: 2,
  },
  timeWindow: {
    days: 7,
  }
};
```

### Customization

You can override any part of the default configuration:

```typescript
const detective = createPlaywrightFlakinessDetective(
  baseEmbeddingProvider,
  {
    storage: {
      dataDir: './custom-data-dir',
      extractSelectors: false
    },
    clustering: {
      epsilon: 0.4,
      minClusterSize: 3
    }
  }
);
```

## Playwright-Specific Features

### Specialized Error Parsing

- Extracts selectors, locators, and matchers
- Identifies timeout values
- Parses assertion patterns
- Captures expected vs. actual values

### Enhanced Embedding Context

- Weights selectors higher as they're common flakiness sources
- Emphasizes timeouts in the embedding context
- Highlights assertion patterns

### Optimized Clustering

- Tuned epsilon values for Playwright error patterns
- Lower minimum cluster size to catch flakiness early
- Special handling of selector-based issues

## Example

See the `packages/demo/src/playwright-example` directory for a complete working example.