import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createGoogleCloudDetective, 
  createGooglePlaywrightDetective, 
  createSimplifiedDetective,
  GOOGLE_CLOUD_DEFAULTS,
  GOOGLE_PLAYWRIGHT_DEFAULTS
} from '../google-integration';

// Mock the dependent modules
vi.mock('../../firestore/firestore-adapter', () => {
  const mockAdapter = {
    fetchFailures: vi.fn(),
    saveClusters: vi.fn(),
    fetchClusters: vi.fn(),
    saveFailures: vi.fn()
  };
  return {
    createFirestoreAdapter: vi.fn().mockImplementation((config) => {
      // Save the config with the adapter so we can verify it later
      return {
        ...mockAdapter,
        _config: config
      };
    })
  };
});

vi.mock('../../embedding/google-genai-provider', () => {
  const mockProvider = {
    embedContent: vi.fn(),
    embedBatch: vi.fn()
  };
  return {
    createGoogleGenAIProvider: vi.fn().mockImplementation((config) => {
      // Save the config with the provider so we can verify it later
      return {
        ...mockProvider,
        _config: config
      };
    }),
    GOOGLE_GENAI_DEFAULTS: {
      modelName: 'embedding-001',
      taskType: 'CLUSTERING',
      dimensions: 768
    }
  };
});

vi.mock('../../playwright/playwright-embedding', () => {
  const mockProvider = {
    embedContent: vi.fn(),
    embedBatch: vi.fn(),
    embedPlaywrightFailures: vi.fn()
  };
  return {
    createPlaywrightEmbeddingProvider: vi.fn().mockImplementation((provider, config) => {
      // Save the provider and config so we can verify them later
      return {
        ...mockProvider,
        _provider: provider,
        _config: config
      };
    }),
    PLAYWRIGHT_EMBEDDING_DEFAULTS: {
      selectors: { weight: 2.0 },
      timeouts: { weight: 1.5 },
      assertions: { weight: 1.8 }
    }
  };
});

vi.mock('../../playwright/playwright-adapter', () => ({
  PlaywrightAdapter: class MockPlaywrightAdapter {
    constructor() {}
    processPlaywrightResults = vi.fn()
  },
  createPlaywrightAdapter: vi.fn().mockReturnValue({
    processPlaywrightResults: vi.fn()
  })
}));

vi.mock('../../playwright/playwright-detective', () => ({
  PlaywrightFlakinessDetective: class MockPlaywrightFlakinessDetective {
    constructor() {}
    processResults = vi.fn()
  },
  createPlaywrightFlakinessDetective: vi.fn(),
  PLAYWRIGHT_DEFAULTS: {
    extractSelectors: true,
    includeSnippets: true
  }
}));

vi.mock('@flakiness-detective/core', () => {
  return {
    createFlakinessDetective: vi.fn().mockImplementation((adapter, provider, config) => {
      return {
        adapter,
        provider,
        config,
        detect: vi.fn(),
        getClusters: vi.fn()
      };
    })
  };
});

// Import the mocked modules for assertions
import { createFirestoreAdapter } from '../../firestore/firestore-adapter';
import { createGoogleGenAIProvider } from '../../embedding/google-genai-provider';
import { createPlaywrightEmbeddingProvider } from '../../playwright/playwright-embedding';
import { createFlakinessDetective } from '@flakiness-detective/core';

describe('Google Cloud Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGoogleCloudDetective', () => {
    it('should create a detective with Google Cloud services', () => {
      // Create a mock adapter and provider to work with
      const mockAdapter = { type: 'adapter' };
      const mockProvider = { type: 'provider' };
      const mockDetective = { detect: vi.fn(), getClusters: vi.fn() };
      
      // Force the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockProvider as any);
      vi.mocked(createFlakinessDetective).mockReturnValueOnce(mockDetective as any);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key'
      };

      const detective = createGoogleCloudDetective(config);

      // Verify the adapter was created with correct config
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'test-project',
        failuresCollection: GOOGLE_CLOUD_DEFAULTS.storage?.failuresCollection,
        clustersCollection: GOOGLE_CLOUD_DEFAULTS.storage?.clustersCollection
      }));

      // Verify the embedding provider was created with correct config
      expect(createGoogleGenAIProvider).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'test-api-key'
      }));

      // Verify the detective was created with both components
      expect(createFlakinessDetective).toHaveBeenCalledWith(
        mockAdapter, // adapter
        mockProvider, // embedding provider
        expect.objectContaining({
          clustering: expect.anything(),
          timeWindow: expect.anything()
        })
      );

      // Verify the detective is returned
      expect(detective).toBeDefined();
      expect(detective.detect).toBeDefined();
      expect(detective.getClusters).toBeDefined();
    });

    it('should use custom configuration when provided', () => {
      // Create a mock adapter and provider to work with
      const mockAdapter = { type: 'adapter' };
      const mockProvider = { type: 'provider' };
      
      // Force the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockProvider as any);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key',
        storage: {
          failuresCollection: 'custom_failures',
          clustersCollection: 'custom_clusters'
        },
        embedding: {
          modelName: 'custom-model',
          dimensions: 1024
        },
        detective: {
          timeWindow: { days: 14 },
          clustering: { epsilon: 0.5 }
        }
      };

      createGoogleCloudDetective(config);

      // Verify the adapter was created with custom config
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        failuresCollection: 'custom_failures',
        clustersCollection: 'custom_clusters'
      }));

      // Verify the embedding provider was created with custom config
      expect(createGoogleGenAIProvider).toHaveBeenCalledWith(expect.objectContaining({
        modelName: 'custom-model',
        dimensions: 1024
      }));

      // Verify the detective was created with custom config
      expect(createFlakinessDetective).toHaveBeenCalledWith(
        mockAdapter,
        mockProvider,
        expect.objectContaining({
          timeWindow: { days: 14 },
          clustering: expect.objectContaining({ epsilon: 0.5 })
        })
      );
    });
  });

  describe('createGooglePlaywrightDetective', () => {
    it('should create a detective with Google Cloud services and Playwright specifics', () => {
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key'
      };

      const detective = createGooglePlaywrightDetective(config);

      // Verify the firestore adapter was created
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'test-project'
      }));

      // Verify the GenAI provider was created
      expect(createGoogleGenAIProvider).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'test-api-key'
      }));

      // Verify the Playwright embedding provider was created with the GenAI provider
      expect(createPlaywrightEmbeddingProvider).toHaveBeenCalled();

      // Verify the detective was created
      expect(createFlakinessDetective).toHaveBeenCalled();

      // Verify a detective instance is returned
      expect(detective).toBeDefined();
    });

    it('should use custom Playwright configuration when provided', () => {
      // Create mock objects for all dependencies
      const mockGenAIProvider = { type: 'genai-provider' };
      const mockFirestoreAdapter = { type: 'firestore-adapter' };
      
      // Force the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockFirestoreAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockGenAIProvider as any);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key',
        playwright: {
          storage: {
            extractSelectors: false,
            includeSnippets: false
          },
          embedding: {
            selectors: { weight: 3.0 },
            timeouts: { weight: 2.5 }
          }
        }
      };

      createGooglePlaywrightDetective(config);

      // Verify the Playwright embedding provider was created with custom config
      expect(createPlaywrightEmbeddingProvider).toHaveBeenCalledWith(
        mockGenAIProvider,
        expect.objectContaining({
          selectors: { weight: 3.0 },
          timeouts: { weight: 2.5 }
        })
      );
    });
  });

  describe('createSimplifiedDetective', () => {
    it('should create a detective with simplified configuration', () => {
      // Create mock objects for dependencies
      const mockAdapter = { type: 'adapter' };
      const mockProvider = { type: 'provider' };
      const mockDetective = { detect: vi.fn(), getClusters: vi.fn() };
      
      // Set up the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockProvider as any);
      vi.mocked(createFlakinessDetective).mockReturnValue(mockDetective as any);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key'
      };

      const detective = createSimplifiedDetective(config);

      // Verify the detective was created with simplified configuration
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'test-project',
        failuresCollection: 'test_failures',
        clustersCollection: 'flaky_clusters'
      }));

      // Verify a detective instance is returned
      expect(detective).toBeDefined();
    });

    it('should use custom simplified configuration when provided', () => {
      // Create mock objects for dependencies
      const mockAdapter = { type: 'adapter' };
      const mockProvider = { type: 'provider' };
      
      // Set up the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockProvider as any);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key',
        failuresCollection: 'custom_test_runs',
        clustersCollection: 'custom_clusters',
        timeWindowDays: 30,
        failureStatusFilter: 'error'
      };

      createSimplifiedDetective(config);

      // Verify the detective was created with custom simplified configuration
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        failuresCollection: 'custom_test_runs',
        clustersCollection: 'custom_clusters',
        failureStatusFilter: 'error'
      }));

      // Verify the detective was created with custom time window
      expect(createFlakinessDetective).toHaveBeenCalledWith(
        mockAdapter,
        mockProvider,
        expect.objectContaining({
          timeWindow: { days: 30 }
        })
      );
    });
    
    it('should support customQueryFn option', () => {
      // Create mock objects for dependencies
      const mockAdapter = { type: 'adapter' };
      const mockProvider = { type: 'provider' };
      
      // Set up the mocks to return our test objects
      vi.mocked(createFirestoreAdapter).mockReturnValueOnce(mockAdapter as any);
      vi.mocked(createGoogleGenAIProvider).mockReturnValueOnce(mockProvider as any);
      
      // Create a mock custom query function
      const customQueryFn = vi.fn().mockResolvedValue([]);
      
      const config = {
        projectId: 'test-project',
        apiKey: 'test-api-key',
        customQueryFn
      };

      createSimplifiedDetective(config);

      // Verify the detective was created with customQueryFn
      expect(createFirestoreAdapter).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'test-project',
        customQueryFn
      }));
    });
  });
});