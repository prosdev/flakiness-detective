import { createPlaywrightFlakinessDetective, PlaywrightTestResult, PLAYWRIGHT_DEFAULTS } from '@flakiness-detective/adapters';
import { DemoEmbeddingProvider } from '../index';

/**
 * Generate some synthetic Playwright test failures for demo purposes
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
 * Run the Playwright-specific flakiness detective demo
 */
async function runPlaywrightDemo() {
  console.log('🕵️‍♂️ Playwright Flakiness Detective Demo');
  console.log('---------------------------------------');
  
  // Create base embedding provider (would typically be a real AI service)
  const embeddingProvider = new DemoEmbeddingProvider();
  
  // Create Playwright-specific detective with optimized configuration
  const detective = createPlaywrightFlakinessDetective(
    embeddingProvider,
    {
      storage: {
        ...PLAYWRIGHT_DEFAULTS.storage,
        dataDir: './data/playwright-demo'  // Use a demo-specific directory
      }
    }
  );
  
  // Generate synthetic Playwright test failures
  const failures = generateSyntheticPlaywrightFailures(50);
  console.log(`Generated ${failures.length} synthetic Playwright test failures`);
  
  // Process the failures
  console.log('Processing Playwright test results...');
  await detective.processResults(failures);
  
  // Fetch and display clusters
  const clusters = await detective.getClusters();
  
  console.log(`\n✅ Found ${clusters.length} flaky test patterns in Playwright tests\n`);
  
  // Display cluster details
  clusters.forEach((cluster, index) => {
    console.log(`Cluster ${index + 1}: ${cluster.title}`);
    console.log(`Count: ${cluster.count} failures`);
    
    if (cluster.failurePattern) {
      console.log(`Pattern: ${cluster.failurePattern}`);
    }
    
    if (cluster.assertionPattern) {
      console.log(`Assertion Pattern: ${cluster.assertionPattern}`);
    }
    
    if (cluster.commonFilePaths?.length) {
      console.log(`Common files: ${cluster.commonFilePaths.join(', ')}`);
    }
    
    if (cluster.commonLocators?.length) {
      console.log(`Common locators: ${cluster.commonLocators.join(', ')}`);
    }
    
    if (cluster.commonMatchers?.length) {
      console.log(`Common matchers: ${cluster.commonMatchers.join(', ')}`);
    }
    
    if (cluster.commonTimeouts?.length) {
      console.log(`Common timeouts: ${cluster.commonTimeouts.join('ms, ')}ms`);
    }
    
    console.log(`Sample error: ${cluster.errorMessages[0]}`);
    console.log('---');
  });
  
  console.log('\nPlaywright-Specific Analysis Demonstration:');
  console.log('----------------------------------------');
  
  // Show how Playwright-specific insights can be extracted
  if (clusters.length > 0) {
    const playwrightPatterns = clusters.map(cluster => {
      const playwrightInsight = {
        testPattern: cluster.testTitle.split(' > '),
        selectorFlakiness: cluster.commonLocators?.length ? 'Potential selector stability issue' : 'No selector issues detected',
        timeoutIssue: cluster.commonTimeouts?.length ? `Consider increasing timeout beyond ${cluster.commonTimeouts[0]}ms` : 'No timeout issues detected',
        actionType: determinePlaywrightActionType(cluster.errorMessages),
      };
      
      return playwrightInsight;
    });
    
    // Display Playwright-specific insights
    playwrightPatterns.forEach((pattern, index) => {
      console.log(`Test Pattern ${index + 1}:`);
      console.log(`Journey: ${pattern.testPattern.slice(0, -1).join(' > ')}`);
      console.log(`Action: ${pattern.testPattern[pattern.testPattern.length - 1]}`);
      console.log(`Selector Health: ${pattern.selectorFlakiness}`);
      console.log(`Timeout Assessment: ${pattern.timeoutIssue}`);
      console.log(`Action Type: ${pattern.actionType}`);
      console.log('---');
    });
  }
}

/**
 * Helper function to analyze Playwright-specific action types
 */
function determinePlaywrightActionType(errorMessages: string[]): string {
  const fullMessage = errorMessages.join(' ');
  
  if (fullMessage.includes('waitForSelector') || fullMessage.includes('toBeVisible')) {
    return 'Element Visibility Wait';
  }
  if (fullMessage.includes('click')) {
    return 'Click Action';
  }
  if (fullMessage.includes('toHaveText')) {
    return 'Text Assertion';
  }
  if (fullMessage.includes('fill') || fullMessage.includes('type')) {
    return 'Input Action';
  }
  if (fullMessage.includes('navigation')) {
    return 'Navigation Action';
  }
  
  return 'Generic Playwright Action';
}

// Run the demo
runPlaywrightDemo().catch(console.error);

// Export for potential reuse
export { runPlaywrightDemo };