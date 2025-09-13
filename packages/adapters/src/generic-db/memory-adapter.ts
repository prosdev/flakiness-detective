import { DataAdapter, TestFailure, FailureCluster } from '@flakiness-detective/core/src/types';

/**
 * In-memory implementation of DataAdapter for testing
 */
export class InMemoryAdapter implements DataAdapter {
  private failures: TestFailure[] = [];
  private clusters: FailureCluster[] = [];
  
  /**
   * Fetch test failures within a given time window
   * 
   * @param days Number of days to look back
   * @returns Array of test failures
   */
  async fetchFailures(days: number): Promise<TestFailure[]> {
    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTime = cutoff.getTime();
    
    // Filter failures by date
    return this.failures.filter(failure => {
      const failureDate = new Date(failure.timestamp);
      return failureDate.getTime() >= cutoffTime;
    });
  }
  
  /**
   * Save identified failure clusters
   * 
   * @param clusters Array of failure clusters to save
   */
  async saveClusters(clusters: FailureCluster[]): Promise<void> {
    // Create a map of existing clusters
    const clusterMap = new Map<string, FailureCluster>();
    
    // Add existing clusters to map
    this.clusters.forEach(cluster => {
      clusterMap.set(cluster.id, cluster);
    });
    
    // Add or replace with new clusters
    clusters.forEach(cluster => {
      clusterMap.set(cluster.id, cluster);
    });
    
    // Update clusters array
    this.clusters = Array.from(clusterMap.values());
  }
  
  /**
   * Fetch previously identified failure clusters
   * 
   * @param limit Maximum number of clusters to fetch
   * @returns Array of failure clusters
   */
  async fetchClusters(limit?: number): Promise<FailureCluster[]> {
    // Sort by count (descending) and apply limit if specified
    const sortedClusters = [...this.clusters].sort((a, b) => b.count - a.count);
    return limit ? sortedClusters.slice(0, limit) : sortedClusters;
  }
  
  /**
   * Add test failures to the in-memory store
   * 
   * @param failures Array of test failures to add
   */
  async addFailures(failures: TestFailure[]): Promise<void> {
    // Create a map of existing failures
    const failureMap = new Map<string, TestFailure>();
    
    // Add existing failures to map
    this.failures.forEach(failure => {
      failureMap.set(failure.id, failure);
    });
    
    // Add or replace with new failures
    failures.forEach(failure => {
      failureMap.set(failure.id, failure);
    });
    
    // Update failures array
    this.failures = Array.from(failureMap.values());
  }
  
  /**
   * Clear all data from the adapter
   */
  async clear(): Promise<void> {
    this.failures = [];
    this.clusters = [];
  }
}