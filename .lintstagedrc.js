module.exports = {
  // Run Biome and TypeScript type checking on all staged TypeScript and JavaScript files
  "**/*.{ts,tsx}": [
    "biome check --apply", 
    "biome format --write",
    () => "tsc --noEmit"  // Run TypeScript type checking on the entire project
  ],
  "**/*.{js,jsx}": [
    "biome check --apply", 
    "biome format --write"
  ],
};