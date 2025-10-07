import { TestFailure, FailureCluster, DataAdapter, DataAdapterConfig } from '@flakiness-detective/core';

/**
 * Firestore adapter configuration
 */
export interface FirestoreAdapterConfig extends DataAdapterConfig {
  /** Firestore project ID */
  projectId: string;
  
  /** Collection name for test failures */
  failuresCollection?: string;
  
  /** Collection name for clusters */
  clustersCollection?: string;
  
  /** Custom Firestore instance (optional) */
  firestoreInstance?: any;
  
  /** Filter for failures by status field (if available) */
  failureStatusFilter?: string;
  
  /** Custom credential path (optional) */
  credentialsPath?: string;
  
  /** 
   * Custom query function for fetching failures
   * This allows users to define their own query logic to match their database structure
   * and avoid requiring specific indexes
   */
  customQueryFn?: (
    db: any, 
    collection: string, 
    days: number
  ) => Promise<any[]>;
}

/**
 * Implementation of DataAdapter using Firestore
 * 
 * Requires firebase-admin as a peer dependency
 */
export class FirestoreAdapter implements DataAdapter {
  private db: any; // Firestore instance
  private failuresCollection: string;
  private clustersCollection: string;
  private failureStatusFilter?: string;
  private customQueryFn?: (db: any, collection: string, days: number) => Promise<any[]>;
  
  /**
   * Create a new Firestore adapter
   * 
   * @param config Configuration options
   */
  constructor(config: FirestoreAdapterConfig) {
    // Use provided Firestore instance or initialize one
    if (config.firestoreInstance) {
      this.db = config.firestoreInstance;
    } else {
      try {
        // Use dynamic import to avoid bundling firebase-admin
        // This allows the library to be used without firebase-admin
        // if using a different adapter
        const admin = require('firebase-admin');
        
        // Initialize with credentials if provided
        if (config.credentialsPath) {
          const serviceAccount = require(config.credentialsPath);
          
          // Check if already initialized
          try {
            this.db = admin.firestore();
          } catch (e) {
            // Initialize with service account
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: config.projectId
            });
            this.db = admin.firestore();
          }
        } else {
          // Use application default credentials
          try {
            this.db = admin.firestore();
          } catch (e) {
            // Initialize with default credentials
            admin.initializeApp({
              projectId: config.projectId
            });
            this.db = admin.firestore();
          }
        }
      } catch (error) {
        throw new Error(
          `Failed to initialize Firestore: ${error}\n` +
          'Make sure firebase-admin is installed: npm install firebase-admin'
        );
      }
    }
    
    // Set collection names
    this.failuresCollection = config.failuresCollection || 'test_failures';
    this.clustersCollection = config.clustersCollection || 'flaky_clusters';
    this.failureStatusFilter = config.failureStatusFilter;
    this.customQueryFn = config.customQueryFn;
  }
  
  /**
   * Fetch test failures within a given time window
   * 
   * @param days Number of days to look back
   * @returns Array of test failures
   */
  async fetchFailures(days: number): Promise<TestFailure[]> {
    try {
      // Process results
      const failures: TestFailure[] = [];
      
      // Use custom query function if provided, otherwise use default query
      if (this.customQueryFn) {
        // Execute custom query function
        const documents = await this.customQueryFn(this.db, this.failuresCollection, days);
        
        // Process results from custom query
        documents.forEach((doc: any) => {
          const data = doc.data ? doc.data() : doc;
          
          // Handle Firestore timestamps
          const timestamp = data.timestamp instanceof Date ? 
            data.timestamp.toISOString() : 
            (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString());
          
          // Map Firestore document to TestFailure
          const failure: TestFailure = this.mapDocumentToFailure(doc.id || data.id, data, timestamp);
          failures.push(failure);
        });
      } else {
        // Default query logic
        // Calculate cutoff date
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        // Build query
        let query = this.db.collection(this.failuresCollection)
          .where('timestamp', '>=', cutoff);
        
        // Add status filter if configured
        if (this.failureStatusFilter) {
          query = query.where('status', '==', this.failureStatusFilter);
        }
        
        // Execute query
        const snapshot = await query.get();
        
        // Process results from default query
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          
          // Handle Firestore timestamps
          const timestamp = data.timestamp instanceof Date ? 
            data.timestamp.toISOString() : 
            (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString());
          
          // Map Firestore document to TestFailure
          const failure: TestFailure = this.mapDocumentToFailure(doc.id, data, timestamp);
          failures.push(failure);
        });
      }
      
      return failures;
    } catch (error) {
      throw new Error(`Failed to fetch failures from Firestore: ${error}`);
    }
  }
  
  /**
   * Save identified failure clusters
   * 
   * @param clusters Array of failure clusters to save
   */
  async saveClusters(clusters: FailureCluster[]): Promise<void> {
    try {
      // Use batched writes for better performance
      const batch = this.db.batch();
      const timestamp = new Date();
      
      // Process each cluster
      clusters.forEach((cluster, index) => {
        // Create a document reference
        const docId = cluster.id || `cluster-${Date.now()}-${index}`;
        const docRef = this.db.collection(this.clustersCollection).doc(docId);
        
        // Prepare data for Firestore (handle Date objects)
        const clusterData = {
          ...cluster,
          // Add additional metadata
          updatedAt: timestamp,
          weekKey: new Date().toISOString().substring(0, 10)
        };
        
        // Add to batch
        batch.set(docRef, clusterData, { merge: true });
      });
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to save clusters to Firestore: ${error}`);
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
      // Build query
      let query = this.db.collection(this.clustersCollection)
        .orderBy('count', 'desc');
      
      // Apply limit if specified
      if (limit && limit > 0) {
        query = query.limit(limit);
      }
      
      // Execute query
      const snapshot = await query.get();
      
      // Process results
      const clusters: FailureCluster[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        
        // Ensure all required fields are present
        const cluster: FailureCluster = {
          id: doc.id,
          title: data.title || 'Unknown Cluster',
          count: data.count || 0,
          testId: data.testId || '',
          testTitle: data.testTitle || 'Unknown Test',
          timestamp: data.timestamp || new Date().toISOString(),
          
          // Pattern analysis
          commonFilePaths: data.commonFilePaths || [],
          commonLineNumbers: data.commonLineNumbers || [],
          commonCodeSnippets: data.commonCodeSnippets || [],
          failurePattern: data.failurePattern || '',
          
          // Framework-specific patterns
          commonLocators: data.commonLocators || [],
          commonMatchers: data.commonMatchers || [],
          commonTimeouts: data.commonTimeouts || [],
          assertionPattern: data.assertionPattern || '',
          
          // Failures in this cluster
          failureIds: data.failureIds || [],
          failureTimestamps: data.failureTimestamps || [],
          errorMessages: data.errorMessages || []
        };
        
        clusters.push(cluster);
      });
      
      return clusters;
    } catch (error) {
      throw new Error(`Failed to fetch clusters from Firestore: ${error}`);
    }
  }
  
  /**
   * Save test failures to Firestore
   * 
   * @param failures Test failures to save
   */
  async saveFailures(failures: TestFailure[]): Promise<void> {
    try {
      // Use batched writes for better performance
      const batch = this.db.batch();
      
      // Process each failure
      failures.forEach(failure => {
        // Create a document reference
        const docId = failure.id || `failure-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const docRef = this.db.collection(this.failuresCollection).doc(docId);
        
        // Prepare data for Firestore
        const failureData = {
          ...failure,
          // Ensure timestamp is a Firestore timestamp
          timestamp: this.db.Timestamp.fromDate(new Date(failure.timestamp)),
          // Add additional metadata
          status: 'failed',
          createdAt: this.db.Timestamp.now()
        };
        
        // Add to batch
        batch.set(docRef, failureData, { merge: true });
      });
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to save failures to Firestore: ${error}`);
    }
  }
  
  /**
   * Extract error snippets from an error message
   * 
   * @param message Error message
   * @returns Array of error snippets
   */
  private extractErrorSnippets(message: string | any): string[] {
    if (!message) return [];
    
    // Handle non-string messages
    if (typeof message !== 'string') {
      // If it's an object with a toString method, use that
      if (message && typeof message.toString === 'function') {
        message = message.toString();
      } else {
        // Otherwise, return empty array
        return [];
      }
    }
    
    const lines = message.split('\n');
    
    // Look for code snippets (lines with ">" at the beginning)
    const codeSnippets = lines.filter((line: string) => line.trim().startsWith('>'));
    
    return codeSnippets.length > 0 ? codeSnippets : [];
  }
  
  /**
   * Map a Firestore document to a TestFailure object
   * 
   * @param docId Document ID
   * @param data Document data
   * @param timestamp Formatted timestamp
   * @returns Mapped TestFailure object
   */
  private mapDocumentToFailure(docId: string, data: any, timestamp: string): TestFailure {
    return {
      id: docId,
      testId: data.testId || data.id || docId,
      testTitle: data.testTitle || data.title || 'Unknown Test',
      errorMessage: data.errorMessage || data.error || '',
      timestamp,
      metadata: {
        // Process any metadata fields
        ...(data.metadata || {}),
        
        // Common fields that might be at the root level
        projectName: data.projectName || data.project,
        suite: data.suite,
        filePath: data.filePath || data.file,
        lineNumber: data.lineNumber || data.line,
        actualValue: data.actualValue || data.actual,
        expectedValue: data.expectedValue || data.expected,
        locator: data.locator,
        matcher: data.matcher,
        timeoutMs: data.timeoutMs || data.timeout,
        
        // Additional fields
        reportLink: data.reportLink,
        runId: data.runId,
        
        // Extract error snippets if available
        errorSnippets: data.errorSnippets || this.extractErrorSnippets(data.errorMessage || data.error || '')
      }
    };
  }
}

/**
 * Create a new Firestore adapter with the specified configuration
 * 
 * @param config Configuration options
 * @returns Configured Firestore adapter
 */
export function createFirestoreAdapter(config: FirestoreAdapterConfig): FirestoreAdapter {
  return new FirestoreAdapter(config);
}