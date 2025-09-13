import * as clustering from 'density-clustering';
import { EmbeddedFailure, FailureCluster, ClusteringOptions } from '../types';

/**
 * Default clustering options
 */
export const DEFAULT_CLUSTERING_OPTIONS: ClusteringOptions = {
  epsilon: 0.3,       // Neighborhood radius
  minPoints: 2,       // Minimum points to form a cluster
  minClusterSize: 3,  // Minimum size of a valid cluster
};

/**
 * Clusters embedded failures using DBSCAN algorithm
 * 
 * @param embeddedFailures Array of failures with embedding vectors
 * @param options Clustering options
 * @returns Array of failure clusters
 */
export function clusterFailures(
  embeddedFailures: EmbeddedFailure[],
  options: ClusteringOptions = DEFAULT_CLUSTERING_OPTIONS
): FailureCluster[] {
  if (embeddedFailures.length === 0) {
    return [];
  }

  const vectors = embeddedFailures.map(e => e.vector);
  
  // Use DBSCAN clustering
  const dbscan = new clustering.DBSCAN();
  const clusterIndices = dbscan.run(
    vectors, 
    options.epsilon, 
    options.minPoints
  );

  // Group entries by cluster
  const timestampStr = new Date().toISOString();
  
  // Build cluster results with context
  const clusterResults = clusterIndices
    .map((clusterIndices: number[], clusterId: number) => {
      // Skip clusters that are too small
      if (clusterIndices.length < options.minClusterSize) {
        return null;
      }

      const failures = clusterIndices.map(idx => embeddedFailures[idx]);
      const first = failures[0];
      const count = failures.length;
      
      // Use the first failure's test info for the cluster title
      const title = `${first.testTitle || 'Unknown Test'}`;

      // Collect failure details for analysis
      const failureIds = failures.map(f => f.id);
      const failureTimestamps = failures.map(
        f => f.timestamp || new Date().toISOString()
      );
      const errorMessages = failures.map(f => f.errorMessage.substring(0, 200)); // Truncate long messages

      // Analyze common patterns in the cluster
      const filePaths = failures
        .map(f => f.metadata.filePath)
        .filter(Boolean) as string[];
      
      const lineNumbers = failures
        .map(f => f.metadata.lineNumber)
        .filter(Boolean) as string[];
      
      const allSnippets = failures.flatMap(f => f.metadata.errorSnippets || []);

      // Framework-specific patterns
      const locators = failures
        .map(f => f.metadata.locator)
        .filter(Boolean) as string[];
      
      const matchers = failures
        .map(f => f.metadata.matcher)
        .filter(Boolean) as string[];
      
      const timeouts = failures
        .map(f => f.metadata.timeoutMs)
        .filter((timeout): timeout is number => 
          timeout !== undefined && timeout > 0
        );

      // Find most common patterns (appearing in at least 50% of cluster)
      const commonFilePaths = findCommonElements(filePaths, failures.length * 0.5);
      const commonLineNumbers = findCommonElements(lineNumbers, failures.length * 0.5);
      const commonCodeSnippets = findCommonElements(allSnippets, failures.length * 0.5);
      const commonLocators = findCommonElements(locators, failures.length * 0.5);
      const commonMatchers = findCommonElements(matchers, failures.length * 0.5);
      const commonTimeouts = findCommonElements(timeouts, failures.length * 0.5);

      // Determine failure pattern
      let failurePattern = '';
      let assertionPattern = '';

      if (commonFilePaths.length > 0 && commonLineNumbers.length > 0) {
        failurePattern = `Common failure at ${commonFilePaths[0]}:${commonLineNumbers[0]}`;
      } else if (commonCodeSnippets.length > 0) {
        failurePattern = `Common code pattern: ${commonCodeSnippets[0].substring(0, 100)}...`;
      } else {
        failurePattern = 'Similar test failures';
      }

      // Determine assertion pattern
      if (commonLocators.length > 0 && commonMatchers.length > 0) {
        assertionPattern = `${commonMatchers[0]} on ${commonLocators[0]}`;
        if (commonTimeouts.length > 0) {
          assertionPattern += ` (${commonTimeouts[0]}ms timeout)`;
        }
      } else if (commonLocators.length > 0) {
        assertionPattern = `Common locator: ${commonLocators[0]}`;
      } else if (commonMatchers.length > 0) {
        assertionPattern = `Common matcher: ${commonMatchers[0]}`;
      }

      return {
        id: `cluster-${clusterId}-${Date.now()}`,
        title,
        count,
        testId: first.testId || '',
        testTitle: first.testTitle || 'Unknown Test',
        timestamp: timestampStr,
        commonFilePaths,
        commonLineNumbers,
        commonCodeSnippets,
        failurePattern,
        commonLocators,
        commonMatchers,
        commonTimeouts,
        assertionPattern,
        failureIds,
        failureTimestamps,
        errorMessages,
      };
    })
    .filter((cluster) => cluster !== null)
    .sort((a, b) => (b?.count || 0) - (a?.count || 0)) as FailureCluster[];

  return clusterResults;
}

/**
 * Find common elements that appear in at least the specified threshold count
 * 
 * @param elements Array of elements to analyze
 * @param thresholdCount Minimum number of occurrences required
 * @returns Array of common elements
 */
function findCommonElements<T>(elements: T[], thresholdCount: number): T[] {
  const counts: Record<string, { count: number, value: T }> = {};
  
  // Count occurrences
  elements.forEach(element => {
    const key = String(element);
    if (!counts[key]) {
      counts[key] = { count: 0, value: element };
    }
    counts[key].count++;
  });
  
  // Filter elements that appear frequently enough
  return Object.values(counts)
    .filter(({ count }) => count >= thresholdCount)
    .map(({ value }) => value);
}