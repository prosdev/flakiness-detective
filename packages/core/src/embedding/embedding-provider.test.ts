import { describe, it, expect } from 'vitest';
import { createRichEmbeddingContext, DEFAULT_EMBEDDING_CONFIG } from './embedding-provider';

describe('embedding-provider', () => {
  describe('createRichEmbeddingContext', () => {
    it('should create a rich context with test title and error message', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage);
      
      // Assert
      expect(richContext).toContain('Test: Test loading dashboard');
      expect(richContext).toContain('Error: Error: Timeout exceeded');
    });
    
    it('should include all metadata fields when available', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        projectName: 'E2E Tests',
        suite: 'Dashboard Tests',
        filePath: 'tests/dashboard.spec.ts',
        lineNumber: '42',
        locator: 'button.submit',
        matcher: 'toBeVisible',
        actualValue: 'hidden',
        expectedValue: 'visible',
        timeoutMs: 5000,
        errorSnippets: ['> expect(button.submit).toBeVisible()']
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).toContain('Test: Test loading dashboard');
      expect(richContext).toContain('Project: E2E Tests');
      expect(richContext).toContain('Suite: Dashboard Tests');
      expect(richContext).toContain('Location: tests/dashboard.spec.ts:42');
      expect(richContext).toContain('Locator: button.submit');
      expect(richContext).toContain('Matcher: toBeVisible');
      expect(richContext).toContain('Actual: "hidden"');
      expect(richContext).toContain('Expected: "visible"');
      expect(richContext).toContain('Timeout: 5000ms');
      expect(richContext).toContain('Code:\n> expect(button.submit).toBeVisible()');
      expect(richContext).toContain('Error: Error: Timeout exceeded');
    });
    
    it('should handle missing metadata fields', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        projectName: 'E2E Tests'
        // All other fields are missing
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).toContain('Test: Test loading dashboard');
      expect(richContext).toContain('Project: E2E Tests');
      expect(richContext).toContain('Error: Error: Timeout exceeded');
      
      // Check for missing fields
      expect(richContext).not.toContain('Suite:');
      expect(richContext).not.toContain('Location:');
      expect(richContext).not.toContain('Locator:');
      expect(richContext).not.toContain('Matcher:');
      expect(richContext).not.toContain('Actual:');
      expect(richContext).not.toContain('Expected:');
      expect(richContext).not.toContain('Timeout:');
      expect(richContext).not.toContain('Code:');
    });
    
    it('should handle empty metadata', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {};
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).toContain('Test: Test loading dashboard');
      expect(richContext).toContain('Error: Error: Timeout exceeded');
      
      // Should only contain title and error
      const lines = richContext.split('\n\n');
      expect(lines).toHaveLength(2);
    });
    
    it('should handle undefined metadata', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, undefined);
      
      // Assert
      expect(richContext).toContain('Test: Test loading dashboard');
      expect(richContext).toContain('Error: Error: Timeout exceeded');
      
      // Should only contain title and error
      const lines = richContext.split('\n\n');
      expect(lines).toHaveLength(2);
    });
    
    it('should format location correctly when both filePath and lineNumber are available', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        filePath: 'tests/dashboard.spec.ts',
        lineNumber: '42'
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).toContain('Location: tests/dashboard.spec.ts:42');
    });
    
    it('should not include location when filePath is missing', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        lineNumber: '42'
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).not.toContain('Location:');
    });
    
    it('should not include location when lineNumber is missing', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        filePath: 'tests/dashboard.spec.ts'
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).not.toContain('Location:');
    });
    
    it('should include multiple error snippets properly formatted', () => {
      // Arrange
      const title = 'Test loading dashboard';
      const errorMessage = 'Error: Timeout exceeded';
      const metadata = {
        errorSnippets: [
          '> expect(button.submit).toBeVisible()',
          '> at Object.<anonymous> (tests/dashboard.spec.ts:42:3)',
          '> at runTest (test-runner.js:24:5)'
        ]
      };
      
      // Act
      const richContext = createRichEmbeddingContext(title, errorMessage, metadata);
      
      // Assert
      expect(richContext).toContain('Code:\n> expect(button.submit).toBeVisible()\n> at Object.<anonymous> (tests/dashboard.spec.ts:42:3)\n> at runTest (test-runner.js:24:5)');
    });
  });
  
  describe('DEFAULT_EMBEDDING_CONFIG', () => {
    it('should have the expected default values', () => {
      expect(DEFAULT_EMBEDDING_CONFIG.dimensions).toBe(768);
      expect(DEFAULT_EMBEDDING_CONFIG.modelName).toBe('default');
    });
  });
});