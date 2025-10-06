import { createFlakinessDetective, FlakinessDetectiveConfig } from '@flakiness-detective/core';
import { FirestoreAdapter, FirestoreAdapterConfig, createFirestoreAdapter } from '../firestore/firestore-adapter';
import { GoogleGenAIProvider, GoogleGenAIConfig, createGoogleGenAIProvider, GOOGLE_GENAI_DEFAULTS } from '../embedding/google-genai-provider';
import { PlaywrightAdapter, PlaywrightAdapterConfig, createPlaywrightAdapter } from '../playwright/playwright-adapter';
import { PlaywrightEmbeddingProvider, createPlaywrightEmbeddingProvider, PLAYWRIGHT_EMBEDDING_DEFAULTS } from '../playwright/playwright-embedding';
import { PlaywrightFlakinessDetective, createPlaywrightFlakinessDetective, PLAYWRIGHT_DEFAULTS } from '../playwright/playwright-detective';

/**
 * Google Cloud integration configuration combining Firestore and Google GenAI
 */
export interface GoogleCloudConfig {
  /** Google Cloud project ID */
  projectId: string;
  
  /** Google AI API key */
  apiKey: string;
  
  /** Storage configuration (Firestore) */
  storage?: Partial<Omit<FirestoreAdapterConfig, 'projectId'>>;
  
  /** Embedding configuration (Google GenAI) */
  embedding?: Partial<Omit<GoogleGenAIConfig, 'apiKey'>>;
  
  /** General flakiness detective configuration */
  detective?: Partial<FlakinessDetectiveConfig>;
}

/**
 * Default configuration for Google Cloud integration
 */
export const GOOGLE_CLOUD_DEFAULTS: Partial<GoogleCloudConfig> = {
  storage: {
    failuresCollection: 'test_failures',
    clustersCollection: 'flaky_clusters',
  },
  embedding: {
    ...GOOGLE_GENAI_DEFAULTS,
  },
  detective: {
    clustering: {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 3,
    },
    timeWindow: {
      days: 7,
    }
  }
};

/**
 * Configuration for Google Cloud integration with Playwright
 */
export interface GooglePlaywrightConfig extends GoogleCloudConfig {
  /** Playwright-specific configuration */
  playwright?: Partial<{
    storage: Partial<Omit<PlaywrightAdapterConfig, 'dataDir'>>;
    embedding: Partial<typeof PLAYWRIGHT_EMBEDDING_DEFAULTS>;
  }>;
}

/**
 * Default configuration for Google Cloud integration with Playwright
 */
export const GOOGLE_PLAYWRIGHT_DEFAULTS: Partial<GooglePlaywrightConfig> = {
  ...GOOGLE_CLOUD_DEFAULTS,
  playwright: {
    storage: {
      extractSelectors: true,
      includeSnippets: true,
      ignoreConsoleErrors: true,
    },
    embedding: PLAYWRIGHT_EMBEDDING_DEFAULTS,
  }
};

/**
 * Create a Flakiness Detective using Google Cloud services (Firestore + GenAI)
 * 
 * @param config Google Cloud configuration
 * @returns Configured Flakiness Detective instance
 */
export function createGoogleCloudDetective(config: GoogleCloudConfig) {
  // Create the Firestore adapter
  const adapter = createFirestoreAdapter({
    projectId: config.projectId,
    ...GOOGLE_CLOUD_DEFAULTS.storage,
    ...config.storage,
  });
  
  // Create the Google GenAI provider
  const embeddingProvider = createGoogleGenAIProvider({
    apiKey: config.apiKey,
    ...GOOGLE_CLOUD_DEFAULTS.embedding,
    ...config.embedding,
  });
  
  // Create the Flakiness Detective
  return createFlakinessDetective(
    adapter,
    embeddingProvider,
    {
      ...GOOGLE_CLOUD_DEFAULTS.detective,
      ...config.detective,
    }
  );
}

/**
 * Create a Playwright-specific Flakiness Detective using Google Cloud services
 * 
 * @param config Google Cloud configuration with Playwright options
 * @returns Configured Playwright Flakiness Detective instance
 */
export function createGooglePlaywrightDetective(config: GooglePlaywrightConfig) {
  // Create the Firestore adapter
  const firestoreAdapter = createFirestoreAdapter({
    projectId: config.projectId,
    ...GOOGLE_CLOUD_DEFAULTS.storage,
    ...config.storage,
  });
  
  // Create the Google GenAI provider
  const genaiProvider = createGoogleGenAIProvider({
    apiKey: config.apiKey,
    ...GOOGLE_CLOUD_DEFAULTS.embedding,
    ...config.embedding,
  });
  
  // Create the Playwright embedding provider wrapped around Google GenAI
  const playwrightEmbeddingProvider = createPlaywrightEmbeddingProvider(
    genaiProvider,
    {
      ...GOOGLE_PLAYWRIGHT_DEFAULTS.playwright?.embedding,
      ...config.playwright?.embedding,
    }
  );
  
  // Create the Playwright adapter that uses Firestore
  // This is a special case where we extend the Playwright adapter to use Firestore
  // instead of the file system for storage
  class PlaywrightFirestoreAdapter extends PlaywrightAdapter {
    private firestoreAdapter: FirestoreAdapter;
    
    constructor(playwrightConfig: PlaywrightAdapterConfig, firestoreAdapter: FirestoreAdapter) {
      super(playwrightConfig);
      this.firestoreAdapter = firestoreAdapter;
    }
    
    // Override methods to use Firestore
    async fetchFailures(days: number) {
      return this.firestoreAdapter.fetchFailures(days);
    }
    
    async saveClusters(clusters: any[]) {
      return this.firestoreAdapter.saveClusters(clusters);
    }
    
    async fetchClusters(limit?: number) {
      return this.firestoreAdapter.fetchClusters(limit);
    }
    
    async saveFailures(failures: any[]) {
      return this.firestoreAdapter.saveFailures(failures);
    }
    
    // We maintain the Playwright-specific parsing methods
    // but use Firestore for storage
  }
  
  // Create the hybrid adapter
  const hybridAdapter = new PlaywrightFirestoreAdapter(
    {
      dataDir: './not-used', // Not used with Firestore
      ...GOOGLE_PLAYWRIGHT_DEFAULTS.playwright?.storage,
      ...config.playwright?.storage,
    },
    firestoreAdapter
  );
  
  // Create the Flakiness Detective with the hybrid components
  const detective = createFlakinessDetective(
    hybridAdapter,
    playwrightEmbeddingProvider,
    {
      ...GOOGLE_CLOUD_DEFAULTS.detective,
      ...config.detective,
    }
  );
  
  // Return a Playwright-specific detective
  return new PlaywrightFlakinessDetective(
    detective,
    hybridAdapter,
    playwrightEmbeddingProvider
  );
}

/**
 * Create Flakiness Detective with simplified configuration
 * 
 * This provides a simpler interface for creating a Flakiness Detective with common defaults
 * 
 * @param options Simple configuration options
 * @returns Configured Flakiness Detective instance
 */
export function createSimplifiedDetective({
  projectId,
  apiKey,
  failuresCollection = 'test_failures',
  clustersCollection = 'flaky_clusters',
  timeWindowDays = 7,
  failureStatusFilter,
  firestoreInstance,
  customQueryFn
}: {
  projectId: string;
  apiKey: string;
  failuresCollection?: string;
  clustersCollection?: string;
  timeWindowDays?: number;
  failureStatusFilter?: string;
  firestoreInstance?: any;
  customQueryFn?: (db: any, collection: string, days: number) => Promise<any[]>;
}) {
  return createGoogleCloudDetective({
    projectId,
    apiKey,
    storage: {
      failuresCollection,
      clustersCollection,
      failureStatusFilter,
      firestoreInstance,
      customQueryFn
    },
    detective: {
      timeWindow: {
        days: timeWindowDays
      }
    }
  });
}