import fs from 'fs/promises';
import path from 'path';
import { TestFailure, FailureCluster, DataAdapter, DataAdapterConfig } from '@flakiness-detective/core';

/**
 * File system specific configuration options
 */
export interface FileSystemAdapterConfig extends DataAdapterConfig {
  /** Base directory to store data files */
  dataDir: string;
  /** File name for failures */
  failuresFile?: string;
  /** File name for clusters */
  clustersFile?: string;
}

/**
 * Implementation of DataAdapter that uses the file system
 */
export class FileSystemAdapter implements DataAdapter {
  private dataDir: string;
  private failuresFile: string;
  private clustersFile: string;
  
  /**
   * Create a new file system adapter
   * 
   * @param config Configuration options
   */
  constructor(config: FileSystemAdapterConfig) {
    this.dataDir = config.dataDir;
    this.failuresFile = config.failuresFile || 'failures.json';
    this.clustersFile = config.clustersFile || 'clusters.json';
  }
  
  /**
   * Initialize the adapter by ensuring directories exist
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }
  
  /**
   * Fetch test failures within a given time window
   * 
   * @param days Number of days to look back
   * @returns Array of test failures
   */
  async fetchFailures(days: number): Promise<TestFailure[]> {
    try {
      const filePath = path.join(this.dataDir, this.failuresFile);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, return empty array
        return [];
      }
      
      // Read and parse failures
      const data = await fs.readFile(filePath, 'utf-8');
      const allFailures: TestFailure[] = JSON.parse(data);
      
      // Calculate cutoff date
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffTime = cutoff.getTime();
      
      // Filter failures by date
      return allFailures.filter(failure => {
        const failureDate = new Date(failure.timestamp);
        return failureDate.getTime() >= cutoffTime;
      });
    } catch (error) {
      throw new Error(`Failed to fetch failures: ${error}`);
    }
  }
  
  /**
   * Save identified failure clusters
   * 
   * @param clusters Array of failure clusters to save
   */
  async saveClusters(clusters: FailureCluster[]): Promise<void> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.dataDir, this.clustersFile);
      
      // Check if file exists and read existing clusters
      let existingClusters: FailureCluster[] = [];
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        existingClusters = JSON.parse(data);
      } catch {
        // File doesn't exist or is invalid, start with empty array
      }
      
      // Merge new clusters with existing ones, replacing any with the same ID
      const clusterMap = new Map<string, FailureCluster>();
      
      // Add existing clusters to map
      existingClusters.forEach(cluster => {
        clusterMap.set(cluster.id, cluster);
      });
      
      // Add or replace with new clusters
      clusters.forEach(cluster => {
        clusterMap.set(cluster.id, cluster);
      });
      
      // Convert map back to array
      const mergedClusters = Array.from(clusterMap.values());
      
      // Write merged clusters to file
      await fs.writeFile(filePath, JSON.stringify(mergedClusters, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save clusters: ${error}`);
    }
  }
  
  /**
   * Fetch previously identified failure clusters
   * 
   * @param limit Maximum number of clusters to fetch
   * @returns Array of failure clusters
   */
  async fetchClusters(limit?: number): Promise<FailureCluster[]> {
    try {
      const filePath = path.join(this.dataDir, this.clustersFile);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, return empty array
        return [];
      }
      
      // Read and parse clusters
      const data = await fs.readFile(filePath, 'utf-8');
      const clusters: FailureCluster[] = JSON.parse(data);
      
      // Sort by count (descending) and apply limit if specified
      const sortedClusters = clusters.sort((a, b) => b.count - a.count);
      return limit ? sortedClusters.slice(0, limit) : sortedClusters;
    } catch (error) {
      throw new Error(`Failed to fetch clusters: ${error}`);
    }
  }
  
  /**
   * Save test failures to the file system
   * 
   * @param failures Array of test failures to save
   */
  async saveFailures(failures: TestFailure[]): Promise<void> {
    try {
      await this.initialize();
      
      const filePath = path.join(this.dataDir, this.failuresFile);
      
      // Check if file exists and read existing failures
      let existingFailures: TestFailure[] = [];
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        existingFailures = JSON.parse(data);
      } catch {
        // File doesn't exist or is invalid, start with empty array
      }
      
      // Merge new failures with existing ones, replacing any with the same ID
      const failureMap = new Map<string, TestFailure>();
      
      // Add existing failures to map
      existingFailures.forEach(failure => {
        failureMap.set(failure.id, failure);
      });
      
      // Add or replace with new failures
      failures.forEach(failure => {
        failureMap.set(failure.id, failure);
      });
      
      // Convert map back to array
      const mergedFailures = Array.from(failureMap.values());
      
      // Write merged failures to file
      await fs.writeFile(filePath, JSON.stringify(mergedFailures, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save failures: ${error}`);
    }
  }
}