# Flakiness Detective

An AI-powered test flakiness detection and analysis tool.

## Overview

Flakiness Detective automatically analyzes test failures to identify patterns that indicate flaky tests. It uses:

- **AI Embeddings** - Converts error messages into vector representations
- **Density Clustering** - Groups similar failures together
- **Pattern Analysis** - Identifies common failure patterns and code locations
- **Test Framework Integration** - Specialized analysis for test framework failures

## Features

### 🔍 **Intelligent Failure Analysis**
- Analyzes test failures from configurable time windows
- Extracts structured data from error messages
- Identifies common file paths, line numbers, and code snippets

### 🧠 **AI-Powered Clustering**
- Uses embeddings to create semantic representations
- Groups similar failures using density-based clustering
- Identifies failure patterns that occur across multiple test runs

### 📊 **Pattern Detection**
- **File Path Patterns** - Common failure locations
- **Line Number Patterns** - Specific lines causing issues
- **Code Snippet Patterns** - Recurring code that fails
- **Framework-Specific Patterns**:
  - Common locators (selectors)
  - Common matchers (assertions)
  - Timeout patterns
  - Assertion patterns

## Project Structure

```
flakiness-detective/
├── packages/
│   ├── core/             # Core algorithms and interfaces
│   ├── adapters/         # Data source adapters
│   ├── visualization/    # Visualization components
│   └── demo/             # Demo application
├── examples/             # Example implementations
└── docs/                 # Documentation
```

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flakiness-detective.git
cd flakiness-detective

# Install dependencies using PNPM
pnpm install
```

### Basic Usage

```typescript
import { 
  createFlakinessDetective,
  InMemoryAdapter,
  MockEmbeddingProvider
} from 'flakiness-detective';

// Create data adapter
const dataAdapter = new InMemoryAdapter();

// Create embedding provider
const embeddingProvider = new MockEmbeddingProvider();

// Create detective instance
const detective = createFlakinessDetective(
  dataAdapter,
  embeddingProvider,
  {
    timeWindow: { days: 7 },
    clustering: {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 3
    }
  }
);

// Run detection
const clusters = await detective.detect();
console.log(`Found ${clusters.length} flaky test patterns`);
```

## Adapters

### File System Adapter

Store and retrieve data from the local file system:

```typescript
import { FileSystemAdapter } from '@flakiness-detective/adapters';

const fsAdapter = new FileSystemAdapter({
  dataDir: './data'
});
```

### In-Memory Adapter

Store data in memory (useful for testing):

```typescript
import { InMemoryAdapter } from '@flakiness-detective/adapters';

const memoryAdapter = new InMemoryAdapter();
```

### Firestore Adapter

Store and retrieve data from Google Cloud Firestore:

```typescript
import { createFirestoreAdapter } from '@flakiness-detective/adapters';

const firestoreAdapter = createFirestoreAdapter({
  projectId: 'your-google-cloud-project-id',
  failuresCollection: 'test_failures',
  clustersCollection: 'flaky_clusters',
  // Optional: specify a custom credentials path
  credentialsPath: './service-account-key.json'
});
```

### Google Integration

Simplified integration with Google Cloud and GenAI:

```typescript
import { createGoogleCloudDetective } from '@flakiness-detective/adapters';

const detective = createGoogleCloudDetective({
  projectId: 'your-google-cloud-project-id',
  apiKey: 'your-google-api-key',
  storage: {
    failuresCollection: 'test_failures',
    clustersCollection: 'flaky_clusters'
  }
});

const clusters = await detective.detect();
```

## Examples

For more detailed examples, check the [examples](./examples/) directory:

- [Firestore Integration](./examples/firestore-adapter.ts)
- [Google Cloud Integration](./packages/demo/src/google-integration-example/index.ts)
- [Playwright Integration](./packages/demo/src/playwright-example/index.ts)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.