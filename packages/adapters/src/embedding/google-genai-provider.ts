import { EmbeddingProvider, EmbeddingConfig } from "@flakiness-detective/core";

/**
 * Interface for the Google Generative AI client
 */
interface GoogleGenerativeAI {
  getGenerativeModel: (opts: { model: string }) => GoogleGenerativeModel;
}

/**
 * Interface for the Google Generative Model
 */
interface GoogleGenerativeModel {
  embedContent: (content: string, opts: any) => Promise<GoogleEmbedResult>;
}

/**
 * Interface for the Google Embedding Result
 */
interface GoogleEmbedResult {
  embedding: {
    values: number[];
  };
}

/**
 * Configuration for Google Generative AI embedding provider
 */
export interface GoogleGenAIConfig extends EmbeddingConfig {
  /** API key for Google AI */
  apiKey: string;

  /** Model name to use (default: 'embedding-001') */
  modelName?: string;

  /** Task type for embedding (default: 'SEMANTIC_SIMILARITY') */
  taskType?: "SEMANTIC_SIMILARITY" | "CLASSIFICATION" | "CLUSTERING";

  /** Dimensions for embedding vectors */
  dimensions?: number;

  /** Custom instance of the Google Generative AI client */
  genAIInstance?: GoogleGenerativeAI;
}

/**
 * Default configuration values
 */
export const GOOGLE_GENAI_DEFAULTS = {
  modelName: "embedding-001",
  taskType: "CLUSTERING",
  dimensions: 768 // Default for embedding-001 model
} as const;

/**
 * Implementation of EmbeddingProvider using Google's Generative AI
 *
 * Requires @google/generative-ai as a peer dependency
 */
export class GoogleGenAIProvider implements EmbeddingProvider {
  private genAI: GoogleGenerativeAI;
  private model: GoogleGenerativeModel;
  private config: GoogleGenAIConfig;

  /**
   * Create a new Google GenAI embedding provider
   *
   * @param config Configuration options
   */
  constructor(config: GoogleGenAIConfig) {
    this.config = {
      ...GOOGLE_GENAI_DEFAULTS,
      ...config,
    };

    try {
      // Use provided instance or initialize a new one
      if (config.genAIInstance) {
        this.genAI = config.genAIInstance;
      } else {
        // Use dynamic import to avoid bundling @google/generative-ai
        // This allows the library to be used without @google/generative-ai
        // if using a different embedding provider
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      }

      // Initialize the model
      this.model = this.genAI.getGenerativeModel({
        model: this.config.modelName || 'embedding-001',
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize Google Generative AI: ${error}\nMake sure @google/generative-ai is installed: npm install @google/generative-ai`
      );
    }
  }

  /**
   * Generate embeddings for text content
   *
   * @param content The text content to embed
   * @returns A vector representation of the content
   */
  async embedContent(content: string): Promise<number[]> {
    try {
      // @ts-ignore - Google API expects a proper taskType
      const result = await this.model.embedContent(content, {
        taskType: this.config.taskType || 'CLUSTERING'
      });

      // Extract and return embedding values
      const embedding = await result.embedding;
      return embedding.values || [];
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple text contents in batch
   *
   * @param contents Array of text contents to embed
   * @returns Array of vector representations
   */
  async embedBatch(contents: string[]): Promise<number[][]> {
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const results: number[][] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchPromises = batch.map((content) => this.embedContent(content));

      // Wait for all embeddings in this batch
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < contents.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

/**
 * Create a new Google GenAI embedding provider with the specified configuration
 *
 * @param config Configuration options
 * @returns Configured Google GenAI embedding provider
 */
export function createGoogleGenAIProvider(
  config: GoogleGenAIConfig
): GoogleGenAIProvider {
  return new GoogleGenAIProvider(config);
}
