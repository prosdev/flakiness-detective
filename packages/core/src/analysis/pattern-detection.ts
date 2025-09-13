import { TestFailure, TestFailureMetadata } from '../types';

/**
 * Extracts structured data from error messages
 * 
 * @param failure Raw test failure data
 * @returns Enhanced test failure with extracted metadata
 */
export function extractPatterns(failure: TestFailure): TestFailure {
  const { errorMessage } = failure;
  const metadata: TestFailureMetadata = { ...failure.metadata };
  
  // Parse rich error context if not already available
  if (!metadata.errorSnippets || !metadata.lineNumber || !metadata.filePath) {
    const extractedData = extractFromErrorMessage(errorMessage);
    
    metadata.errorSnippets = metadata.errorSnippets || extractedData.errorSnippets;
    metadata.lineNumber = metadata.lineNumber || extractedData.lineNumber;
    metadata.filePath = metadata.filePath || extractedData.filePath;
  }
  
  // Extract test framework details if not already available
  if (!metadata.locator || !metadata.matcher || !metadata.actualValue || !metadata.expectedValue) {
    const frameworkData = extractFrameworkDetails(errorMessage, metadata.errorSnippets || []);
    
    metadata.locator = metadata.locator || frameworkData.locator;
    metadata.matcher = metadata.matcher || frameworkData.matcher;
    metadata.actualValue = metadata.actualValue || frameworkData.actualValue;
    metadata.expectedValue = metadata.expectedValue || frameworkData.expectedValue;
    metadata.timeoutMs = metadata.timeoutMs || frameworkData.timeoutMs;
  }
  
  return {
    ...failure,
    metadata
  };
}

/**
 * Extracts file paths, line numbers, and code snippets from error messages
 */
function extractFromErrorMessage(message: string): {
  errorSnippets: string[];
  lineNumber?: string;
  filePath?: string;
} {
  const errorSnippets: string[] = [];
  let lineNumber: string | undefined;
  let filePath: string | undefined;
  
  // Split message into lines for analysis
  const lines = message.split('\n');
  
  // Extract code snippets (lines with ">" at the beginning)
  const codeSnippets = lines.filter(line => line.trim().startsWith('>'));
  if (codeSnippets.length > 0) {
    errorSnippets.push(...codeSnippets);
  }
  
  // Look for file paths and line numbers
  // Pattern like "at path/to/file.ts:123" or "at path/to/file.ts line 123"
  for (const line of lines) {
    // Match file paths ending with common extensions
    const fileLineMatch = line.match(/at\s+([^\s:()]+\.(js|ts|jsx|tsx|vue|py|java|rb)):(\d+)/i);
    if (fileLineMatch) {
      filePath = fileLineMatch[1];
      lineNumber = fileLineMatch[3];
      break;
    }
    
    // Alternative format with "line" keyword
    const altMatch = line.match(/at\s+([^\s:()]+\.(js|ts|jsx|tsx|vue|py|java|rb))\s+line\s+(\d+)/i);
    if (altMatch) {
      filePath = altMatch[1];
      lineNumber = altMatch[3];
      break;
    }
  }
  
  return {
    errorSnippets,
    lineNumber,
    filePath
  };
}

/**
 * Extracts test framework specific details from error messages and code snippets
 */
function extractFrameworkDetails(message: string, snippets: string[]): {
  locator?: string;
  matcher?: string;
  actualValue?: string;
  expectedValue?: string;
  timeoutMs?: number;
} {
  let locator: string | undefined;
  let matcher: string | undefined;
  let actualValue: string | undefined;
  let expectedValue: string | undefined;
  let timeoutMs: number | undefined;
  
  // Extract timeout from message if present
  const timeoutMatch = message.match(/Timed out\s+(\d+)ms/i);
  if (timeoutMatch) {
    timeoutMs = parseInt(timeoutMatch[1], 10);
  }
  
  // Look for expected/actual values in message
  const expectedMatch = message.match(/Expected:?\s+['"]([^'"]+)['"]/i);
  if (expectedMatch) {
    expectedValue = expectedMatch[1];
  }
  
  const actualMatch = message.match(/Actual:?\s+['"]([^'"]+)['"]/i);
  if (actualMatch) {
    actualValue = actualMatch[1];
  }
  
  // Extract from code snippets
  for (const snippet of snippets) {
    // Look for assertion patterns in code snippets
    if (snippet.includes('expect(') && snippet.includes(').')) {
      // Extract locator from expect pattern
      const locatorMatch = snippet.match(/expect\(\s*(?:this\.)?(\w+)\s*\)/);
      if (locatorMatch) {
        locator = locatorMatch[1];
      }
      
      // Extract matcher
      const matcherMatch = snippet.match(/\)\s*\.(\w+)\(/);
      if (matcherMatch) {
        matcher = matcherMatch[1];
      }
      
      // Extract expected value from matcher arguments
      const snippetExpectedMatch = snippet.match(/\.\w+\(\s*['"]([^'"]+)['"]\s*\)/);
      if (snippetExpectedMatch) {
        expectedValue = snippetExpectedMatch[1];
      }
      
      // Extract timeout from options
      const snippetTimeoutMatch = snippet.match(/timeout:\s*(\d+)/);
      if (snippetTimeoutMatch) {
        timeoutMs = parseInt(snippetTimeoutMatch[1], 10);
      }
    }
  }
  
  return {
    locator,
    matcher,
    actualValue,
    expectedValue,
    timeoutMs
  };
}