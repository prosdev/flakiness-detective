/**
 * Example integration with an existing test dashboard
 * 
 * This example shows how to use Flakiness Detective as a drop-in replacement
 * for a custom flakiness detection implementation in an existing test dashboard.
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { createGoogleCloudDetective } from '@flakiness-detective/adapters';

// Load environment variables from .env file if it exists
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these environment variables or create a .env file with:');
  console.error('GOOGLE_CLOUD_PROJECT_ID=your-project-id');
  console.error('GOOGLE_API_KEY=your-google-api-key');
  console.error('\nFor authentication, either:');
  console.error('1. Set GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json');
  console.error('2. Or run: gcloud auth application-default login');
  process.exit(1);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Dashboard Integration Example');
  console.log('================================\n');

  // Create a detective with dashboard-compatible configuration
  const detective = createGoogleCloudDetective({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    apiKey: process.env.GOOGLE_API_KEY || '',
    // Match your existing collection names
    storage: {
      failuresCollection: 'individual_test_runs',
      clustersCollection: 'flaky_clusters'
    },
    // Configuration options for clustering
    clustering: {
      epsilon: 0.3,
      minPoints: 2,
      minClusterSize: 3
    },
    // Time window in days
    timeWindow: { days: 7 }
  });

  console.log('1️⃣ Configuration');
  console.log('----------------');
  console.log('Google Cloud Project: ' + process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('Failures Collection: individual_test_runs');
  console.log('Clusters Collection: flaky_clusters');
  console.log('Time Window: 7 days');
  console.log('\n');

  console.log('2️⃣ Detecting Flaky Tests');
  console.log('----------------------');
  console.log('Running flakiness detection...');

  try {
    // Run the detection process
    const clusters = await detective.detect();

    console.log(`✅ Found ${clusters.length} flaky test clusters\n`);

    // Display cluster information
    clusters.forEach((cluster, index) => {
      console.log(`Cluster #${index + 1}: ${cluster.title} (${cluster.count} failures)`);
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
      
      // Add more detailed information if available
      if (cluster.assertionPattern) {
        console.log(`Assertion pattern: ${cluster.assertionPattern}`);
      }
      
      console.log('\n');
    });

    console.log('3️⃣ Benefits of this Approach');
    console.log('---------------------------');
    console.log('The Flakiness Detective provides these advantages:');
    console.log('✓ More sophisticated clustering using AI embeddings');
    console.log('✓ Better pattern detection with semantic understanding');
    console.log('✓ Framework-specific analysis for test frameworks');
    console.log('✓ Maintainable, open-source implementation');
    console.log('✓ Configurable for different projects and use cases');
  } catch (error) {
    console.error('❌ Error detecting flaky tests:', error);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export for potential reuse
export { main };