/**
 * Example of using the Firestore adapter with Flakiness Detective
 * 
 * This example shows how to use the Firestore adapter to store and
 * retrieve test failures and flakiness clusters.
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  createFlakinessDetective,
  createFirestoreAdapter,
  GoogleGenAIProvider 
} from '@flakiness-detective/adapters';

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
 * Sample test failure data
 */
const sampleFailures = [
  {
    testId: 'login-test-1',
    testTitle: 'User should be able to log in',
    errorMessage: 'Timeout 30000ms exceeded.\nWaiting for selector "div.dashboard" failed: timeout 30000ms exceeded',
    timestamp: new Date().toISOString(),
    metadata: {
      projectName: 'web-app',
      filePath: 'tests/login.spec.ts',
      lineNumber: '45',
      errorSnippets: ['await page.waitForSelector("div.dashboard", { timeout: 30000 });'],
      locator: 'div.dashboard',
      timeoutMs: 30000
    }
  },
  {
    testId: 'login-test-1',
    testTitle: 'User should be able to log in',
    errorMessage: 'Timeout 30000ms exceeded.\nWaiting for element div.dashboard timed out: timeout 30000ms exceeded',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    metadata: {
      projectName: 'web-app',
      filePath: 'tests/login.spec.ts',
      lineNumber: '45',
      errorSnippets: ['await page.waitForSelector("div.dashboard", { timeout: 30000 });'],
      locator: 'div.dashboard',
      timeoutMs: 30000
    }
  },
  {
    testId: 'login-test-1',
    testTitle: 'User should be able to log in',
    errorMessage: 'Timeout 30000ms exceeded.\nElement div.dashboard not found: timeout 30000ms exceeded',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    metadata: {
      projectName: 'web-app',
      filePath: 'tests/login.spec.ts',
      lineNumber: '45',
      errorSnippets: ['await page.waitForSelector("div.dashboard", { timeout: 30000 });'],
      locator: 'div.dashboard',
      timeoutMs: 30000
    }
  },
  {
    testId: 'checkout-test-1',
    testTitle: 'User should be able to complete checkout',
    errorMessage: 'Expect 5 === 4\nExpected: 5\nReceived: 4',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    metadata: {
      projectName: 'web-app',
      filePath: 'tests/checkout.spec.ts',
      lineNumber: '123',
      errorSnippets: ['expect(items.length).toBe(5);'],
      matcher: 'toBe',
      expected: '5',
      actual: '4'
    }
  },
  {
    testId: 'checkout-test-1',
    testTitle: 'User should be able to complete checkout',
    errorMessage: 'Expect 5 === 4\nExpected: 5\nReceived: 4',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    metadata: {
      projectName: 'web-app',
      filePath: 'tests/checkout.spec.ts',
      lineNumber: '123',
      errorSnippets: ['expect(items.length).toBe(5);'],
      matcher: 'toBe',
      expected: '5',
      actual: '4'
    }
  }
];

/**
 * Main execution function
 */
async function main() {
  console.log('🔥 Firestore Adapter Example');
  console.log('==========================\n');

  // 1. Create Firestore adapter
  console.log('1️⃣ Creating Firestore adapter...');
  const firestoreAdapter = createFirestoreAdapter({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    failuresCollection: 'flakiness_detective_failures',
    clustersCollection: 'flakiness_detective_clusters'
  });

  // 2. Create embedding provider
  console.log('2️⃣ Creating Google GenAI embedding provider...');
  const embeddingProvider = new GoogleGenAIProvider({
    apiKey: process.env.GOOGLE_API_KEY || ''
  });

  // 3. Create flakiness detective
  console.log('3️⃣ Creating Flakiness Detective...');
  const detective = createFlakinessDetective(
    firestoreAdapter,
    embeddingProvider,
    {
      timeWindow: { days: 7 },
      clustering: {
        epsilon: 0.3,
        minPoints: 2
      }
    }
  );

  try {
    // 4. Save sample test failures (optional step - would typically come from your test framework)
    console.log('4️⃣ Saving sample test failures...');
    await firestoreAdapter.saveFailures(sampleFailures);
    console.log(`✅ Saved ${sampleFailures.length} sample test failures to Firestore`);

    // 5. Detect flaky tests
    console.log('\n5️⃣ Detecting flaky tests...');
    const clusters = await detective.detect();
    console.log(`✅ Found ${clusters.length} flaky test clusters`);

    // 6. Display cluster information
    console.log('\n6️⃣ Cluster Information:');
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

    // 7. Fetch clusters from Firestore
    console.log('\n7️⃣ Fetching clusters from Firestore...');
    const storedClusters = await firestoreAdapter.fetchClusters();
    console.log(`✅ Fetched ${storedClusters.length} clusters from Firestore`);
  } catch (error) {
    console.error('❌ Error:', error);
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