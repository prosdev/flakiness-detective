# Test Dashboard Integration

This guide explains how to use Flakiness Detective as a drop-in replacement for a custom flakiness detection implementation in your test dashboard.

## Overview

The Flakiness Detective provides a maintainable and configurable solution for detecting flaky tests using AI-powered analysis. It can be easily integrated with existing test dashboards that use Firestore for storing test results.

## Compatibility

The Flakiness Detective is designed to work with Firestore-based test dashboards:

- **Data Structure**: Configurable to match your existing Firestore collections
- **Configuration**: Flexible options to match your current implementation
- **Functionality**: Provides enhanced flakiness detection with AI-powered analysis

## Setup

### 1. Install Flakiness Detective

```bash
# In your dashboard project
npm install @flakiness-detective/adapters @flakiness-detective/core
```

### 2. Configure Environment Variables

Ensure you have the required environment variables:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json

# Google AI API
GOOGLE_API_KEY=your-google-api-key
```

### 3. Implementation Example

Here's an example implementation that can be adapted to your project:

```typescript
// flakiness-detective.ts

import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { createGoogleCloudDetective } from '@flakiness-detective/adapters';

// Load environment variables from .env file if it exists
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these environment variables or create a .env file');
  process.exit(1);
}

/**
 * Main execution function to detect flaky tests
 */
export async function runFlakinessDetective(windowDays = 7): Promise<void> {
  // Create detective with dashboard-compatible configuration
  const detective = createGoogleCloudDetective({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    apiKey: process.env.GOOGLE_API_KEY || '',
    storage: {
      // Match your existing collection names
      failuresCollection: 'individual_test_runs',
      clustersCollection: 'flaky_clusters'
    },
    // Time window in days
    timeWindow: { days: windowDays }
  });

  try {
    // Run the detection process
    const clusters = await detective.detect();
    console.log(`✅ Found ${clusters.length} flaky test clusters`);
  } catch (error) {
    console.error('❌ Error detecting flaky tests:', error);
    throw error;
  }
}

// If the script is executed directly, run with default windowDays
if (require.main === module) {
  runFlakinessDetective().catch(err => {
    console.error('Flakiness Detective error:', err);
    process.exit(1);
  });
}
```

## Configuration Options

You can customize the detective with these options:

```typescript
createGoogleCloudDetective({
  // Required
  projectId: string,
  apiKey: string,
  
  // Storage options
  storage: {
    failuresCollection: string,     // Name of your test failures collection
    clustersCollection: string,     // Name of your flaky clusters collection
  },
  
  // Time window
  timeWindow: { 
    days: number                    // Number of days to analyze
  },
  
  // Clustering options
  clustering: {
    epsilon: number,                // Cluster proximity (default: 0.3)
    minPoints: number,              // Min points to form cluster (default: 2)
    minClusterSize: number          // Min cluster size to report (default: 3)
  }
});
```

## Advantages

The Flakiness Detective library offers several advantages:

1. **Maintainability**: Standalone library with proper tests and documentation
2. **Flexibility**: Configurable for different use cases and projects
3. **Performance**: Optimized clustering and pattern detection algorithms
4. **Extensibility**: Modular architecture allows for custom adapters and embedding providers
5. **Updates**: Receives regular updates and improvements

## Automated Execution

You can set up automated execution with a script in your package.json:

```json
{
  "scripts": {
    "detect-flaky": "ts-node path/to/flakiness-detective.ts"
  }
}
```

Then run it as needed:

```bash
npm run detect-flaky
```

## Dashboard Integration

The flaky clusters will be stored in your specified Firestore collection with a consistent format, making it easy to display the results in your dashboard.

## Troubleshooting

If you encounter issues with the integration:

1. **Check Environment Variables**: Ensure all required variables are set correctly
2. **Check Authentication**: Verify Firebase authentication is working
3. **Check Collection Names**: Ensure the collection names match your Firestore database
4. **Check Logs**: Look for detailed error messages in the console output
5. **Open an Issue**: If problems persist, open an issue on the Flakiness Detective GitHub repository