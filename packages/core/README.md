# @flakiness-detective/core

Core algorithms and interfaces for flakiness detection.

## Overview

The core package provides the fundamental functionality for the Flakiness Detective system. It includes:

- Main `FlakinessDetective` class that orchestrates the detection process
- Embedding functionality to convert test failures into vector representations
- Clustering algorithms to group similar failures
- Pattern detection to identify common characteristics in failures
- Type definitions for the entire system

## Installation

```bash
npm install @flakiness-detective/core
```

## Key Components

### FlakinessDetective

The main class that orchestrates the flakiness detection process. It:

1. Fetches test failures from a data source
2. Extracts patterns from failures
3. Generates embeddings for failures
4. Clusters failures based on similarity
5. Saves identified clusters

```typescript
import { createFlakinessDetective } from '@flakiness-detective/core';

// Create an instance with the required adapters
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
```

### Embedding

The system uses embeddings to convert test failures into vector representations for similarity comparison. The package provides:

- `EmbeddingProvider` interface for generating embeddings
- Helper functions for creating rich embedding context

### Clustering

DBSCAN (Density-Based Spatial Clustering of Applications with Noise) algorithm is used to group similar failures. The package includes:

- `clusterFailures` function for performing the clustering
- Configurable options for the clustering algorithm

### Pattern Detection

Functions for extracting structured information from test failures:

- Extract file paths, line numbers, and code snippets
- Identify framework-specific details like locators and matchers
- Enhance test failures with additional context

## Types

Core types include:

- `TestFailure`: Represents a test failure with all available context
- `TestFailureMetadata`: Additional metadata extracted from failures
- `EmbeddedFailure`: A test failure with its vector embedding
- `FailureCluster`: A cluster of similar test failures
- `ClusteringOptions`: Configuration for the clustering algorithm
- `FlakinessDetectiveConfig`: Overall configuration
- `DataAdapter`: Interface for data storage and retrieval
- `EmbeddingProvider`: Interface for generating embeddings

## Usage

The core package is designed to be used with specific adapters for data storage and embedding generation. See the demo package for a complete example.

## Scripts

- `npm run build` - Compile TypeScript code
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint the source code
- `npm run format` - Format the source code
- `npm run clean` - Remove build artifacts