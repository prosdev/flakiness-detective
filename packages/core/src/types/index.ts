/**
 * Core types for the flakiness detective
 */

/**
 * Represents a test failure with all available context
 */
export interface TestFailure {
  id: string;
  testId: string;
  testTitle: string;
  errorMessage: string;
  timestamp: string;
  metadata: TestFailureMetadata;
}

/**
 * Metadata extracted from a test failure
 */
export interface TestFailureMetadata {
  [key: string]: unknown;

  // Error context
  errorSnippets?: string[];
  lineNumber?: string;
  filePath?: string;
  // Test details
  projectName?: string;
  suite?: string;
  // Framework-specific details (like Playwright)
  actualValue?: string;
  expectedValue?: string;
  locator?: string;
  matcher?: string;
  timeoutMs?: number;
}

/**
 * A test failure with its vector embedding
 */
export interface EmbeddedFailure extends TestFailure {
  vector: number[];
}

/**
 * A cluster of similar test failures
 */
export interface FailureCluster {
  id: string;
  title: string;
  count: number;
  testId: string;
  testTitle: string;
  timestamp: string;
  
  // Pattern analysis
  commonFilePaths: string[];
  commonLineNumbers: string[];
  commonCodeSnippets: string[];
  failurePattern: string;
  
  // Framework-specific patterns
  commonLocators: string[];
  commonMatchers: string[];
  commonTimeouts: number[];
  assertionPattern: string;
  
  // Failures in this cluster
  failureIds: string[];
  failureTimestamps: string[];
  errorMessages: string[];
}

/**
 * Configuration options for clustering
 */
export interface ClusteringOptions {
  epsilon: number;  // Neighborhood radius for DBSCAN
  minPoints: number; // Minimum points to form a cluster
  minClusterSize: number; // Minimum size of a valid cluster
}

/**
 * Configuration for the flakiness detective
 */
export interface FlakinessDetectiveConfig {
  clustering: ClusteringOptions;
  timeWindow: {
    days: number;
  };
}