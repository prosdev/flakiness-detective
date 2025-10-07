import { TestFailure, FailureCluster } from './index';

/**
 * Interface for data storage and retrieval
 */
export interface DataAdapter {
  /**
   * Fetch test failures within a given time window
   * 
   * @param days Number of days to look back
   * @returns Promise resolving to an array of test failures
   */
  fetchFailures(days: number): Promise<TestFailure[]>;
  
  /**
   * Save identified failure clusters
   * 
   * @param clusters Array of failure clusters to save
   * @returns Promise resolving when save is complete
   */
  saveClusters(clusters: FailureCluster[]): Promise<void>;
  
  /**
   * Fetch previously identified failure clusters
   * 
   * @param limit Maximum number of clusters to fetch
   * @returns Promise resolving to an array of failure clusters
   */
  fetchClusters(limit?: number): Promise<FailureCluster[]>;
}

/**
 * Configuration for data adapters
 */
export interface DataAdapterConfig {
  source?: string;
  connectionString?: string;
  path?: string;
  // Additional adapter-specific options
  [key: string]: unknown;
}

/**
 * Factory function type for creating data adapters
 */
export type DataAdapterFactory = (config: DataAdapterConfig) => DataAdapter;