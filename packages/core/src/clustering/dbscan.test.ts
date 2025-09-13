import { describe, it, expect } from 'vitest';
import { clusterFailures } from './dbscan';
import { EmbeddedFailure } from '../types';

describe('DBSCAN Clustering', () => {
  it('should cluster similar failures', () => {
    // Create test failures with similar vectors
    const failures: EmbeddedFailure[] = [
      // Cluster 1 - similar vector [1, 0, 0]
      createTestFailure('1', [1, 0, 0]),
      createTestFailure('2', [1.1, 0, 0]),
      createTestFailure('3', [0.9, 0.1, 0]),
      
      // Cluster 2 - similar vector [0, 1, 0]
      createTestFailure('4', [0, 1, 0]),
      createTestFailure('5', [0, 1.1, 0]),
      createTestFailure('6', [0.1, 0.9, 0]),
      
      // Outliers
      createTestFailure('7', [0, 0, 1]),
      createTestFailure('8', [0.5, 0.5, 0.5]),
    ];
    
    const clusters = clusterFailures(failures, {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 3,
    });
    
    // Should find 2 clusters
    expect(clusters).toHaveLength(2);
    
    // First cluster should have 3 failures
    expect(clusters[0].count).toBe(3);
    
    // Second cluster should have 3 failures
    expect(clusters[1].count).toBe(3);
  });
  
  it('should return empty array for empty input', () => {
    const clusters = clusterFailures([]);
    expect(clusters).toHaveLength(0);
  });
  
  it('should filter out clusters smaller than minClusterSize', () => {
    const failures: EmbeddedFailure[] = [
      // Cluster 1 - 3 items
      createTestFailure('1', [1, 0, 0]),
      createTestFailure('2', [1.1, 0, 0]),
      createTestFailure('3', [0.9, 0.1, 0]),
      
      // Cluster 2 - only 2 items (below minClusterSize of 3)
      createTestFailure('4', [0, 1, 0]),
      createTestFailure('5', [0, 1.1, 0]),
    ];
    
    const clusters = clusterFailures(failures, {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 3,
    });
    
    // Should find only 1 cluster (the one with 3 items)
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(3);
  });
});

function createTestFailure(id: string, vector: number[]): EmbeddedFailure {
  return {
    id,
    testId: `test-${id}`,
    testTitle: `Test ${id}`,
    errorMessage: `Error in test ${id}`,
    timestamp: new Date().toISOString(),
    metadata: {},
    vector,
  };
}