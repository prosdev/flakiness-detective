import {
  TestFailure,
  FailureCluster,
  DataAdapter,
} from "@flakiness-detective/core";
import {
  FileSystemAdapter,
  FileSystemAdapterConfig,
} from "../file-system/file-system-adapter";

/**
 * Playwright-specific test failure metadata
 */
export interface PlaywrightFailureMetadata {
  [key: string]: unknown;

  // Test details
  projectName: string;
  testFile: string;
  testTitle: string;
  testPath: string[];

  // Error context
  errorSnippets?: string[];
  lineNumber?: string;
  filePath?: string;
  stackTrace?: string;

  // Playwright-specific assertion details
  locator?: string;
  selector?: string;
  matcher?: string;
  expectedValue?: string;
  actualValue?: string;
  timeoutMs?: number;
}

/**
 * Playwright raw test result from test runner
 */
export interface PlaywrightTestResult {
  testId: string;
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped";
  error?: {
    message?: string;
    stack?: string;
    location?: {
      file?: string;
      line?: number;
      column?: number;
    };
    snippet?: string | string[];
    // Playwright-specific fields
    actual?: string;
    expected?: string;
    matcher?: string;
    locator?: string;
    selector?: string;
    timeout?: number;
  };
  projectName?: string;
  duration?: number;
  retry?: number;
  timestamp?: string;
}

/**
 * Configuration for Playwright adapter
 */
export interface PlaywrightAdapterConfig extends FileSystemAdapterConfig {
  // Optional Playwright-specific options
  extractSelectors?: boolean;
  includeSnippets?: boolean;
  ignoreConsoleErrors?: boolean;
}

/**
 * Specialized DataAdapter for Playwright test failures
 * Extends FileSystemAdapter with Playwright-specific parsing
 */
export class PlaywrightAdapter extends FileSystemAdapter implements DataAdapter {
  private config: PlaywrightAdapterConfig;

  /**
   * Create a new Playwright adapter
   *
   * @param config Configuration options
   */
  constructor(config: PlaywrightAdapterConfig) {
    super(config); // Initialize base adapter
    this.config = {
      extractSelectors: true,
      includeSnippets: true,
      ignoreConsoleErrors: true,
      ...config,
    };
  }

  /**
   * Process Playwright test results into standardized TestFailure objects
   *
   * @param results Playwright test results
   * @returns Processed TestFailure objects
   */
  async processPlaywrightResults(
    results: PlaywrightTestResult[]
  ): Promise<TestFailure[]> {
    // Filter for failed tests
    const failedTests = results.filter(
      (test) => test.status === "failed" || test.status === "timedOut"
    );

    // Process each test failure
    const processedFailures = failedTests.map((test) =>
      this.parsePlaywrightFailure(test)
    );

    // Save to storage
    await this.saveFailures(processedFailures);

    return processedFailures;
  }

  /**
   * Parse a Playwright test failure into a standardized TestFailure
   *
   * @param test Playwright test result
   * @returns Standardized TestFailure
   */
  private parsePlaywrightFailure(test: PlaywrightTestResult): TestFailure {
    const timestamp = test.timestamp || new Date().toISOString();
    const testId = test.testId || `test-${Date.now()}`;
    const error = test.error || {};

    // Extract error details with Playwright-specific parsing
    const metadata = this.extractPlaywrightMetadata(test);

    // Create error message
    const errorMessage = error.message || `Test ${test.status}`;

    return {
      id: `${testId}-${timestamp}`,
      testId,
      testTitle: test.title,
      errorMessage,
      timestamp,
      metadata,
    };
  }

  /**
   * Extract Playwright-specific metadata from a test failure
   *
   * @param test Playwright test result
   * @returns Specialized metadata with Playwright details
   */
  private extractPlaywrightMetadata(
    test: PlaywrightTestResult
  ): PlaywrightFailureMetadata {
    const error = test.error || {};
    const metadata: PlaywrightFailureMetadata = {
      projectName: test.projectName || "unknown",
      testFile: error.location?.file || "",
      testTitle: test.title,
      testPath: test.title.split(" > "),
    };

    // Error context
    if (error.location) {
      metadata.filePath = error.location.file;
      metadata.lineNumber = error.location.line?.toString();
    }

    // Extract code snippets
    if (this.config.includeSnippets && error.snippet) {
      if (typeof error.snippet === "string") {
        metadata.errorSnippets = [error.snippet];
      } else if (Array.isArray(error.snippet)) {
        metadata.errorSnippets = error.snippet;
      }
    }

    // Extract stack trace
    if (error.stack) {
      metadata.stackTrace = error.stack;

      // Try to extract file path and line number from stack trace if not found in location
      if (!metadata.filePath || !metadata.lineNumber) {
        const fileLineMatch = error.stack.match(
          /at\s+([^\s:()]+\.(js|ts|jsx|tsx|vue)):(\d+)/i
        );
        if (fileLineMatch) {
          metadata.filePath = metadata.filePath || fileLineMatch[1];
          metadata.lineNumber = metadata.lineNumber || fileLineMatch[3];
        }
      }
    }

    // Playwright-specific assertion details
    if (error.actual !== undefined) {
      metadata.actualValue = String(error.actual);
    }

    if (error.expected !== undefined) {
      metadata.expectedValue = String(error.expected);
    }

    if (error.locator !== undefined) {
      metadata.locator = String(error.locator);
    }

    if (error.selector !== undefined) {
      metadata.selector = String(error.selector);
    }

    if (error.matcher !== undefined) {
      metadata.matcher = String(error.matcher);
    }

    if (error.timeout !== undefined) {
      metadata.timeoutMs = Number(error.timeout);
    }

    // Extract additional details from the error message
    if (error.message) {
      this.enhanceMetadataFromErrorMessage(error.message, metadata);
    }

    return metadata;
  }

  /**
   * Extract additional metadata from error message text
   *
   * @param message Error message
   * @param metadata Metadata to enhance
   */
  private enhanceMetadataFromErrorMessage(
    message: string,
    metadata: PlaywrightFailureMetadata
  ): void {
    // Extract timeout from message if not already set
    if (!metadata.timeoutMs) {
      const timeoutMatch =
        message.match(/timeout (\d+)ms/i) ||
        message.match(/Timed out (\d+)ms/i);
      if (timeoutMatch) {
        metadata.timeoutMs = parseInt(timeoutMatch[1], 10);
      }
    }

    // Extract selector from message
    if (!metadata.selector) {
      const selectorMatch =
        message.match(/selector ['"]([^'"]+)['"]/i) ||
        message.match(/locator ['"]([^'"]+)['"]/i);
      if (selectorMatch) {
        metadata.selector = selectorMatch[1];
      }
    }

    // Extract expected/actual values if not already set
    if (!metadata.expectedValue) {
      const expectedMatch =
        message.match(/expected:?\s+['"]([^'"]+)['"]/i) ||
        message.match(/expected:?\s+(\S+)/i);
      if (expectedMatch) {
        metadata.expectedValue = expectedMatch[1];
      }
    }

    if (!metadata.actualValue) {
      const actualMatch =
        message.match(/actual:?\s+['"]([^'"]+)['"]/i) ||
        message.match(/actual:?\s+(\S+)/i);
      if (actualMatch) {
        metadata.actualValue = actualMatch[1];
      }
    }

    // Extract assertion type
    if (!metadata.matcher) {
      // Common Playwright assertions
      if (message.includes("to be visible")) metadata.matcher = "toBeVisible";
      else if (message.includes("to be hidden"))
        metadata.matcher = "toBeHidden";
      else if (message.includes("to contain text"))
        metadata.matcher = "toContainText";
      else if (message.includes("to have text"))
        metadata.matcher = "toHaveText";
      else if (message.includes("to have value"))
        metadata.matcher = "toHaveValue";
      else if (message.includes("to be checked"))
        metadata.matcher = "toBeChecked";
      else if (message.includes("to be enabled"))
        metadata.matcher = "toBeEnabled";
      else if (message.includes("to be disabled"))
        metadata.matcher = "toBeDisabled";
    }

    // Extract more file path and line numbers if not found
    if (!metadata.filePath || !metadata.lineNumber) {
      const lines = message.split("\n");
      for (const line of lines) {
        // Look for patterns like "at Page.clickButton (pages/HomePage.ts:45:3)"
        const fileLineMatch = line.match(
          /at.+\((.+\.(js|ts|jsx|tsx|vue)):(\d+)(:\d+)?\)/i
        );
        if (fileLineMatch) {
          metadata.filePath = metadata.filePath || fileLineMatch[1];
          metadata.lineNumber = metadata.lineNumber || fileLineMatch[3];
          break;
        }
      }
    }
  }

  /**
   * Save Playwright test failures to storage
   *
   * @param failures Test failures to save
   */
  async saveFailures(failures: TestFailure[]): Promise<void> {
    // Delegate to parent implementation
    return super.saveFailures(failures);
  }

  /**
   * Enhanced cluster fetching with Playwright-specific sorting and filtering
   *
   * @param limit Maximum number of clusters to fetch
   * @returns Playwright-enhanced failure clusters
   */
  async fetchClusters(limit?: number): Promise<FailureCluster[]> {
    const clusters = await super.fetchClusters(limit);

    // Enhance clusters with Playwright-specific insights
    return clusters.map((cluster) => {
      // Count by failure types to provide more specific insights
      const enhancedCluster = { ...cluster };

      // Add Playwright-specific stats if not present
      if (
        !enhancedCluster.assertionPattern &&
        enhancedCluster.commonMatchers &&
        enhancedCluster.commonMatchers.length > 0
      ) {
        const matcher = enhancedCluster.commonMatchers[0];
        const locator = enhancedCluster.commonLocators?.[0] || "";

        enhancedCluster.assertionPattern = locator
          ? `${matcher} on ${locator}`
          : `${matcher} assertion`;
      }

      return enhancedCluster;
    });
  }
}

/**
 * Create a new Playwright adapter with the specified configuration
 *
 * @param config Configuration options
 * @returns Configured Playwright adapter
 */
export function createPlaywrightAdapter(
  config: PlaywrightAdapterConfig
): PlaywrightAdapter {
  return new PlaywrightAdapter(config);
}
