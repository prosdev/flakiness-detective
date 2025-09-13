# Google Cloud Integration Demo

This demo shows how to use the Google Cloud integration with Flakiness Detective, providing a ready-to-use solution with Firestore and Google's Generative AI.

## Setup

1. Create a `.env` file in the project root with your Google Cloud credentials:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_API_KEY=your-google-ai-api-key
```

2. Install the required dependencies:

```bash
npm install firebase-admin @google/generative-ai dotenv
```

## Running the Demo

```bash
# From the project root
npm run demo:google
```

## Demo Components

This demo showcases three different Google Cloud integration scenarios:

### 1. Basic Google Cloud Integration

Uses `createGoogleCloudDetective` to create a flakiness detective with:
- Firestore for storage
- Google GenAI for embeddings

This is ideal for:
- Teams using Google Cloud
- Projects that need cloud-based storage
- Applications requiring high-quality embeddings

### 2. Google Playwright Integration

Uses `createGooglePlaywrightDetective` to create a Playwright-specific detective with:
- Firestore for storage
- Google GenAI for embeddings
- Playwright-optimized parsing and configuration

This is ideal for:
- Teams using Playwright for testing
- Projects that need specialized Playwright analysis
- Applications requiring both cloud storage and Playwright expertise

### 3. Lytics E2E Dashboard Compatibility

Uses `createLyticsCompatibleDetective` to create a direct replacement for the custom implementation in Lytics E2E Dashboard.

This is ideal for:
- Direct migration from Lytics E2E Dashboard
- Maintaining compatibility with existing systems
- Simplified configuration for Google Cloud

## Integration with Real CI/CD Systems

In a real-world scenario, you would:

1. Set up a pipeline that extracts test results from your CI system
2. Process those results using the appropriate detective
3. Store the results in Firestore
4. Visualize flaky test patterns in a dashboard

For example, with GitHub Actions:

```yaml
jobs:
  flakiness-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run flakiness detection
        run: node scripts/detect-flakiness.js
        env:
          GOOGLE_CLOUD_PROJECT_ID: ${{ secrets.GOOGLE_CLOUD_PROJECT_ID }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

Where `detect-flakiness.js` would use one of the Google integration methods shown in this demo.