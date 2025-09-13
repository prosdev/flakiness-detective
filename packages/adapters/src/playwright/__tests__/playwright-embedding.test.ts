import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingProvider, TestFailure } from '@flakiness-detective/core';
import { 
  PlaywrightEmbeddingProvider, 
  createPlaywrightEmbeddingContext,
  PLAYWRIGHT_EMBEDDING_DEFAULTS,
  createPlaywrightEmbeddingProvider
} from '../playwright-embedding';
import { PlaywrightFailureMetadata } from '../playwright-adapter';

// Mock base embedding provider
const mockBaseProvider: EmbeddingProvider = {
  embedContent: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
};

// Test data
const sampleFailure: TestFailure = {
  id: 'test-failure-1',
  testId: 'test-1',
  testTitle: 'should load dashboard within timeout',
  errorMessage: 'Timeout 30000ms exceeded. Waiting for selector "div.dashboard-loaded" failed',
  timestamp: new Date().toISOString(),
  metadata: {
    projectName: 'chromium',
    filePath: 'pages/DashboardPage.ts',
    lineNumber: '45',
    locator: 'div.dashboard-loaded',
    timeoutMs: 30000,
    errorSnippets: ['await this.page.waitForSelector("div.dashboard-loaded", { timeout: 30000 });']
  } as PlaywrightFailureMetadata
};

const assertionFailure: TestFailure = {
  id: 'test-failure-2',
  testId: 'test-2',
  testTitle: 'should show correct item count',
  errorMessage: 'Expect 5 === 4',
  timestamp: new Date().toISOString(),
  metadata: {
    projectName: 'firefox',
    filePath: 'pages/CartPage.ts',
    lineNumber: '123',
    matcher: 'toHaveText',
    expectedValue: '5',
    actualValue: '4',
    locator: 'this.itemCount',
    errorSnippets: ['await expect(this.itemCount).toHaveText("5");']
  } as PlaywrightFailureMetadata
};

describe('PlaywrightEmbeddingProvider', () => {
  let provider: PlaywrightEmbeddingProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PlaywrightEmbeddingProvider(mockBaseProvider);
  });

  describe('constructor', () => {
    it('should initialize with default configuration when no config is provided', () => {
      const provider = new PlaywrightEmbeddingProvider(mockBaseProvider);
      
      // Access private property for testing
      const config = (provider as any).config;
      
      expect(config.selectors.weight).toBe(PLAYWRIGHT_EMBEDDING_DEFAULTS.selectors!.weight);
      expect(config.timeouts.weight).toBe(PLAYWRIGHT_EMBEDDING_DEFAULTS.timeouts!.weight);
      expect(config.assertions.weight).toBe(PLAYWRIGHT_EMBEDDING_DEFAULTS.assertions!.weight);
    });

    it('should override default configuration with provided values', () => {
      const provider = new PlaywrightEmbeddingProvider(mockBaseProvider, {
        selectors: { weight: 3.0 },
        timeouts: { weight: 2.5 },
        assertions: { weight: 1.0 }
      });
      
      // Access private property for testing
      const config = (provider as any).config;
      
      expect(config.selectors.weight).toBe(3.0);
      expect(config.timeouts.weight).toBe(2.5);
      expect(config.assertions.weight).toBe(1.0);
    });

    it('should partially override default configuration', () => {
      const provider = new PlaywrightEmbeddingProvider(mockBaseProvider, {
        selectors: { weight: 3.0 }
        // Other configs not specified
      });
      
      // Access private property for testing
      const config = (provider as any).config;
      
      expect(config.selectors.weight).toBe(3.0);
      expect(config.timeouts.weight).toBe(PLAYWRIGHT_EMBEDDING_DEFAULTS.timeouts!.weight);
      expect(config.assertions.weight).toBe(PLAYWRIGHT_EMBEDDING_DEFAULTS.assertions!.weight);
    });
  });

  describe('embedContent', () => {
    it('should delegate to the base provider', async () => {
      const content = 'Test content';
      await provider.embedContent(content);
      
      expect(mockBaseProvider.embedContent).toHaveBeenCalledWith(content);
    });
  });

  describe('embedBatch', () => {
    it('should delegate to the base provider', async () => {
      const contents = ['Content 1', 'Content 2'];
      await provider.embedBatch(contents);
      
      expect(mockBaseProvider.embedBatch).toHaveBeenCalledWith(contents);
    });
  });

  describe('embedPlaywrightFailures', () => {
    it('should process failures and delegate to embedBatch', async () => {
      const failures = [sampleFailure, assertionFailure];
      await provider.embedPlaywrightFailures(failures);
      
      // Verify that embedBatch is called with properly formatted contexts
      expect(mockBaseProvider.embedBatch).toHaveBeenCalled();
      
      // Verify the call arguments contain the expected contexts
      const callArguments = mockBaseProvider.embedBatch.mock.calls[0][0];
      expect(callArguments).toHaveLength(2);
      
      // Check that contexts include relevant failure details
      expect(callArguments[0]).toContain('Test: should load dashboard within timeout');
      expect(callArguments[0]).toContain('Selector: div.dashboard-loaded');
      expect(callArguments[0]).toContain('Timeout: 30000ms');
      
      expect(callArguments[1]).toContain('Test: should show correct item count');
      expect(callArguments[1]).toContain('Matcher: toHaveText');
      expect(callArguments[1]).toContain('Expected: "5"');
      expect(callArguments[1]).toContain('Actual: "4"');
    });
  });
});

describe('createPlaywrightEmbeddingContext', () => {
  it('should create a rich context for timeout failures', () => {
    const context = createPlaywrightEmbeddingContext(sampleFailure);
    
    // Check basic content
    expect(context).toContain('Test: should load dashboard within timeout');
    expect(context).toContain('Project: chromium');
    expect(context).toContain('Location: pages/DashboardPage.ts:45');
    expect(context).toContain('Error: Timeout 30000ms exceeded');
    
    // Check Playwright-specific content
    expect(context).toContain('Selector: div.dashboard-loaded');
    expect(context).toContain('Timeout: 30000ms');
    expect(context).toContain('await this.page.waitForSelector("div.dashboard-loaded", { timeout: 30000 });');
    
    // Check that selector appears multiple times due to weight
    const selectorMatches = context.match(/Selector: div\.dashboard-loaded/g);
    expect(selectorMatches).toHaveLength(2); // Default weight is 2.0
    
    // Check that timeout appears multiple times due to weight
    const timeoutMatches = context.match(/Timeout: 30000ms/g);
    expect(timeoutMatches).toHaveLength(2); // Default weight is 1.5, rounded to 2
  });
  
  it('should create a rich context for assertion failures', () => {
    const context = createPlaywrightEmbeddingContext(assertionFailure);
    
    // Check basic content
    expect(context).toContain('Test: should show correct item count');
    expect(context).toContain('Project: firefox');
    expect(context).toContain('Location: pages/CartPage.ts:123');
    expect(context).toContain('Error: Expect 5 === 4');
    
    // Check Playwright-specific content
    expect(context).toContain('Selector: this.itemCount');
    expect(context).toContain('Matcher: toHaveText');
    expect(context).toContain('Expected: "5"');
    expect(context).toContain('Actual: "4"');
    expect(context).toContain('await expect(this.itemCount).toHaveText("5");');
    
    // Check that matcher appears multiple times due to weight
    const matcherMatches = context.match(/Matcher: toHaveText/g);
    expect(matcherMatches).toHaveLength(2); // Default weight is 1.8, rounded to 2
  });
  
  it('should respect custom weighting configuration', () => {
    const context = createPlaywrightEmbeddingContext(sampleFailure, {
      dimensions: 768,
      modelName: 'default',
      selectors: { weight: 3.0 },
      timeouts: { weight: 2.0 },
      assertions: { weight: 1.0 }
    });
    
    // Check that selector appears multiple times based on custom weight
    const selectorMatches = context.match(/Selector: div\.dashboard-loaded/g);
    expect(selectorMatches).toHaveLength(3); // Custom weight is 3.0
    
    // Check that timeout appears multiple times based on custom weight
    const timeoutMatches = context.match(/Timeout: 30000ms/g);
    expect(timeoutMatches).toHaveLength(2); // Custom weight is 2.0
  });

  it('should handle minimal metadata correctly', () => {
    const minimalFailure: TestFailure = {
      id: 'minimal-failure',
      testId: 'test-3',
      testTitle: 'minimal test',
      errorMessage: 'Something went wrong',
      timestamp: new Date().toISOString(),
      metadata: {
        projectName: 'webkit'
      } as PlaywrightFailureMetadata
    };
    
    const context = createPlaywrightEmbeddingContext(minimalFailure);
    
    // Check basic content
    expect(context).toContain('Test: minimal test');
    expect(context).toContain('Project: webkit');
    expect(context).toContain('Error: Something went wrong');
    
    // Should not include undefined or empty fields
    expect(context).not.toContain('Location:');
    expect(context).not.toContain('Selector:');
    expect(context).not.toContain('Matcher:');
    expect(context).not.toContain('Expected:');
    expect(context).not.toContain('Actual:');
    expect(context).not.toContain('Timeout:');
  });
});

describe('createPlaywrightEmbeddingProvider', () => {
  it('should create a new PlaywrightEmbeddingProvider instance', () => {
    const provider = createPlaywrightEmbeddingProvider(mockBaseProvider);
    
    expect(provider).toBeInstanceOf(PlaywrightEmbeddingProvider);
  });
  
  it('should pass config to the provider constructor', () => {
    const config = {
      selectors: { weight: 3.0 },
      timeouts: { weight: 2.5 }
    };
    
    const provider = createPlaywrightEmbeddingProvider(mockBaseProvider, config);
    
    // Access private property for testing
    const providerConfig = (provider as any).config;
    
    expect(providerConfig.selectors.weight).toBe(3.0);
    expect(providerConfig.timeouts.weight).toBe(2.5);
  });
});