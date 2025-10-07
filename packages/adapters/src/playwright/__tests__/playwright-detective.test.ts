// Tests for PlaywrightDetective functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaywrightFlakinessDetective, createPlaywrightFlakinessDetective, PLAYWRIGHT_DEFAULTS } from '../playwright-detective';
import { PlaywrightAdapter } from '../playwright-adapter';
import { PlaywrightEmbeddingProvider } from '../playwright-embedding';
import { EmbeddingProvider, FlakinessDetective } from '@flakiness-detective/core';

// Mock dependencies
vi.mock('@flakiness-detective/core', () => {
  return {
    createFlakinessDetective: vi.fn().mockImplementation(() => ({
      detect: vi.fn().mockResolvedValue([]),
      getClusters: vi.fn().mockResolvedValue([])
    })),
    FlakinessDetective: vi.fn()
  };
});

vi.mock('../playwright-adapter', () => {
  return {
    PlaywrightAdapter: vi.fn().mockImplementation(() => ({
      processPlaywrightResults: vi.fn().mockResolvedValue([]),
      initialize: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

vi.mock('../playwright-embedding', () => {
  return {
    PlaywrightEmbeddingProvider: vi.fn().mockImplementation(() => ({
      embedContent: vi.fn().mockResolvedValue([]),
      embedBatch: vi.fn().mockResolvedValue([]),
      embedPlaywrightFailures: vi.fn().mockResolvedValue([])
    })),
    PLAYWRIGHT_EMBEDDING_DEFAULTS: {
      selectors: { weight: 2.0 },
      timeouts: { weight: 1.5 },
      assertions: { weight: 1.0 }
    }
  };
});

// Import the mocked modules for assertions
import { createFlakinessDetective } from '@flakiness-detective/core';

describe('PlaywrightFlakinessDetective', () => {
  let detective: PlaywrightFlakinessDetective;
  let mockAdapter: any;
  let mockEmbeddingProvider: any;
  let mockCoreDetective: any;
  let mockBaseEmbeddingProvider: EmbeddingProvider;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock instances
    mockAdapter = {
      processPlaywrightResults: vi.fn().mockResolvedValue([])
    };
    
    mockEmbeddingProvider = {
      embedContent: vi.fn().mockResolvedValue([]),
      embedBatch: vi.fn().mockResolvedValue([]),
      embedPlaywrightFailures: vi.fn().mockResolvedValue([])
    };
    
    mockCoreDetective = {
      detect: vi.fn().mockResolvedValue([]),
      getClusters: vi.fn().mockResolvedValue([])
    };

    mockBaseEmbeddingProvider = {
      embedContent: vi.fn().mockResolvedValue([]),
      embedBatch: vi.fn().mockResolvedValue([])
    };

    // Create the detective instance with mocks
    detective = new PlaywrightFlakinessDetective(
      mockCoreDetective,
      mockAdapter,
      mockEmbeddingProvider
    );
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(detective).toBeInstanceOf(PlaywrightFlakinessDetective);
    });
  });

  describe('processResults', () => {
    it('should process Playwright test results and run detection', async () => {
      const mockResults = [
        {
          testId: 'test-1',
          title: 'Test 1',
          status: 'failed',
          error: { message: 'Test error' }
        }
      ];

      await detective.processResults(mockResults);

      expect(mockAdapter.processPlaywrightResults).toHaveBeenCalledWith(mockResults);
      expect(mockCoreDetective.detect).toHaveBeenCalled();
    });
  });

  describe('detect', () => {
    it('should delegate to the core detective detect method', async () => {
      await detective.detect();
      expect(mockCoreDetective.detect).toHaveBeenCalled();
    });
  });

  describe('getClusters', () => {
    it('should delegate to the core detective getClusters method', async () => {
      await detective.getClusters();
      expect(mockCoreDetective.getClusters).toHaveBeenCalled();
    });

    it('should pass the limit parameter to getClusters', async () => {
      await detective.getClusters(5);
      expect(mockCoreDetective.getClusters).toHaveBeenCalledWith(5);
    });
  });
});

describe('createPlaywrightFlakinessDetective', () => {
  let mockBaseEmbeddingProvider: EmbeddingProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockBaseEmbeddingProvider = {
      embedContent: vi.fn().mockResolvedValue([]),
      embedBatch: vi.fn().mockResolvedValue([])
    };
  });

  it('should create a detective with default configuration', () => {
    const detective = createPlaywrightFlakinessDetective(mockBaseEmbeddingProvider);
    
    expect(detective).toBeInstanceOf(PlaywrightFlakinessDetective);
    expect(PlaywrightAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        dataDir: PLAYWRIGHT_DEFAULTS.storage.dataDir
      })
    );
    expect(PlaywrightEmbeddingProvider).toHaveBeenCalledWith(
      mockBaseEmbeddingProvider,
      expect.objectContaining(PLAYWRIGHT_DEFAULTS.embedding)
    );
    expect(createFlakinessDetective).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        clustering: expect.objectContaining({
          epsilon: PLAYWRIGHT_DEFAULTS.clustering?.epsilon
        }),
        timeWindow: expect.objectContaining({
          days: PLAYWRIGHT_DEFAULTS.timeWindow?.days
        })
      })
    );
  });

  it('should override default configuration with provided values', () => {
    const customConfig = {
      storage: {
        dataDir: './custom-data-dir',
        failuresFile: 'custom-failures.json'
      },
      embedding: {
        selectors: { weight: 3.0 }
      },
      clustering: {
        epsilon: 0.5,
        minPoints: 3
      },
      timeWindow: {
        days: 14
      }
    };
    
    const detective = createPlaywrightFlakinessDetective(mockBaseEmbeddingProvider, customConfig);
    
    expect(detective).toBeInstanceOf(PlaywrightFlakinessDetective);
    expect(PlaywrightAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        dataDir: './custom-data-dir',
        failuresFile: 'custom-failures.json'
      })
    );
    expect(PlaywrightEmbeddingProvider).toHaveBeenCalledWith(
      mockBaseEmbeddingProvider,
      expect.objectContaining({
        selectors: { weight: 3.0 }
      })
    );
    expect(createFlakinessDetective).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        clustering: expect.objectContaining({
          epsilon: 0.5,
          minPoints: 3
        }),
        timeWindow: expect.objectContaining({
          days: 14
        })
      })
    );
  });

  it('should handle partial configuration overrides', () => {
    const partialConfig = {
      storage: {
        dataDir: './custom-data-dir'
      },
      clustering: {
        epsilon: 0.5
      }
    };
    
    const detective = createPlaywrightFlakinessDetective(mockBaseEmbeddingProvider, partialConfig);
    
    // Storage should be merged with defaults but use our custom dataDir
    expect(PlaywrightAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        dataDir: './custom-data-dir',
        failuresFile: PLAYWRIGHT_DEFAULTS.storage.failuresFile
      })
    );
    
    // Clustering config should merge with defaults
    expect(createFlakinessDetective).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        clustering: expect.objectContaining({
          epsilon: 0.5,
          minPoints: PLAYWRIGHT_DEFAULTS.clustering?.minPoints
        })
      })
    );
  });
});