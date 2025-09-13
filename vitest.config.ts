import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Global test setup
    globals: true,
    
    // Set a longer timeout for tests (some integration tests might need more time)
    testTimeout: 10000,
    
    // Setup monorepo-specific test configuration by explicitly including only the tests we want
    include: [
      // Core package tests
      'packages/core/src/**/*.test.ts',
      // Simplified test no longer needed since the main test file is fixed
      // Re-include the fixed test file
      'packages/core/src/flakiness-detective.test.ts',
      
      // Adapters package tests - include only the stable tests
      'packages/adapters/src/embedding/__tests__/google-genai-provider.test.ts',
      'packages/adapters/src/firestore/__tests__/firestore-adapter.test.ts',
      'packages/adapters/src/generic-db/memory-adapter.test.ts',
      'packages/adapters/src/integrations/__tests__/google-integration.test.ts',
      'packages/adapters/src/playwright/__tests__/playwright-adapter.test.ts',
      'packages/adapters/src/playwright/__tests__/playwright-embedding.test.ts',
      'packages/adapters/src/playwright/__tests__/playwright-detective.test.ts',
    ],
    
    // Exclude only node_modules
    exclude: [
      '**/node_modules/**',
    ],
    
    // Keep the watch mode off for CI runs
    watch: false,
    
    // Allow for better output in test failures
    reporters: ['verbose'],
    
    // Setup environment
    environment: 'node',
    
    // For cleaner stack traces
    clearMocks: true,
    restoreMocks: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'packages/*/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/node_modules/**',
        'packages/demo/**',
        'packages/visualization/**'
      ]
    },
  },
  
  // Monorepo path resolution
  resolve: {
    alias: {
      '@flakiness-detective/core': resolve(__dirname, 'packages/core/src'),
      '@flakiness-detective/adapters': resolve(__dirname, 'packages/adapters/src'),
    },
  },
});