# Embedding Providers for Flakiness Detective

This directory contains implementations of the `EmbeddingProvider` interface for different embedding services.

## Google Generative AI Provider

A specialized implementation that uses Google's Generative AI to create embeddings for test failures.

### Overview

The Google GenAI provider enables:

- High-quality embeddings using Google's advanced AI models
- Semantic understanding of test failures
- Integration with other Google Cloud services
- Compatible with Lytics E2E Dashboard

### Installation

```bash
npm install @flakiness-detective/adapters @google/generative-ai
```

The Google GenAI provider requires `@google/generative-ai` as a peer dependency.

### Usage

```typescript
import { createGoogleGenAIProvider } from '@flakiness-detective/adapters';
import { createFlakinessDetective } from '@flakiness-detective/core';

// Create a Google GenAI provider
const embeddingProvider = createGoogleGenAIProvider({
  apiKey: 'your-google-ai-api-key',
  modelName: 'embedding-001',
  taskType: 'CLUSTERING'
});

// Use it with the core detective
const detective = createFlakinessDetective(
  adapter,
  embeddingProvider,
  config
);
```

### Configuration

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `apiKey` | Google AI API key | (Required) |
| `modelName` | Model name to use | `embedding-001` |
| `taskType` | Task type for embedding | `CLUSTERING` |
| `dimensions` | Embedding dimensions | `768` |
| `genAIInstance` | Custom Google GenAI instance | Auto-initialized |

#### Task Types

The provider supports different task types for optimizing embeddings:

- `SEMANTIC_SIMILARITY`: Optimized for comparing text similarity
- `CLASSIFICATION`: Optimized for categorizing text
- `CLUSTERING`: Optimized for grouping similar text (recommended for flakiness detection)

### Lytics E2E Dashboard Compatibility

This provider is designed to be compatible with the Lytics E2E Dashboard:

```typescript
const embeddingProvider = createGoogleGenAIProvider({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: 'embedding-001',
  taskType: 'CLUSTERING'
});
```

### Performance Considerations

- The provider includes batch processing to avoid API rate limits
- Small delays are added between batches
- Default batch size is 5 embeddings per request
- Consider adjusting batch size based on your API quota

### Extending with Custom Models

You can use custom models or configurations:

```typescript
const embeddingProvider = createGoogleGenAIProvider({
  apiKey: 'your-api-key',
  modelName: 'your-custom-model',
  dimensions: 1024  // If your model has different dimensions
});
```