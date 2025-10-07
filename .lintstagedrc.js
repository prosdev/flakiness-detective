module.exports = {
  // Simple configuration for manual use with lint-staged if needed
  "**/*.{ts,tsx,js,jsx}": [
    "biome check --apply",
    "biome format --write"
  ]
};