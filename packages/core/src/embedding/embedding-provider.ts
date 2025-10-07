/**
 * Abstract interface for embedding providers
 * This allows for different AI services to be used for generating embeddings
 */

/**
 * Interface for any embedding provider
 */
export interface EmbeddingProvider {
  /**
   * Generate embeddings for text content
   * 
   * @param content The text content to embed
   * @returns A vector representation of the content
   */
  embedContent(content: string): Promise<number[]>;
  
  /**
   * Generate embeddings for multiple text contents in batch
   * 
   * @param contents Array of text contents to embed
   * @returns Array of vector representations
   */
  embedBatch(contents: string[]): Promise<number[][]>;
}

/**
 * Configuration for embedding providers
 */
export interface EmbeddingConfig {
  dimensions?: number;
  modelName?: string;
  apiKey?: string;
  endpoint?: string;
  // Additional provider-specific options
  [key: string]: unknown;
}

/**
 * Factory function type for creating embedding providers
 */
export type EmbeddingProviderFactory = (config: EmbeddingConfig) => EmbeddingProvider;

/**
 * Default configuration values
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  dimensions: 768,
  modelName: 'default',
};

/**
 * Create a rich context string from a test failure for embedding
 * 
 * @param title Test title
 * @param errorMessage Error message
 * @param metadata Additional metadata
 * @returns Formatted string for embedding
 */
export function createRichEmbeddingContext(
  title: string,
  errorMessage: string,
  metadata: Record<string, unknown> = {}
): string {
  // Create rich context with emphasis on code snippets and file locations
  const richContext = [
    `Test: ${title}`,
    metadata.projectName ? `Project: ${metadata.projectName}` : '',
    metadata.suite ? `Suite: ${metadata.suite}` : '',
    metadata.filePath && metadata.lineNumber
      ? `Location: ${metadata.filePath}:${metadata.lineNumber}`
      : '',
    metadata.locator ? `Locator: ${metadata.locator}` : '',
    metadata.matcher ? `Matcher: ${metadata.matcher}` : '',
    metadata.actualValue ? `Actual: "${metadata.actualValue}"` : '',
    metadata.expectedValue ? `Expected: "${metadata.expectedValue}"` : '',
    metadata.timeoutMs ? `Timeout: ${metadata.timeoutMs}ms` : '',
    Array.isArray(metadata.errorSnippets) && metadata.errorSnippets.length > 0
      ? `Code:\n${(metadata.errorSnippets as string[]).join('\n')}`
      : '',
    `Error: ${errorMessage}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return richContext;
}