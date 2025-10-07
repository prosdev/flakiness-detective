# Flakiness Detective

AI-powered test flakiness detection and analysis tool.

This is the main package that provides an easy way to import all functionality from the flakiness-detective ecosystem.

## Installation

```
npm install flakiness-detective
```

Or using pnpm:

```
pnpm add flakiness-detective
```

## Usage

```typescript
// Import from the main package
import { createFlakinessDetective } from 'flakiness-detective';

// Or import specific modules
import { createPlaywrightFlakinessDetective } from 'flakiness-detective/adapters';
```

## Documentation

For more detailed documentation, see the individual packages:

- [@flakiness-detective/core](https://github.com/prosdev/flakiness-detective/tree/main/packages/core)
- [@flakiness-detective/adapters](https://github.com/prosdev/flakiness-detective/tree/main/packages/adapters)

## License

MIT