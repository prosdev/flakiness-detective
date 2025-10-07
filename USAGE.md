# Flakiness Detective Usage Guide

This document provides instructions for using the flakiness-detective package in your projects.

## Installation

```bash
npm install flakiness-detective
```

## Basic Usage

```typescript
import { createSimplifiedDetective } from 'flakiness-detective';

// Create a detective with simplified configuration
const detective = createSimplifiedDetective({
  projectId: 'your-google-cloud-project',
  apiKey: 'your-google-ai-api-key',
  failuresCollection: 'test_failures',  // Collection name for test failures
  clustersCollection: 'flaky_clusters', // Collection name for flaky clusters
  timeWindowDays: 7                     // Analysis window in days
});

// Run the detection
async function detectFlaky() {
  const clusters = await detective.detect();
  console.log(`Found ${clusters.length} flaky test clusters`);
}
```

## Usage with Custom Query Function

If you have a specific database schema or want to avoid requiring Firestore indexes, you can provide a custom query function:

```typescript
import { createSimplifiedDetective } from 'flakiness-detective';
import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore
const db = new Firestore();

// Create a detective with custom query function
const detective = createSimplifiedDetective({
  projectId: 'your-google-cloud-project',
  apiKey: 'your-google-ai-api-key',
  failuresCollection: 'your_failures_collection',
  clustersCollection: 'your_clusters_collection',
  firestoreInstance: db,  // Use your existing Firestore instance
  
  // Custom query function to avoid requiring an index
  customQueryFn: async (db, collection, days) => {
    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    // Use a simple query that doesn't require a composite index
    const snap = await db.collection(collection)
      .where('timestamp', '>=', cutoff)
      .get();
    
    // Filter client-side instead of using a compound query
    return snap.docs.filter(doc => {
      const data = doc.data();
      return data.status === 'failed' || data.status === 'error';
    });
  }
});
```

## Integration with Lytics E2E Dashboard

For users of the Lytics E2E Dashboard, the package provides a drop-in replacement for the existing flakiness detection implementation:

```typescript
import { createSimplifiedDetective } from 'flakiness-detective';
import { db } from '../src/lib/firestore';

export async function runFlakinessDetective(windowDays = 7) {
  try {
    // Create the detective with simplified configuration
    const detective = createSimplifiedDetective({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
      apiKey: process.env.GOOGLE_API_KEY || '',
      failuresCollection: 'individual_test_runs',
      clustersCollection: 'flaky_clusters',
      timeWindowDays: windowDays,
      firestoreInstance: db, // Pass your existing Firestore instance
      
      // Custom query function to avoid requiring an index
      customQueryFn: async (db, collection, days) => {
        // Calculate cutoff date
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        // Use simpler query with client-side filtering
        const snap = await db.collection(collection)
          .where('runTimestamp', '>=', cutoff)
          .get();
        
        // Filter client-side to avoid composite index requirement
        return snap.docs.filter(doc => {
          const data = doc.data();
          return data.status !== 'passed';
        });
      }
    });
    
    // Run the detection
    const clusters = await detective.detect();
    console.log(`Found ${clusters.length} flaky test clusters`);
  } catch (error) {
    console.error('Error in flakiness detection:', error);
  }
}
```

## Advanced Configuration

The package supports more advanced configurations through the `createGoogleCloudDetective` function:

```typescript
import { createGoogleCloudDetective } from 'flakiness-detective';

const detective = createGoogleCloudDetective({
  projectId: 'your-google-cloud-project',
  apiKey: 'your-google-ai-api-key',
  storage: {
    failuresCollection: 'test_failures',
    clustersCollection: 'flaky_clusters',
    failureStatusFilter: 'failed',
    firestoreInstance: yourFirestoreInstance,
    customQueryFn: yourCustomQueryFunction
  },
  embedding: {
    modelName: 'embedding-001',
    taskType: 'CLUSTERING',
    dimensions: 768
  },
  detective: {
    clustering: {
      epsilon: 0.3,       // Similarity threshold for clustering
      minPoints: 2,       // Minimum points to form a cluster
      minClusterSize: 3   // Minimum cluster size to report
    },
    timeWindow: {
      days: 7             // Analysis window in days
    }
  }
});
```

## Playwright Integration

For Playwright test integration, use the dedicated Playwright detective:

```typescript
import { createGooglePlaywrightDetective } from 'flakiness-detective';

const detective = createGooglePlaywrightDetective({
  projectId: 'your-google-cloud-project',
  apiKey: 'your-google-ai-api-key',
  playwright: {
    storage: {
      extractSelectors: true,    // Extract CSS selectors from errors
      includeSnippets: true,     // Include code snippets in analysis
      ignoreConsoleErrors: true  // Ignore console errors
    },
    embedding: {
      selectors: { weight: 2.0 },  // Weighting for selectors in embeddings
      timeouts: { weight: 1.5 },   // Weighting for timeouts in embeddings
      assertions: { weight: 1.8 }  // Weighting for assertions in embeddings
    }
  }
});

// Process Playwright test results
const results = await detective.processResults(playwrightResultsJson);
```

## Error Handling

The package includes robust error handling for common issues:

```typescript
try {
  const clusters = await detective.detect();
  console.log(`Found ${clusters.length} flaky test clusters`);
} catch (error) {
  if (error.message?.includes('requires an index')) {
    console.error('Firestore index error - this is expected the first time you run the query.');
    console.error('Please create the required index using the link in the error message.');
  } else if (error.message?.includes('quota')) {
    console.error('Google AI API quota exceeded - this is a rate limit issue.');
    console.error('You may need to wait or upgrade your API plan.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```