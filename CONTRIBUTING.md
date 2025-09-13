# Contributing to Flakiness Detective

Thank you for your interest in contributing to Flakiness Detective! This document provides guidelines and instructions for contributing to the project.

## Development Setup

This project uses PNPM as the package manager and Turborepo for monorepo management.

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [PNPM](https://pnpm.io/) v8 or higher

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/flakiness-detective.git
   cd flakiness-detective
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

## Development Workflow

### Common Tasks

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm -r test:watch

# Lint code
pnpm lint

# Format code
pnpm format

# Run demo application
pnpm --filter @flakiness-detective/demo dev
```

### Workspace Commands

Working on a specific package:

```bash
# Run commands for a specific package
pnpm --filter @flakiness-detective/core [command]

# Examples:
pnpm --filter @flakiness-detective/core build
pnpm --filter @flakiness-detective/core test
```

## Project Structure

```
flakiness-detective/
├── packages/
│   ├── core/             # Core algorithms and interfaces
│   ├── adapters/         # Data source adapters
│   ├── visualization/    # Visualization components
│   └── demo/             # Demo application
├── examples/             # Example implementations
└── docs/                 # Documentation
```

## Technology Stack

- **Package Manager**: PNPM
- **Monorepo Management**: Turborepo
- **Linting & Formatting**: Biome
- **Testing**: Vitest
- **Language**: TypeScript

## Pull Request Process

1. Create a new branch for your feature or bug fix
2. Make your changes
3. Run tests to ensure everything works: `pnpm test`
4. Run linting and formatting: `pnpm lint && pnpm format`
5. Commit your changes
6. Open a pull request

## Code Style

This project uses [Biome](https://biomejs.dev/) for code linting and formatting.

Run before committing:
```bash
pnpm lint  # Check for linting issues
pnpm format  # Format code
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm -r test:watch

# Run tests with coverage
pnpm -r test -- --coverage
```