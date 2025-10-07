import {
  createFlakinessDetective,
  FlakinessDetective,
  FlakinessDetectiveConfig,
  EmbeddingProvider,
} from "@flakiness-detective/core";
import {
  PlaywrightAdapter,
  PlaywrightAdapterConfig,
  PlaywrightTestResult,
} from "./playwright-adapter";
import {
  PlaywrightEmbeddingProvider,
  PlaywrightEmbeddingConfig,
  PLAYWRIGHT_EMBEDDING_DEFAULTS,
} from "./playwright-embedding";

/**
 * Playwright-specific configuration for Flakiness Detective
 */
export interface PlaywrightDetectiveConfig {
  // Data storage configuration
  storage: Omit<PlaywrightAdapterConfig, "dataDir"> & {
    dataDir: string; // Required: Directory to store test data
  };

  // Embedding configuration
  embedding: Partial<PlaywrightEmbeddingConfig>;

  // General flakiness detective configuration
  clustering?: Partial<FlakinessDetectiveConfig["clustering"]>;
  timeWindow?: Partial<FlakinessDetectiveConfig["timeWindow"]>;
}

/**
 * Default configuration values optimized for Playwright
 */
export const PLAYWRIGHT_DEFAULTS: PlaywrightDetectiveConfig = {
  storage: {
    dataDir: "./playwright-flakiness-data",
    failuresFile: "playwright-failures.json",
    clustersFile: "playwright-clusters.json",
    extractSelectors: true,
    includeSnippets: true,
    ignoreConsoleErrors: true,
  },
  embedding: PLAYWRIGHT_EMBEDDING_DEFAULTS,
  clustering: {
    epsilon: 0.3, // Neighborhood radius - tuned for Playwright error patterns
    minPoints: 2, // Minimum points to form a cluster
    minClusterSize: 2, // Minimum size of a valid cluster - smaller to catch Playwright flakiness early
  },
  timeWindow: {
    days: 7, // Default to 7-day window
  },
};

/**
 * Playwright Flakiness Detective that adds Playwright-specific functionality
 * to the core FlakinessDetective class
 */
export class PlaywrightFlakinessDetective {
  private detective: FlakinessDetective;
  private adapter: PlaywrightAdapter;
  private embeddingProvider: PlaywrightEmbeddingProvider;

  /**
   * Create a new Playwright Flakiness Detective
   *
   * @param detective The core detective instance
   * @param adapter The Playwright adapter instance
   * @param embeddingProvider The Playwright embedding provider
   */
  constructor(
    detective: FlakinessDetective,
    adapter: PlaywrightAdapter,
    embeddingProvider: PlaywrightEmbeddingProvider
  ) {
    this.detective = detective;
    this.adapter = adapter;
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Process Playwright test results and detect flakiness patterns
   *
   * @param results Playwright test results
   * @returns Array of identified failure clusters
   */
  async processResults(results: PlaywrightTestResult[]): Promise<void> {
    // Process results into TestFailure objects
    await this.adapter.processPlaywrightResults(results);

    // Run the detection process
    await this.detective.detect();
  }

  /**
   * Run the flakiness detection process
   *
   * @returns Array of identified failure clusters
   */
  async detect() {
    return this.detective.detect();
  }

  /**
   * Fetch previously identified clusters
   *
   * @param limit Maximum number of clusters to fetch
   * @returns Array of failure clusters
   */
  async getClusters(limit?: number) {
    return this.detective.getClusters(limit);
  }
}

/**
 * Create a Playwright-specific flakiness detective instance with optimized defaults
 *
 * @param baseEmbeddingProvider The underlying embedding provider to use
 * @param config Playwright-specific configuration
 * @returns A configured Playwright flakiness detective
 */
export function createPlaywrightFlakinessDetective(
  baseEmbeddingProvider: EmbeddingProvider,
  config: Partial<PlaywrightDetectiveConfig> = {}
): PlaywrightFlakinessDetective {
  // Merge configs with defaults
  const mergedConfig: PlaywrightDetectiveConfig = {
    storage: {
      ...PLAYWRIGHT_DEFAULTS.storage,
      ...config.storage,
    },
    embedding: {
      ...PLAYWRIGHT_DEFAULTS.embedding,
      ...config.embedding,
    },
    clustering: {
      ...PLAYWRIGHT_DEFAULTS.clustering,
      ...config.clustering,
    },
    timeWindow: {
      ...PLAYWRIGHT_DEFAULTS.timeWindow,
      ...config.timeWindow,
    },
  };

  // Create the Playwright adapter
  const adapter = new PlaywrightAdapter(mergedConfig.storage);

  // Create the Playwright embedding provider
  const embeddingProvider = new PlaywrightEmbeddingProvider(
    baseEmbeddingProvider,
    mergedConfig.embedding
  );

  // Create the core detective with Playwright-optimized configuration
  const detective = createFlakinessDetective(adapter, embeddingProvider, {
    clustering: {
      epsilon:
        mergedConfig.clustering?.epsilon ??
        (PLAYWRIGHT_DEFAULTS.clustering?.epsilon ?? 0.3),
      minPoints:
        mergedConfig.clustering?.minPoints ??
        (PLAYWRIGHT_DEFAULTS.clustering?.minPoints ?? 2),
      minClusterSize:
        mergedConfig.clustering?.minClusterSize ??
        (PLAYWRIGHT_DEFAULTS.clustering?.minClusterSize ?? 2),
    },
    timeWindow: {
      days:
        mergedConfig.timeWindow?.days ?? (PLAYWRIGHT_DEFAULTS.timeWindow?.days ?? 7),
    },
  });

  // Return the Playwright-specific detective
  return new PlaywrightFlakinessDetective(
    detective,
    adapter,
    embeddingProvider
  );
}
