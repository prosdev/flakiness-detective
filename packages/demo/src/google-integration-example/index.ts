import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  createGoogleCloudDetective, 
  createGooglePlaywrightDetective,
  createLyticsCompatibleDetective, 
  PlaywrightTestResult 
} from '@flakiness-detective/adapters';

// Load environment variables from .env file if it exists
const envPath = join(__dirname, '../../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Generate some synthetic Playwright test failures for demo purposes
 * Same as in the Playwright demo
 */
function generateSyntheticPlaywrightFailures(count: number): PlaywrightTestResult[] {
  const failures: PlaywrightTestResult[] = [];
  
  // Failure templates to generate synthetic data
  const failureTemplates = [
    // Timeout failures with Playwright-specific details
    {
      title: 'Homepage > Dashboard > should load dashboard within timeout',
      status: 'timedOut' as const,
      error: {
        message: 'Timeout 30000ms exceeded.\nWaiting for selector "div.dashboard-loaded" failed: timeout 30000ms exceeded',
        stack: 'Error: Timeout 30000ms exceeded.\n    at DashboardPage.waitForDashboard (pages/DashboardPage.ts:45:10)',
        location: {
          file: 'pages/DashboardPage.ts',
          line: 45,
          column: 10
        },
        snippet: 'await this.page.waitForSelector("div.dashboard-loaded", { timeout: 30000 });',
        locator: 'div.dashboard-loaded',
        timeout: 30000
      },
      projectName: 'chromium',
      testId: 'dashboard-test-1'
    },
    {
      title: 'Authentication > Login > should display user profile after login',
      status: 'timedOut' as const,
      error: {
        message: 'Timeout 5000ms exceeded.\nWaiting for selector "div.user-profile" failed: timeout 5000ms exceeded',
        stack: 'Error: Timeout 5000ms exceeded.\n    at LoginPage.verifyProfile (pages/LoginPage.ts:78:12)',
        location: {
          file: 'pages/LoginPage.ts',
          line: 78,
          column: 12
        },
        snippet: 'await expect(this.userProfile).toBeVisible({ timeout: 5000 });',
        locator: 'div.user-profile',
        matcher: 'toBeVisible',
        timeout: 5000
      },
      projectName: 'chromium',
      testId: 'auth-test-1'
    },
    
    // Assertion failures with Playwright-specific details
    {
      title: 'Shopping > Cart > should show correct item count',
      status: 'failed' as const,
      error: {
        message: 'Expect 5 === 4\nExpected: 5\nReceived: 4',
        stack: 'Error: Expect 5 === 4\n    at CartPage.verifyItemCount (pages/CartPage.ts:123:12)',
        location: {
          file: 'pages/CartPage.ts',
          line: 123,
          column: 12
        },
        snippet: 'await expect(this.itemCount).toHaveText("5");',
        matcher: 'toHaveText',
        expected: '5',
        actual: '4',
        locator: 'this.itemCount'
      },
      projectName: 'firefox',
      testId: 'cart-test-1'
    },
    {
      title: 'Shopping > Cart > should update total price',
      status: 'failed' as const,
      error: {
        message: 'Expect "$25.00" === "$20.00"\nExpected: "$25.00"\nReceived: "$20.00"',
        stack: 'Error: Expect "$25.00" === "$20.00"\n    at CartPage.verifyTotalPrice (pages/CartPage.ts:56:10)',
        location: {
          file: 'pages/CartPage.ts',
          line: 56,
          column: 10
        },
        snippet: 'await expect(this.totalPrice).toHaveText("$25.00");',
        matcher: 'toHaveText',
        expected: '$25.00',
        actual: '$20.00',
        locator: 'this.totalPrice'
      },
      projectName: 'webkit',
      testId: 'cart-test-2'
    },
    
    // Element not found failures with Playwright-specific details
    {
      title: 'Navigation > Details > should navigate to details page',
      status: 'failed' as const,
      error: {
        message: 'Element not found: button.view-details',
        stack: 'Error: Element not found: button.view-details\n    at NavigationPage.clickViewDetails (pages/NavigationPage.ts:34:8)',
        location: {
          file: 'pages/NavigationPage.ts',
          line: 34,
          column: 8
        },
        snippet: 'await this.page.click("button.view-details");',
        locator: 'button.view-details'
      },
      projectName: 'chromium',
      testId: 'navigation-test-1'
    }
  ];
  
  // Generate failures with some variations
  for (let i = 0; i < count; i++) {
    // Select a template
    const template = failureTemplates[i % failureTemplates.length];
    
    // Add some variation
    const variation = i % 3;
    
    // Create failure with template + slight variations to simulate flakiness
    failures.push({
      ...template,
      testId: `${template.testId}-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      // Introduce minor variations to simulate flakiness
      error: {
        ...template.error,
        message: variation === 0 ? template.error.message : 
                variation === 1 ? template.error.message.replace('timeout', 'timed out') :
                template.error.message.replace('Expect', 'Expected'),
      }
    });
  }
  
  return failures;
}

/**
 * Run the basic Google Cloud integration demo
 */
async function runGoogleCloudDemo() {
  // Check for required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_API_KEY) {
    console.log('🛑 Google Cloud demo skipped - missing environment variables');
    console.log('Required variables:');
    console.log('- GOOGLE_CLOUD_PROJECT_ID: Your Google Cloud project ID');
    console.log('- GOOGLE_API_KEY: Your Google AI API key');
    console.log('\nCreate a .env file with these variables to run the demo');
    return;
  }

  console.log('🌩️ Google Cloud Integration Demo');
  console.log('--------------------------------');
  
  // Create Google Cloud detective
  const detective = createGoogleCloudDetective({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    apiKey: process.env.GOOGLE_API_KEY,
    storage: {
      failuresCollection: 'flakiness_detective_demo_failures',
      clustersCollection: 'flakiness_detective_demo_clusters'
    }
  });
  
  // Add some synthetic test failures directly to Firestore
  // Note: This is a simplified example - in a real application,
  // you would be importing real test failures from your CI system
  
  // TODO: Implement adding failures directly to Firestore
  console.log('For Google Cloud integration, you would typically:');
  console.log('1. Import failures from your CI system');
  console.log('2. Store them in Firestore via the adapter');
  console.log('3. Run the detective to detect flaky patterns');
  console.log('4. View the results in a dashboard\n');
}

/**
 * Run the Google Playwright integration demo
 */
async function runGooglePlaywrightDemo() {
  // Check for required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_API_KEY) {
    console.log('🛑 Google Playwright demo skipped - missing environment variables');
    console.log('Required variables:');
    console.log('- GOOGLE_CLOUD_PROJECT_ID: Your Google Cloud project ID');
    console.log('- GOOGLE_API_KEY: Your Google AI API key');
    console.log('\nCreate a .env file with these variables to run the demo');
    return;
  }

  console.log('🎭 Google Playwright Integration Demo');
  console.log('------------------------------------');
  
  // Create Google Playwright detective
  const detective = createGooglePlaywrightDetective({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    apiKey: process.env.GOOGLE_API_KEY,
    storage: {
      failuresCollection: 'flakiness_detective_demo_playwright_failures',
      clustersCollection: 'flakiness_detective_demo_playwright_clusters'
    },
    playwright: {
      storage: {
        extractSelectors: true,
        includeSnippets: true
      },
      embedding: {
        selectors: { weight: 2.0 },
        timeouts: { weight: 1.5 }
      }
    }
  });
  
  // Generate synthetic Playwright test failures
  const failures = generateSyntheticPlaywrightFailures(25);
  console.log(`Generated ${failures.length} synthetic Playwright test failures`);
  
  console.log('Processing Playwright test results with Google Cloud integration...');
  
  // With real Firestore, you would:
  // await detective.processResults(failures);
  // const clusters = await detective.getClusters();
  
  // For the demo, we just show what would happen
  console.log('\nWith a real Google Cloud project, this would:');
  console.log('1. Store the failures in Firestore');
  console.log('2. Generate embeddings with Google GenAI');
  console.log('3. Cluster failures using DBSCAN');
  console.log('4. Save the clusters back to Firestore');
  console.log('5. Enable dashboard visualization of flaky test patterns\n');
}

/**
 * Run the Lytics E2E Dashboard compatibility demo
 */
async function runLyticsCompatibleDemo() {
  // Check for required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_API_KEY) {
    console.log('🛑 Lytics demo skipped - missing environment variables');
    console.log('Required variables:');
    console.log('- GOOGLE_CLOUD_PROJECT_ID: Your Google Cloud project ID');
    console.log('- GOOGLE_API_KEY: Your Google AI API key');
    console.log('\nCreate a .env file with these variables to run the demo');
    return;
  }

  console.log('🔄 Lytics E2E Dashboard Compatibility Demo');
  console.log('------------------------------------------');
  
  // Create a detective with Lytics-compatible configuration
  const detective = createLyticsCompatibleDetective({
    googleProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    googleApiKey: process.env.GOOGLE_API_KEY,
    failuresCollection: 'individual_test_runs',
    clustersCollection: 'flaky_clusters',
    timeWindowDays: 7,
    failureStatusFilter: 'failed'
  });
  
  console.log('Lytics-compatible detective created with the following configuration:');
  console.log('- Google Cloud project: ' + process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('- Failures collection: individual_test_runs');
  console.log('- Clusters collection: flaky_clusters');
  console.log('- Time window: 7 days');
  console.log('- Status filter: failed\n');
  
  console.log('This configuration matches the custom implementation in Lytics E2E Dashboard');
  console.log('and can be used as a drop-in replacement for the existing code.\n');
}

/**
 * Run all Google integration demos
 */
async function runGoogleIntegrationDemos() {
  console.log('🔍 Google Integration Demos');
  console.log('=========================\n');
  
  await runGoogleCloudDemo();
  console.log('---\n');
  
  await runGooglePlaywrightDemo();
  console.log('---\n');
  
  await runLyticsCompatibleDemo();
}

// Run the demos
if (require.main === module) {
  runGoogleIntegrationDemos().catch(console.error);
}

// Export for potential reuse
export { runGoogleIntegrationDemos };