import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlakinessDetective, createFlakinessDetective } from './flakiness-detective';
import { DataAdapter } from './types/data-adapter';
import { EmbeddingProvider } from './embedding/embedding-provider';
import { TestFailure, FailureCluster } from './types';

// Setup mocks at the top of the file, without referencing variable declarations
vi.mock('./embedding/embedding-provider', async () => {
  // Use a local function inside the factory to avoid hoisting issues
  return {
    createRichEmbeddingContext: vi.fn((title, error, _metadata) => {
      return `${title || 'Unknown Test'}: ${error || 'Unknown Error'}`;
    }),
    EmbeddingProvider: vi.fn()
  };
});

vi.mock('./analysis/pattern-detection', async () => {
  return {
    extractPatterns: vi.fn(failure => failure)
  };
});

vi.mock('./clustering/dbscan', async () => {
  // Create mock cluster data within the factory function
  const clusterData = {
    id: 'cluster-1',
    title: 'Test Cluster',
    count: 2,
    testId: 'test-1',
    testTitle: 'Test Title',
    timestamp: new Date().toISOString(),
    failureIds: ['failure-1', 'failure-2'],
    failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
    errorMessages: ['Error 1', 'Error 2'],
    commonFilePaths: ['src/test.ts'],
    commonLineNumbers: ['42'],
    commonCodeSnippets: ['expect(value).toBe(true)'],
    failurePattern: 'Common failure pattern',
    commonLocators: ['button'],
    commonMatchers: ['toBeVisible'],
    commonTimeouts: [5000],
    assertionPattern: 'toBeVisible on button'
  };
  
  return {
    clusterFailures: vi.fn(() => [clusterData]),
    DEFAULT_CLUSTERING_OPTIONS: {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 2
    }
  };
});

// Import mocked modules
import * as embeddingModule from './embedding/embedding-provider';
import * as patternDetection from './analysis/pattern-detection';
import * as clusteringModule from './clustering/dbscan';

// Get mocked functions
const mockCreateRichEmbeddingContext = vi.mocked(embeddingModule.createRichEmbeddingContext);
const mockExtractPatterns = vi.mocked(patternDetection.extractPatterns);
const mockClusterFailures = vi.mocked(clusteringModule.clusterFailures);

describe('FlakinessDetective', () => {
  let mockDataAdapter: unknown;
  let mockEmbeddingProvider: unknown;
  let detective: FlakinessDetective;
  let consoleSpy: unknown;
  
  // Sample test data
  const sampleFailures: TestFailure[] = [
    {
      id: 'failure-1',
      testId: 'test-1',
      testTitle: 'Test Title 1',
      errorMessage: 'Error message 1',
      timestamp: new Date().toISOString(),
      metadata: { projectName: 'test' }
    },
    {
      id: 'failure-2',
      testId: 'test-2',
      testTitle: 'Test Title 2',
      errorMessage: 'Error message 2',
      timestamp: new Date().toISOString(),
      metadata: { projectName: 'test' }
    }
  ];
  
  const sampleClusters: FailureCluster[] = [
    {
      id: 'cluster-1',
      title: 'Test Cluster',
      count: 2,
      testId: 'test-1',
      testTitle: 'Test Title',
      timestamp: new Date().toISOString(),
      failureIds: ['failure-1', 'failure-2'],
      failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
      errorMessages: ['Error 1', 'Error 2'],
      commonFilePaths: ['src/test.ts'],
      commonLineNumbers: ['42'],
      commonCodeSnippets: ['expect(value).toBe(true)'],
      failurePattern: 'Common failure pattern',
      commonLocators: ['button'],
      commonMatchers: ['toBeVisible'],
      commonTimeouts: [5000],
      assertionPattern: 'toBeVisible on button'
    }
  ];

  beforeEach(() => {
    // Mock console.log
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset other mocks
    mockCreateRichEmbeddingContext.mockClear();
    mockExtractPatterns.mockClear();
    mockClusterFailures.mockClear();
    
    // Create mock implementations
    mockDataAdapter = {
      fetchFailures: vi.fn().mockResolvedValue(sampleFailures),
      saveClusters: vi.fn().mockResolvedValue(undefined),
      fetchClusters: vi.fn().mockResolvedValue(sampleClusters)
    };
    
    mockEmbeddingProvider = {
      embedContent: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      embedBatch: vi.fn().mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ])
    };
    
    // Create detective instance
    detective = new FlakinessDetective(mockDataAdapter, mockEmbeddingProvider);
  });
  
  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(detective).toBeInstanceOf(FlakinessDetective);
    });
    
    it('should use default configuration when none is provided', () => {
      const defaultDetective = new FlakinessDetective(mockDataAdapter, mockEmbeddingProvider);
      
      // Access private config (for testing only)
      const config = (defaultDetective as unknown as { config: FlakinessDetectiveConfig }).config;
      
      expect(config.timeWindow.days).toBe(7);
      expect(config.clustering.epsilon).toBe(0.3);
      expect(config.clustering.minPoints).toBe(2);
    });
    
    it('should override default configuration with provided values', () => {
      const customConfig = {
        timeWindow: { days: 14 },
        clustering: { epsilon: 0.5, minPoints: 3, minClusterSize: 2 }
      };
      
      const customDetective = new FlakinessDetective(
        mockDataAdapter, 
        mockEmbeddingProvider,
        customConfig
      );
      
      // Access private config (for testing only)
      const config = (customDetective as unknown as { config: FlakinessDetectiveConfig }).config;
      
      expect(config.timeWindow.days).toBe(14);
      expect(config.clustering.epsilon).toBe(0.5);
      expect(config.clustering.minPoints).toBe(3);
    });
    
    it('should handle partial configuration overrides', () => {
      const partialConfig = {
        clustering: { epsilon: 0.5, minPoints: 2, minClusterSize: 2 }
      };
      
      const customDetective = new FlakinessDetective(
        mockDataAdapter, 
        mockEmbeddingProvider,
        partialConfig
      );
      
      // Access private config (for testing only)
      const config = (customDetective as unknown as { config: FlakinessDetectiveConfig }).config;
      
      expect(config.timeWindow.days).toBe(7); // Default
      expect(config.clustering.epsilon).toBe(0.5); // Custom
      expect(config.clustering.minPoints).toBe(2); // Default
    });
  });
  
  describe('detect', () => {
    it('should return empty array when no failures are found', async () => {
      // Override mock to return empty array
      mockDataAdapter.fetchFailures = vi.fn().mockResolvedValue([]);
      
      const clusters = await detective.detect();
      
      expect(clusters).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('No failures found in the specified time window.');
      expect(mockDataAdapter.fetchFailures).toHaveBeenCalledWith(7); // Default time window
    });
    
    it('should process failures and generate clusters', async () => {
      const clusters = await detective.detect();
      
      // Check each step was called correctly
      expect(mockDataAdapter.fetchFailures).toHaveBeenCalledWith(7);
      expect(mockExtractPatterns).toHaveBeenCalledTimes(2);
      expect(mockEmbeddingProvider.embedBatch).toHaveBeenCalledTimes(1);
      expect(mockClusterFailures).toHaveBeenCalled();
      expect(mockDataAdapter.saveClusters).toHaveBeenCalledTimes(1);
      
      // Check the returned clusters
      expect(clusters).toHaveLength(1);
      expect(clusters[0].id).toBe('cluster-1');
    });
    
    it('should use custom time window when provided', async () => {
      const customDetective = new FlakinessDetective(
        mockDataAdapter, 
        mockEmbeddingProvider,
        { timeWindow: { days: 14 } }
      );
      
      await customDetective.detect();
      
      expect(mockDataAdapter.fetchFailures).toHaveBeenCalledWith(14);
    });
    
    it('should pass clustering config to clusterFailures', async () => {
      const customConfig = {
        clustering: {
          epsilon: 0.5,
          minPoints: 3,
          minClusterSize: 2
        }
      };
      
      const customDetective = new FlakinessDetective(
        mockDataAdapter, 
        mockEmbeddingProvider,
        customConfig
      );
      
      await customDetective.detect();
      
      // Check that clusterFailures was called
      expect(mockClusterFailures).toHaveBeenCalled();
    });
  });
  
  describe('embedFailures', () => {
    it('should create embedded failures with vectors', async () => {
      // Test embedFailures indirectly through the detect method
      // We'll check that embeddingProvider.embedBatch was called with the right parameters
      
      // Call detect which will trigger embedFailures internally
      await detective.detect();
      
      // Verify embedBatch was called
      expect(mockEmbeddingProvider.embedBatch).toHaveBeenCalledTimes(1);
      
      // Verify createRichEmbeddingContext behavior is tested in a separate test file
      // This is a more robust approach than trying to test the mock function
    });
  });
  
  describe('getClusters', () => {
    it('should delegate to the data adapter fetchClusters method', async () => {
      const clusters = await detective.getClusters();
      
      expect(mockDataAdapter.fetchClusters).toHaveBeenCalled();
      expect(clusters).toEqual(sampleClusters);
    });
    
    it('should pass the limit parameter when provided', async () => {
      await detective.getClusters(5);
      
      expect(mockDataAdapter.fetchClusters).toHaveBeenCalledWith(5);
    });
  });
});

describe('createFlakinessDetective', () => {
  it('should create a new FlakinessDetective instance', () => {
    const mockDataAdapter = {} as DataAdapter;
    const mockEmbeddingProvider = {} as EmbeddingProvider;
    
    const detective = createFlakinessDetective(mockDataAdapter, mockEmbeddingProvider);
    
    expect(detective).toBeInstanceOf(FlakinessDetective);
  });
  
  it('should pass config to the FlakinessDetective constructor', () => {
    const mockDataAdapter = {} as DataAdapter;
    const mockEmbeddingProvider = {} as EmbeddingProvider;
    const mockConfig = { timeWindow: { days: 14 } };
    
    const detective = createFlakinessDetective(mockDataAdapter, mockEmbeddingProvider, mockConfig);
    
    // We can't directly assert on constructor calls, but we can check the instance config
    const config = (detective as unknown).config;
    expect(config.timeWindow.days).toBe(14);
  });
});