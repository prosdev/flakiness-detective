# Firestore Adapter for Flakiness Detective

A specialized data adapter implementation that uses Google Cloud Firestore for storing and retrieving test failures and flakiness clusters.

## Overview

The Firestore adapter provides a seamless way to integrate the Flakiness Detective with Google Cloud Firestore. This enables:

- Scalable, cloud-based storage for test failure data
- Real-time synchronization across systems
- Integration with existing Google Cloud infrastructure
- Compatible with Lytics E2E Dashboard

## Installation

```bash
npm install @flakiness-detective/adapters firebase-admin
```

The Firestore adapter requires `firebase-admin` as a peer dependency.

## Usage

```typescript
import { createFirestoreAdapter } from '@flakiness-detective/adapters';
import { createFlakinessDetective } from '@flakiness-detective/core';

// Create a Firestore adapter
const adapter = createFirestoreAdapter({
  projectId: 'your-google-cloud-project-id',
  failuresCollection: 'test_failures',
  clustersCollection: 'flaky_clusters',
  // Optional: specify a custom credentials path
  credentialsPath: './service-account-key.json'
});

// Use it with the core detective
const detective = createFlakinessDetective(
  adapter,
  embeddingProvider,
  config
);

// Fetch failures from Firestore
const failures = await adapter.fetchFailures(7); // Last 7 days

// Save clusters to Firestore
await adapter.saveClusters(clusters);
```

## Configuration

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `projectId` | Google Cloud project ID | (Required) |
| `failuresCollection` | Name of the collection to store failures | `test_failures` |
| `clustersCollection` | Name of the collection to store clusters | `flaky_clusters` |
| `firestoreInstance` | Custom Firestore instance | Auto-initialized |
| `failureStatusFilter` | Filter failures by status field | `undefined` |
| `credentialsPath` | Path to service account key file | Auto-detected |

### Authentication

The adapter supports multiple authentication methods:

1. **Service Account Key**:
   ```typescript
   createFirestoreAdapter({
     projectId: 'your-project-id',
     credentialsPath: './service-account-key.json'
   });
   ```

2. **Application Default Credentials**:
   ```typescript
   // Uses credentials from environment variable GOOGLE_APPLICATION_CREDENTIALS
   createFirestoreAdapter({
     projectId: 'your-project-id'
   });
   ```

3. **Custom Firestore Instance**:
   ```typescript
   import { initializeApp, cert } from 'firebase-admin/app';
   import { getFirestore } from 'firebase-admin/firestore';
   
   const app = initializeApp({
     credential: cert('./service-account-key.json')
   });
   
   const db = getFirestore(app);
   
   createFirestoreAdapter({
     projectId: 'your-project-id',
     firestoreInstance: db
   });
   ```

## Lytics E2E Dashboard Compatibility

This adapter is designed to be compatible with the Lytics E2E Dashboard. For direct compatibility:

```typescript
const adapter = createFirestoreAdapter({
  projectId: 'lytics-playwright',
  failuresCollection: 'individual_test_runs',
  clustersCollection: 'flaky_clusters',
  failureStatusFilter: 'failed'
});
```

## Data Structure

### Failures Collection

```typescript
interface FirestoreTestFailure {
  testId: string;
  testTitle: string;
  errorMessage: string;
  timestamp: Timestamp;
  status: string;
  metadata: {
    projectName: string;
    suite: string;
    filePath: string;
    lineNumber: string;
    actualValue: string;
    expectedValue: string;
    locator: string;
    matcher: string;
    timeoutMs: number;
    errorSnippets: string[];
    // Additional fields
  }
}
```

### Clusters Collection

```typescript
interface FirestoreCluster {
  title: string;
  count: number;
  testId: string;
  testTitle: string;
  timestamp: string;
  commonFilePaths: string[];
  commonLineNumbers: string[];
  commonCodeSnippets: string[];
  failurePattern: string;
  commonLocators: string[];
  commonMatchers: string[];
  commonTimeouts: number[];
  assertionPattern: string;
  failureIds: string[];
  failureTimestamps: string[];
  errorMessages: string[];
  // Additional fields for Firestore
  updatedAt: Timestamp;
  weekKey: string;
}
```