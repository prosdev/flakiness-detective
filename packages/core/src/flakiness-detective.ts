import { DataAdapter, EmbeddingProvider, TestFailure, EmbeddedFailure, FailureCluster, FlakinessDetectiveConfig, ClusteringOptions } from './types';
import { DataAdapterConfig } from './types/data-adapter';
import { EmbeddingConfig, createRichEmbeddingContext } from './embedding/embedding-provider';
import { extractPatterns } from './analysis/pattern-detection';
import { clusterFailures, DEFAULT_CLUSTERING_OPTIONS } from './clustering/dbscan';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: FlakinessDetectiveConfig = {
  clustering: DEFAULT_CLUSTERING_OPTIONS,
  timeWindow: {
    days: 7
  }
};

/**
 * Main class for flakiness detection
 */
export class FlakinessDetective {
  private dataAdapter: DataAdapter;
  private embeddingProvider: EmbeddingProvider;
  private config: FlakinessDetectiveConfig;
  
  /**
   * Create a new FlakinessDetective instance
   * 
   * @param dataAdapter Adapter for data storage and retrieval
   * @param embeddingProvider Provider for generating embeddings
   * @param config Configuration options
   */
  constructor(
    dataAdapter: DataAdapter,
    embeddingProvider: EmbeddingProvider,
    config: Partial<FlakinessDetectiveConfig> = {}
  ) {
    this.dataAdapter = dataAdapter;
    this.embeddingProvider = embeddingProvider;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      clustering: {
        ...DEFAULT_CONFIG.clustering,
        ...config.clustering
      },
      timeWindow: {
        ...DEFAULT_CONFIG.timeWindow,
        ...config.timeWindow
      }
    };
  }
  
  /**
   * Run the flakiness detection process
   * 
   * @returns Array of identified failure clusters
   */
  async detect(): Promise<FailureCluster[]> {
    // 1. Fetch failures from the specified time window
    const failures = await this.dataAdapter.fetchFailures(
      this.config.timeWindow.days
    );
    
    if (failures.length === 0) {
      console.log('No failures found in the specified time window.');
      return [];
    }
    
    // 2. Extract patterns from failures
    const enhancedFailures = failures.map(extractPatterns);
    
    // 3. Generate embeddings for failures
    const embeddedFailures = await this.embedFailures(enhancedFailures);
    
    // 4. Cluster failures based on embeddings
    const clusters = clusterFailures(
      embeddedFailures,
      this.config.clustering
    );
    
    // 5. Save clusters to storage
    await this.dataAdapter.saveClusters(clusters);
    
    return clusters;
  }
  
  /**
   * Generate embeddings for failures
   * 
   * @param failures Array of test failures
   * @returns Array of failures with embeddings
   */
  private async embedFailures(failures: TestFailure[]): Promise<EmbeddedFailure[]> {
    // Generate rich context for each failure
    const contexts = failures.map(failure => 
      createRichEmbeddingContext(
        failure.testTitle,
        failure.errorMessage,
        failure.metadata
      )
    );
    
    // Generate embeddings in batch
    const embeddings = await this.embeddingProvider.embedBatch(contexts);
    
    // Combine failures with embeddings
    return failures.map((failure, index) => ({
      ...failure,
      vector: embeddings[index]
    }));
  }
  
  /**
   * Fetch previously identified clusters
   * 
   * @param limit Maximum number of clusters to fetch
   * @returns Array of failure clusters
   */
  async getClusters(limit?: number): Promise<FailureCluster[]> {
    return this.dataAdapter.fetchClusters(limit);
  }
}

/**
 * Factory function to create a new FlakinessDetective instance
 * 
 * @param dataAdapter Adapter for data storage and retrieval
 * @param embeddingProvider Provider for generating embeddings
 * @param config Configuration options
 * @returns FlakinessDetective instance
 */
export function createFlakinessDetective(
  dataAdapter: DataAdapter,
  embeddingProvider: EmbeddingProvider,
  config?: Partial<FlakinessDetectiveConfig>
): FlakinessDetective {
  return new FlakinessDetective(dataAdapter, embeddingProvider, config);
}