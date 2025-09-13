import { 
  createFlakinessDetective, 
  TestFailure, 
  EmbeddingProvider
} from '@flakiness-detective/core';
import { InMemoryAdapter } from '@flakiness-detective/adapters';

/**
 * Simple mock embedding provider for demonstration
 */
export class DemoEmbeddingProvider implements EmbeddingProvider {
  /**
   * Generate a simple embedding based on text content
   * This is just for demonstration - a real implementation would use a proper AI model
   */
  async embedContent(content: string): Promise<number[]> {
    // For demo purposes, create a simple embedding based on text features
    // A real implementation would use a proper AI model
    const features = [
      content.length / 1000, // Normalize length
      content.includes('timeout') ? 1.0 : 0.0,
      content.includes('expect(') ? 1.0 : 0.0,
      content.includes('AssertionError') ? 1.0 : 0.0,
      content.includes('undefined') ? 1.0 : 0.0,
      content.includes('null') ? 1.0 : 0.0,
      content.includes('selector') || content.includes('locator') ? 1.0 : 0.0,
      content.includes('failed') ? 1.0 : 0.0,
      content.split('\n').length / 100, // Normalized line count
    ];
    
    // Expand to 32 dimensions with some random noise for demo
    const embedding = Array(32).fill(0).map((_, i) => {
      if (i < features.length) {
        return features[i];
      }
      return Math.random() * 0.1; // Small random values
    });
    
    return embedding;
  }
  
  /**
   * Generate embeddings for multiple text contents
   */
  async embedBatch(contents: string[]): Promise<number[][]> {
    return Promise.all(contents.map(content => this.embedContent(content)));
  }
}

/**
 * Generate some synthetic test failures for demo purposes
 */
function generateSyntheticFailures(count: number): TestFailure[] {
  const failures: TestFailure[] = [];
  
  // Failure templates to generate synthetic data
  const failureTemplates = [
    // Timeout failures
    {
      title: 'should load dashboard within timeout',
      error: 'Timeout of 30000ms exceeded.\nWaiting for selector "div.dashboard-loaded" failed: timeout 30000ms exceeded',
      filePath: 'tests/dashboard.spec.ts',
      lineNumber: '45',
      locator: 'div.dashboard-loaded',
      matcher: 'toBeVisible',
      timeoutMs: 30000
    },
    {
      title: 'should display user profile after login',
      error: 'Timeout of 5000ms exceeded.\nWaiting for selector "div.user-profile" failed: timeout 5000ms exceeded',
      filePath: 'tests/auth.spec.ts',
      lineNumber: '78',
      locator: 'div.user-profile',
      matcher: 'toBeVisible',
      timeoutMs: 5000
    },
    
    // Assertion failures
    {
      title: 'should show correct item count',
      error: 'AssertionError: expected 5 but got 4\n  at ItemList.spec.ts:123',
      filePath: 'tests/ItemList.spec.ts',
      lineNumber: '123',
      actualValue: '4',
      expectedValue: '5',
      matcher: 'toEqual'
    },
    {
      title: 'should update total price',
      error: 'AssertionError: expected $25.00 but got $20.00\n  at Cart.spec.ts:56',
      filePath: 'tests/Cart.spec.ts',
      lineNumber: '56',
      actualValue: '$20.00',
      expectedValue: '$25.00',
      matcher: 'toContain'
    },
    
    // Element not found failures
    {
      title: 'should navigate to details page',
      error: 'Error: Element not found: button.view-details\n  at Navigation.spec.ts:34',
      filePath: 'tests/Navigation.spec.ts',
      lineNumber: '34',
      locator: 'button.view-details',
      matcher: 'toBeVisible'
    }
  ];
  
  // Generate failures with some variations
  for (let i = 0; i < count; i++) {
    // Select a template
    const template = failureTemplates[i % failureTemplates.length];
    
    // Add some variation
    const variation = i % 3;
    
    // Create failure with template + variation
    failures.push({
      id: `failure-${i}`,
      testId: `test-${i % 10}`,
      testTitle: template.title,
      errorMessage: variation === 0 ? template.error : 
                    variation === 1 ? template.error.replace('timeout', 'timed out') :
                    template.error.replace('got', 'received'),
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        errorSnippets: [template.error.split('\n')[0]],
        lineNumber: template.lineNumber,
        filePath: template.filePath,
        projectName: 'demo-project',
        suite: 'E2E Tests',
        actualValue: template.actualValue,
        expectedValue: template.expectedValue,
        locator: template.locator,
        matcher: template.matcher,
        timeoutMs: template.timeoutMs
      }
    });
  }
  
  return failures;
}

/**
 * Run the demo
 */
async function runDemo() {
  console.log('🕵️‍♂️ Flakiness Detective Demo');
  console.log('-----------------------------');
  
  // Create in-memory adapter
  const adapter = new InMemoryAdapter();
  
  // Create embedding provider
  const embeddingProvider = new DemoEmbeddingProvider();
  
  // Generate synthetic failures
  const failures = generateSyntheticFailures(50);
  console.log(`Generated ${failures.length} synthetic test failures`);
  
  // Add failures to adapter
  await adapter.addFailures(failures);
  console.log(`Added failures to in-memory storage`);
  
  // Create detective instance
  const detective = createFlakinessDetective(
    adapter,
    embeddingProvider,
    {
      timeWindow: { days: 7 },
      clustering: {
        epsilon: 0.3,
        minPoints: 2,
        minClusterSize: 3
      }
    }
  );
  
  console.log('Running flakiness detection...');
  
  // Run detection
  const clusters = await detective.detect();
  
  console.log(`\n✅ Found ${clusters.length} flaky test patterns\n`);
  
  // Display cluster details
  clusters.forEach((cluster, index) => {
    console.log(`Cluster ${index + 1}: ${cluster.title}`);
    console.log(`Count: ${cluster.count} failures`);
    console.log(`Pattern: ${cluster.failurePattern}`);
    
    if (cluster.commonFilePaths?.length) {
      console.log(`Common files: ${cluster.commonFilePaths.join(', ')}`);
    }
    
    if (cluster.commonLocators?.length) {
      console.log(`Common locators: ${cluster.commonLocators.join(', ')}`);
    }
    
    if (cluster.commonMatchers?.length) {
      console.log(`Common matchers: ${cluster.commonMatchers.join(', ')}`);
    }
    
    console.log(`Sample error: ${cluster.errorMessages[0]}`);
    console.log('---');
  });
}

// Run the demo
runDemo().catch(console.error);