import { EmbeddingProvider, EmbeddingConfig, TestFailure, TestFailureMetadata } from '@flakiness-detective/core';
import { PlaywrightFailureMetadata } from './playwright-adapter';

/**
 * Configuration for Playwright-specific embedding
 */
export interface PlaywrightEmbeddingConfig extends EmbeddingConfig {
  // Playwright-specific weighting for embeddings
  selectors?: {
    weight: number;  // How much importance to give selectors (default: 2.0)
  };
  timeouts?: {
    weight: number;  // How much importance to give timeouts (default: 1.5)
  };
  assertions?: {
    weight: number;  // How much importance to give assertions (default: 1.8)
  };
}

/**
 * Default configuration values optimized for Playwright
 */
export const PLAYWRIGHT_EMBEDDING_DEFAULTS: PlaywrightEmbeddingConfig = {
  dimensions: 768,
  modelName: 'default',
  selectors: {
    weight: 2.0,  // Emphasize selectors as they're common flakiness sources
  },
  timeouts: {
    weight: 1.5,  // Emphasize timeouts as they're common flakiness sources
  },
  assertions: {
    weight: 1.8,  // Emphasize assertion patterns
  }
};

/**
 * Creates a rich context string from a Playwright test failure for embedding
 * Optimized for Playwright-specific details
 * 
 * @param failure The test failure to process
 * @param config Embedding configuration
 * @returns Formatted string for embedding
 */
export function createPlaywrightEmbeddingContext(
  failure: TestFailure,
  config: PlaywrightEmbeddingConfig = PLAYWRIGHT_EMBEDDING_DEFAULTS
): string {
  // Start with the standard context elements
  const contextElements: string[] = [
    `Test: ${failure.testTitle}`,
  ];
  
  // Add metadata elements if available
  const metadata = failure.metadata as PlaywrightFailureMetadata;
  
  // Add project information
  if (metadata.projectName) {
    contextElements.push(`Project: ${metadata.projectName}`);
  }
  
  // Add test path/suite if available
  if (metadata.testPath && Array.isArray(metadata.testPath)) {
    contextElements.push(`Suite: ${metadata.testPath.join(' > ')}`);
  }
  
  // Add file location with emphasis
  if (metadata.filePath && metadata.lineNumber) {
    contextElements.push(`Location: ${metadata.filePath}:${metadata.lineNumber}`);
  }
  
  // Add Playwright-specific details with configurable weighting
  
  // Selectors (with extra weight)
  if (metadata.selector || metadata.locator) {
    const selector = metadata.selector || metadata.locator;
    const weight = config.selectors?.weight || 1.0;
    
    // Repeat important elements based on weight for emphasis
    const repeats = Math.max(1, Math.round(weight));
    for (let i = 0; i < repeats; i++) {
      contextElements.push(`Selector: ${selector}`);
    }
  }
  
  // Matchers/assertions (with extra weight)
  if (metadata.matcher) {
    const weight = config.assertions?.weight || 1.0;
    const repeats = Math.max(1, Math.round(weight));
    for (let i = 0; i < repeats; i++) {
      contextElements.push(`Matcher: ${metadata.matcher}`);
    }
  }
  
  // Expected/actual values
  if (metadata.expectedValue) {
    contextElements.push(`Expected: "${metadata.expectedValue}"`);
  }
  
  if (metadata.actualValue) {
    contextElements.push(`Actual: "${metadata.actualValue}"`);
  }
  
  // Timeouts (with extra weight)
  if (metadata.timeoutMs) {
    const weight = config.timeouts?.weight || 1.0;
    const repeats = Math.max(1, Math.round(weight));
    for (let i = 0; i < repeats; i++) {
      contextElements.push(`Timeout: ${metadata.timeoutMs}ms`);
    }
  }
  
  // Add code snippets if available
  if (metadata.errorSnippets && metadata.errorSnippets.length > 0) {
    contextElements.push(`Code:\n${metadata.errorSnippets.join('\n')}`);
  }
  
  // Add error message
  contextElements.push(`Error: ${failure.errorMessage}`);
  
  // Join all elements with double newlines
  return contextElements.filter(Boolean).join('\n\n');
}

/**
 * Wraps an existing embedding provider with Playwright-specific context creation
 */
export class PlaywrightEmbeddingProvider implements EmbeddingProvider {
  private baseProvider: EmbeddingProvider;
  private config: PlaywrightEmbeddingConfig;
  
  /**
   * Create a new Playwright-specific embedding provider
   * 
   * @param baseProvider The underlying embedding provider to use
   * @param config Playwright-specific configuration
   */
  constructor(
    baseProvider: EmbeddingProvider,
    config: Partial<PlaywrightEmbeddingConfig> = {}
  ) {
    this.baseProvider = baseProvider;
    this.config = {
      ...PLAYWRIGHT_EMBEDDING_DEFAULTS,
      ...config,
      selectors: {
        weight: config.selectors?.weight ?? PLAYWRIGHT_EMBEDDING_DEFAULTS.selectors!.weight
      },
      timeouts: {
        weight: config.timeouts?.weight ?? PLAYWRIGHT_EMBEDDING_DEFAULTS.timeouts!.weight
      },
      assertions: {
        weight: config.assertions?.weight ?? PLAYWRIGHT_EMBEDDING_DEFAULTS.assertions!.weight
      }
    };
  }
  
  /**
   * Generate embeddings for text content with Playwright-specific processing
   * 
   * @param content The text content to embed
   * @returns A vector representation of the content
   */
  async embedContent(content: string): Promise<number[]> {
    // Delegate to the base provider
    return this.baseProvider.embedContent(content);
  }
  
  /**
   * Generate embeddings for test failures with Playwright-specific context
   * 
   * @param failures Array of test failures
   * @returns Array of vector representations
   */
  async embedPlaywrightFailures(failures: TestFailure[]): Promise<number[][]> {
    // Create Playwright-optimized embedding contexts
    const contexts = failures.map(failure => 
      createPlaywrightEmbeddingContext(failure, this.config)
    );
    
    // Delegate to the batch embedding method
    return this.embedBatch(contexts);
  }
  
  /**
   * Generate embeddings for multiple text contents in batch
   * 
   * @param contents Array of text contents to embed
   * @returns Array of vector representations
   */
  async embedBatch(contents: string[]): Promise<number[][]> {
    // Delegate to the base provider
    return this.baseProvider.embedBatch(contents);
  }
}

/**
 * Create a Playwright-specific embedding provider wrapping an existing provider
 * 
 * @param baseProvider The underlying embedding provider to use
 * @param config Playwright-specific configuration
 * @returns A configured Playwright embedding provider
 */
export function createPlaywrightEmbeddingProvider(
  baseProvider: EmbeddingProvider,
  config?: Partial<PlaywrightEmbeddingConfig>
): PlaywrightEmbeddingProvider {
  return new PlaywrightEmbeddingProvider(baseProvider, config);
}