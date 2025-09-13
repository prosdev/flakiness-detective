import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestFailure } from '@flakiness-detective/core';
import { PlaywrightAdapter, PlaywrightTestResult } from '../playwright-adapter';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    default: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockImplementation((path) => {
        if (path.includes('failures.json')) {
          return Promise.resolve(JSON.stringify(mockStoredFailures));
        }
        if (path.includes('clusters.json')) {
          return Promise.resolve(JSON.stringify(mockStoredClusters));
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      }),
      access: vi.fn().mockImplementation((path) => {
        if (path.includes('failures.json') || path.includes('clusters.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      }),
    },
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockImplementation((path) => {
      if (path.includes('failures.json')) {
        return Promise.resolve(JSON.stringify(mockStoredFailures));
      }
      if (path.includes('clusters.json')) {
        return Promise.resolve(JSON.stringify(mockStoredClusters));
      }
      return Promise.reject(new Error(`File not found: ${path}`));
    }),
    access: vi.fn().mockImplementation((path) => {
      if (path.includes('failures.json') || path.includes('clusters.json')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`File not found: ${path}`));
    }),
  };
});

// Mock stored data
const mockStoredFailures: TestFailure[] = [
  {
    id: 'failure-1',
    testId: 'test-1',
    testTitle: 'should load dashboard',
    errorMessage: 'Timeout 30000ms exceeded',
    timestamp: new Date().toISOString(),
    metadata: {
      projectName: 'test-project',
      filePath: 'pages/DashboardPage.ts',
      lineNumber: '45',
      timeoutMs: 30000,
    }
  }
];

const mockStoredClusters = [
  {
    id: 'cluster-1',
    title: 'Dashboard timeout',
    count: 5,
    testId: 'test-1',
    testTitle: 'should load dashboard',
    timestamp: new Date().toISOString(),
    failureIds: ['failure-1', 'failure-2'],
    failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
    errorMessages: ['Timeout 30000ms exceeded', 'Timeout 30000ms exceeded'],
  }
];

// Test data
const playwrightTimeoutResult: PlaywrightTestResult = {
  testId: 'dashboard-test-1',
  title: 'Homepage > Dashboard > should load dashboard within timeout',
  status: 'timedOut',
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
  timestamp: new Date().toISOString()
};

const playwrightAssertionResult: PlaywrightTestResult = {
  testId: 'cart-test-1',
  title: 'Shopping > Cart > should show correct item count',
  status: 'failed',
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
  timestamp: new Date().toISOString()
};

const playwrightElementNotFoundResult: PlaywrightTestResult = {
  testId: 'navigation-test-1',
  title: 'Navigation > Details > should navigate to details page',
  status: 'failed',
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
  timestamp: new Date().toISOString()
};

describe('PlaywrightAdapter', () => {
  let adapter: PlaywrightAdapter;

  beforeEach(() => {
    adapter = new PlaywrightAdapter({
      dataDir: './test-data',
      extractSelectors: true,
      includeSnippets: true
    });
    
    // Reset mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with the provided configuration', () => {
      expect(adapter).toBeInstanceOf(PlaywrightAdapter);
    });

    it('should create the data directory when initialize is called', async () => {
      await adapter.initialize();
      expect(fs.mkdir).toHaveBeenCalledWith('./test-data', { recursive: true });
    });
    
    it('should use default configuration values when not provided', () => {
      const minimalAdapter = new PlaywrightAdapter({
        dataDir: './test-data'
      });
      
      // Access private properties for testing
      const config = (minimalAdapter as any).config;
      
      // Verify defaults are applied
      expect(config.extractSelectors).toBe(true);
      expect(config.includeSnippets).toBe(true);
      expect(config.ignoreConsoleErrors).toBe(true);
    });
    
    it('should override default configuration with provided values', () => {
      const customAdapter = new PlaywrightAdapter({
        dataDir: './test-data',
        extractSelectors: false,
        includeSnippets: false,
        ignoreConsoleErrors: false
      });
      
      // Access private properties for testing
      const config = (customAdapter as any).config;
      
      // Verify custom values are used
      expect(config.extractSelectors).toBe(false);
      expect(config.includeSnippets).toBe(false);
      expect(config.ignoreConsoleErrors).toBe(false);
    });
  });

  describe('extractPlaywrightMetadata', () => {
    it('should extract metadata from different error message patterns', () => {
      // Create a test result with an error message that has various patterns to extract
      const testResult: PlaywrightTestResult = {
        testId: 'metadata-test',
        title: 'Test with metadata in error message',
        status: 'failed',
        error: {
          message: 'timeout 5000ms waiting for selector "#login-button". Expected to contain text "Welcome" but got "Hello"'
        },
        projectName: 'chromium'
      };
      
      // Use private method directly for testing
      const metadata = (adapter as any).extractPlaywrightMetadata(testResult);
      
      // Check that metadata was extracted correctly from the error message
      expect(metadata.timeoutMs).toBe(5000);
      expect(metadata.selector).toBe('#login-button');
    });
    
    it('should extract matcher from common assertion phrases', () => {
      // Test various matcher phrases
      const matcherPhrases = [
        { message: 'expected element to be visible', matcher: 'toBeVisible' },
        { message: 'expected element to be hidden', matcher: 'toBeHidden' },
        { message: 'expected element to contain text "foo"', matcher: 'toContainText' },
        { message: 'expected element to have text "bar"', matcher: 'toHaveText' },
        { message: 'expected input to have value "123"', matcher: 'toHaveValue' },
        { message: 'expected checkbox to be checked', matcher: 'toBeChecked' },
        { message: 'expected button to be enabled', matcher: 'toBeEnabled' },
        { message: 'expected input to be disabled', matcher: 'toBeDisabled' }
      ];
      
      // Test each phrase
      matcherPhrases.forEach(({ message, matcher }) => {
        const testResult: PlaywrightTestResult = {
          testId: 'matcher-test',
          title: 'Test for extracting matchers',
          status: 'failed',
          error: { message }
        };
        
        const metadata = (adapter as any).extractPlaywrightMetadata(testResult);
        expect(metadata.matcher).toBe(matcher);
      });
    });
    
    it('should not include snippets when config.includeSnippets is false', () => {
      // Create adapter with includeSnippets disabled
      const noSnippetsAdapter = new PlaywrightAdapter({
        dataDir: './test-data',
        includeSnippets: false
      });
      
      const testResult: PlaywrightTestResult = {
        testId: 'snippet-test',
        title: 'Test with snippet',
        status: 'failed',
        error: {
          message: 'Error occurred',
          snippet: 'await expect(page).toHaveTitle("Homepage");'
        }
      };
      
      // Use private method directly for testing
      const metadata = (noSnippetsAdapter as any).extractPlaywrightMetadata(testResult);
      
      // Check that snippets were not included
      expect(metadata.errorSnippets).toBeUndefined();
    });
  });
  
  describe('parsePlaywrightFailure', () => {
    it('should parse timeout failures correctly', async () => {
      const failures = await adapter.processPlaywrightResults([playwrightTimeoutResult]);
      const failure = failures[0];

      expect(failure).toBeDefined();
      expect(failure.testId).toBe('dashboard-test-1');
      expect(failure.testTitle).toBe('Homepage > Dashboard > should load dashboard within timeout');
      expect(failure.errorMessage).toContain('Timeout 30000ms exceeded');
      
      // Check metadata extraction
      expect(failure.metadata.filePath).toBe('pages/DashboardPage.ts');
      expect(failure.metadata.lineNumber).toBe('45');
      expect(failure.metadata.locator).toBe('div.dashboard-loaded');
      expect(failure.metadata.timeoutMs).toBe(30000);
      expect(failure.metadata.errorSnippets).toContain('await this.page.waitForSelector("div.dashboard-loaded", { timeout: 30000 });');
    });

    it('should parse assertion failures correctly', async () => {
      const failures = await adapter.processPlaywrightResults([playwrightAssertionResult]);
      const failure = failures[0];

      expect(failure).toBeDefined();
      expect(failure.testId).toBe('cart-test-1');
      expect(failure.testTitle).toBe('Shopping > Cart > should show correct item count');
      expect(failure.errorMessage).toContain('Expect 5 === 4');
      
      // Check metadata extraction
      expect(failure.metadata.filePath).toBe('pages/CartPage.ts');
      expect(failure.metadata.lineNumber).toBe('123');
      expect(failure.metadata.matcher).toBe('toHaveText');
      expect(failure.metadata.expectedValue).toBe('5');
      expect(failure.metadata.actualValue).toBe('4');
      expect(failure.metadata.locator).toBe('this.itemCount');
    });

    it('should parse element not found failures correctly', async () => {
      const failures = await adapter.processPlaywrightResults([playwrightElementNotFoundResult]);
      const failure = failures[0];

      expect(failure).toBeDefined();
      expect(failure.testId).toBe('navigation-test-1');
      expect(failure.testTitle).toBe('Navigation > Details > should navigate to details page');
      expect(failure.errorMessage).toContain('Element not found');
      
      // Check metadata extraction
      expect(failure.metadata.filePath).toBe('pages/NavigationPage.ts');
      expect(failure.metadata.lineNumber).toBe('34');
      expect(failure.metadata.locator).toBe('button.view-details');
    });
  });

  describe('processPlaywrightResults', () => {
    it('should process multiple test results correctly', async () => {
      const results = [
        playwrightTimeoutResult,
        playwrightAssertionResult,
        playwrightElementNotFoundResult
      ];
      
      const failures = await adapter.processPlaywrightResults(results);
      
      expect(failures).toHaveLength(3);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should save processed failures to storage', async () => {
      await adapter.processPlaywrightResults([playwrightTimeoutResult]);
      
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Check that the save method uses the correct file path
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      expect(writeFileCalls[0][0]).toContain('failures.json');
    });

    it('should handle empty results array', async () => {
      const failures = await adapter.processPlaywrightResults([]);
      
      expect(failures).toHaveLength(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('inheritance from FileSystemAdapter', () => {
    it('should inherit fetchFailures from FileSystemAdapter', async () => {
      // Setup specific mocks for this test
      vi.mocked(fs.readFile).mockImplementationOnce((path) => {
        if (path.includes('failures.json')) {
          return Promise.resolve(JSON.stringify(mockStoredFailures));
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      
      const failures = await adapter.fetchFailures(7);
      
      expect(failures).toHaveLength(1);
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('failures.json'), 'utf-8');
    });

    it('should inherit fetchClusters from FileSystemAdapter', async () => {
      // Setup specific mocks for this test
      vi.mocked(fs.readFile).mockImplementationOnce((path) => {
        if (path.includes('clusters.json')) {
          return Promise.resolve(JSON.stringify(mockStoredClusters));
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      
      const clusters = await adapter.fetchClusters();
      
      expect(clusters).toHaveLength(1);
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('clusters.json'), 'utf-8');
    });

    it('should inherit saveClusters from FileSystemAdapter', async () => {
      await adapter.saveClusters([
        {
          id: 'new-cluster',
          title: 'New Cluster',
          count: 3,
          testId: 'test-2',
          testTitle: 'New Test',
          timestamp: new Date().toISOString(),
          failureIds: ['failure-3', 'failure-4'],
          failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
          errorMessages: ['Error 1', 'Error 2'],
        }
      ]);
      
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
    
    it('should enhance clusters with Playwright-specific insights', async () => {
      // Mock the original fetchClusters to return a cluster without Playwright-specific enhancements
      const originalClusters = [
        {
          id: 'cluster-without-enhancements',
          title: 'Some cluster',
          count: 3,
          testId: 'test-3',
          testTitle: 'Some test',
          timestamp: new Date().toISOString(),
          failureIds: ['failure-5', 'failure-6'],
          failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
          errorMessages: ['Error 1', 'Error 2'],
          commonMatchers: ['toBeVisible'],
          commonLocators: ['button.submit']
        }
      ];
      
      // Create a specific mock for this test
      vi.mocked(fs.readFile).mockImplementationOnce((path) => {
        if (path.includes('clusters.json')) {
          return Promise.resolve(JSON.stringify(originalClusters));
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      
      const enhancedClusters = await adapter.fetchClusters();
      
      expect(enhancedClusters).toHaveLength(1);
      // Check that assertionPattern was added based on the common matchers and locators
      expect(enhancedClusters[0].assertionPattern).toBe('toBeVisible on button.submit');
    });
    
    it('should handle clusters without common locators when enhancing', async () => {
      // Mock cluster with matchers but no locators
      const clustersWithoutLocators = [
        {
          id: 'cluster-without-locators',
          title: 'Some cluster',
          count: 3,
          testId: 'test-3',
          testTitle: 'Some test',
          timestamp: new Date().toISOString(),
          failureIds: ['failure-5', 'failure-6'],
          failureTimestamps: [new Date().toISOString(), new Date().toISOString()],
          errorMessages: ['Error 1', 'Error 2'],
          commonMatchers: ['toHaveText'],
          // No commonLocators
        }
      ];
      
      // Create a specific mock for this test
      vi.mocked(fs.readFile).mockImplementationOnce((path) => {
        if (path.includes('clusters.json')) {
          return Promise.resolve(JSON.stringify(clustersWithoutLocators));
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      
      const enhancedClusters = await adapter.fetchClusters();
      
      expect(enhancedClusters).toHaveLength(1);
      // Should use just the matcher for the pattern without a locator
      expect(enhancedClusters[0].assertionPattern).toBe('toHaveText assertion');
    });
  });

  describe('error handling', () => {
    it('should handle errors when initializing', async () => {
      // Mock mkdir to throw an error
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('Directory creation failed'));
      
      await expect(adapter.initialize()).rejects.toThrow('Failed to create data directory');
    });

    it('should handle invalid test results gracefully', async () => {
      // Pass minimal valid data structure but with invalid values
      const failures = await adapter.processPlaywrightResults([{
        testId: 'invalid-test',
        title: 'Invalid Test', // Must provide a title for split operation
        status: 'failed',
        error: undefined as any
      }]);
      
      expect(failures).toHaveLength(1);
      expect(failures[0].errorMessage).toBe('Test failed');
    });
    
    it('should handle missing error object in test results', async () => {
      const incompleteTest: PlaywrightTestResult = {
        testId: 'incomplete-test',
        title: 'Test with missing error data',
        status: 'failed',
        projectName: 'chromium',
        timestamp: new Date().toISOString()
        // No error object
      };
      
      const failures = await adapter.processPlaywrightResults([incompleteTest]);
      
      expect(failures).toHaveLength(1);
      const failure = failures[0];
      expect(failure.testId).toBe('incomplete-test');
      expect(failure.errorMessage).toBe('Test failed');
      expect(failure.metadata.projectName).toBe('chromium');
    });
    
    it('should handle missing timestamp in test results by using current time', async () => {
      const testWithoutTimestamp: PlaywrightTestResult = {
        testId: 'no-timestamp-test',
        title: 'Test without timestamp',
        status: 'failed',
        error: {
          message: 'Some error occurred'
        }
      };
      
      const failures = await adapter.processPlaywrightResults([testWithoutTimestamp]);
      
      expect(failures).toHaveLength(1);
      const failure = failures[0];
      expect(failure.testId).toBe('no-timestamp-test');
      expect(failure.timestamp).toBeDefined();
      expect(new Date(failure.timestamp).getTime()).not.toBeNaN();
    });
  });
});