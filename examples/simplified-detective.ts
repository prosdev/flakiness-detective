/**
 * Example of using the simplified detective with customQueryFn
 * 
 * This example shows how to use the simplified detective to detect flaky tests
 * with a custom query function that avoids requiring a Firestore index.
 */

import { createSimplifiedDetective } from '../packages/adapters/dist';
import * as admin from 'firebase-admin';

// Initialize Firebase (if not already initialized)
try {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  });
} catch (error) {
  // App already initialized
}

// Get Firestore instance
const db = admin.firestore();

// Create a detective with simplified configuration
const detective = createSimplifiedDetective({
  // Required configuration
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  apiKey: process.env.GOOGLE_API_KEY || '',
  
  // Optional configuration
  failuresCollection: 'test_failures',
  clustersCollection: 'flaky_clusters',
  timeWindowDays: 7,
  
  // Pass existing Firestore instance
  firestoreInstance: db,
  
  // Custom query function that avoids requiring a Firestore index
  customQueryFn: async (db, collection, days) => {
    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    // Use simpler query with client-side filtering
    const snap = await db.collection(collection)
      .where('timestamp', '>=', cutoff)
      .get();
    
    // Filter client-side to avoid composite index requirement
    return snap.docs.filter(doc => {
      const data = doc.data();
      return data.status !== 'passed';
    });
  }
});

// Run flakiness detection
async function main() {
  console.log('Running flakiness detection...');
  try {
    const clusters = await detective.detect();
    console.log(`Found ${clusters.length} flaky test clusters`);
    
    // Display cluster information
    clusters.forEach((cluster, index) => {
      console.log(`\nCluster #${index + 1}: ${cluster.title} (${cluster.count} failures)`);
      console.log(`Test: ${cluster.testTitle}`);
      
      if (cluster.failurePattern) {
        console.log(`Failure pattern: ${cluster.failurePattern}`);
      }
      
      if (cluster.commonFilePaths && cluster.commonFilePaths.length > 0) {
        console.log(`Common file paths: ${cluster.commonFilePaths.join(', ')}`);
      }
      
      if (cluster.commonLineNumbers && cluster.commonLineNumbers.length > 0) {
        console.log(`Common line numbers: ${cluster.commonLineNumbers.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error detecting flaky tests:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for reuse
export { main };