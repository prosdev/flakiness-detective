import { describe, it, expect } from 'vitest';
import { extractPatterns } from './pattern-detection';
import { TestFailure } from '../types';

describe('pattern-detection', () => {
  describe('extractPatterns', () => {
    it('should extract error snippets from error message', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\n> expect(received).toBe(expected)\n> at Object.<anonymous> (test.spec.ts:42:3)',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.errorSnippets).toEqual([
        '> expect(received).toBe(expected)', 
        '> at Object.<anonymous> (test.spec.ts:42:3)'
      ]);
    });

    it('should extract file path and line number from error message', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\nat test.spec.ts:42:3',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.filePath).toBe('test.spec.ts');
      expect(result.metadata.lineNumber).toBe('42');
    });

    it('should extract file path and line number with alternative format', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\nat test.spec.ts line 42',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.filePath).toBe('test.spec.ts');
      expect(result.metadata.lineNumber).toBe('42');
    });

    it('should extract locator and matcher from error message with code snippets', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\n> expect(element).toBeVisible()',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.locator).toBe('element');
      expect(result.metadata.matcher).toBe('toBeVisible');
    });

    it('should extract expected and actual values from error message', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\nExpected: "foo"\nActual: "bar"',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.expectedValue).toBe('foo');
      expect(result.metadata.actualValue).toBe('bar');
    });

    it('should extract timeout from error message', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Timed out 5000ms waiting for element',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.timeoutMs).toBe(5000);
    });

    it('should extract timeout from code snippet with options', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\n> expect(element).toBeVisible({ timeout: 5000 })',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.timeoutMs).toBe(5000);
    });

    it('should preserve existing metadata fields', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed\n> expect(element).toBeVisible()',
        timestamp: new Date().toISOString(),
        metadata: {
          projectName: 'My Project',
          suite: 'My Suite',
          filePath: 'existing-path.ts',
          lineNumber: '24',
          locator: 'existingLocator',
          matcher: 'existingMatcher'
        }
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.projectName).toBe('My Project');
      expect(result.metadata.suite).toBe('My Suite');
      expect(result.metadata.filePath).toBe('existing-path.ts');
      expect(result.metadata.lineNumber).toBe('24');
      expect(result.metadata.locator).toBe('existingLocator');
      expect(result.metadata.matcher).toBe('existingMatcher');
    });

    it('should handle empty error message', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: '',
        timestamp: new Date().toISOString(),
        metadata: {}
      };

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata.errorSnippets).toEqual([]);
      expect(result.metadata.filePath).toBeUndefined();
      expect(result.metadata.lineNumber).toBeUndefined();
    });

    it('should handle missing metadata', () => {
      // Arrange
      const failure: TestFailure = {
        id: 'failure-1',
        testId: 'test-1',
        testTitle: 'Test that should pass',
        errorMessage: 'Error: Test failed',
        timestamp: new Date().toISOString()
      } as TestFailure;

      // Act
      const result = extractPatterns(failure);

      // Assert
      expect(result.metadata).toBeDefined();
    });
  });
});