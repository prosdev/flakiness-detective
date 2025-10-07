module.exports = {
  // Run Biome on all staged TypeScript and JavaScript files
  "**/*.{ts,tsx,js,jsx}": ["biome check --apply", "biome format --write"],
};