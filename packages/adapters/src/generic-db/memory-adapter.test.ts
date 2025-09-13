import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAdapter } from './memory-adapter';
import type { TestFailure, FailureCluster } from '@flakiness-detective/core';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;
  
  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });
  
  it('should add and fetch failures', async () => {
    // Create test failures
    const failures: TestFailure[] = [
      createTestFailure('1', '2023-01-01T00:00:00Z'),
      createTestFailure('2', '2023-01-02T00:00:00Z'),
      createTestFailure('3', '2023-01-03T00:00:00Z'),
    ];
    
    // Add failures
    await adapter.addFailures(failures);
    
    // Fetch failures with 7-day window (should get all)
    const fetchedFailures = await adapter.fetchFailures(7);
    expect(fetchedFailures).toHaveLength(3);
    
    // Check specific failure
    expect(fetchedFailures[0].id).toBe('1');
  });
  
  it('should filter failures by date', async () => {
    // Create test failures with different dates
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);
    
    const failures: TestFailure[] = [
      createTestFailure('1', now.toISOString()),
      createTestFailure('2', threeDaysAgo.toISOString()),
      createTestFailure('3', tenDaysAgo.toISOString()),
    ];
    
    // Add failures
    await adapter.addFailures(failures);
    
    // Fetch failures with 5-day window (should get 2)
    const fetchedFailures = await adapter.fetchFailures(5);
    expect(fetchedFailures).toHaveLength(2);
    
    // IDs should be 1 and 2 (the most recent ones)
    expect(fetchedFailures.map(f => f.id).sort()).toEqual(['1', '2']);
  });
  
  it('should save and fetch clusters', async () => {
    // Create test clusters
    const clusters: FailureCluster[] = [
      createTestCluster('cluster-1', 3),
      createTestCluster('cluster-2', 5),
    ];
    
    // Save clusters
    await adapter.saveClusters(clusters);
    
    // Fetch clusters
    const fetchedClusters = await adapter.fetchClusters();
    expect(fetchedClusters).toHaveLength(2);
    
    // Check ordering (by count, descending)
    expect(fetchedClusters[0].id).toBe('cluster-2');
    expect(fetchedClusters[1].id).toBe('cluster-1');
  });
  
  it('should clear all data', async () => {
    // Add some data
    await adapter.addFailures([createTestFailure('1', '2023-01-01T00:00:00Z')]);
    await adapter.saveClusters([createTestCluster('cluster-1', 3)]);
    
    // Verify data exists
    expect(await adapter.fetchFailures(7)).toHaveLength(1);
    expect(await adapter.fetchClusters()).toHaveLength(1);
    
    // Clear data
    await adapter.clear();
    
    // Verify data is gone
    expect(await adapter.fetchFailures(7)).toHaveLength(0);
    expect(await adapter.fetchClusters()).toHaveLength(0);
  });
});

function createTestFailure(id: string, timestamp: string): TestFailure {
  return {
    id,
    testId: `test-${id}`,
    testTitle: `Test ${id}`,
    errorMessage: `Error in test ${id}`,
    timestamp,
    metadata: {},
  };
}

function createTestCluster(id: string, count: number): FailureCluster {
  return {
    id,
    title: `Cluster ${id}`,
    count,
    testId: `test-${id}`,
    testTitle: `Test ${id}`,
    timestamp: new Date().toISOString(),
    // Added required fields
    commonFilePaths: [],
    commonLineNumbers: [],
    commonCodeSnippets: [],
    failurePattern: `Common pattern for ${id}`,
    commonLocators: [],
    commonMatchers: [],
    commonTimeouts: [],
    assertionPattern: `Assertion pattern for ${id}`,
    // Original fields
    failureIds: Array(count).fill(0).map((_, i) => `failure-${i}`),
    failureTimestamps: Array(count).fill(0).map(() => new Date().toISOString()),
    errorMessages: Array(count).fill(0).map((_, i) => `Error message ${i}`),
  };
}