# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions, create changelogs, and publish to npm.

## Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer) for our packages:

- **Major version (X.0.0)**: Breaking changes
- **Minor version (0.X.0)**: New features (backwards compatible)
- **Patch version (0.0.X)**: Bug fixes and small changes (backwards compatible)

## Creating a changeset

When you make changes that should be released:

1. Run `pnpm changeset` in the project root
2. Select the packages you want to include in the changeset using the spacebar
3. Choose the appropriate bump type for each package:
   - `patch` for bug fixes
   - `minor` for new features
   - `major` for breaking changes
4. Write a summary of the changes (this will appear in the changelog)
5. Commit the generated changeset file

Example:

```bash
pnpm changeset
```

This will create a markdown file in the `.changeset` directory with the information about your change.

## Releasing

Our CI/CD pipeline automates the release process:

1. When PRs with changesets are merged to the main branch, a "Version Packages" PR is automatically created
2. This PR updates package versions and changelogs according to the changesets
3. When this PR is merged, packages are automatically published to npm

### Manual Release (if needed)

If you need to release manually:

1. Run `pnpm version` to apply all changesets and update versions/changelogs
2. Run `pnpm build` to build all packages
3. Run `pnpm publish` to publish the updated packages to npm

## Adding npm Token to GitHub

For the automated publishing to work, you need to add your npm token as a GitHub secret:

1. Create an npm token with publish access:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Click on your profile > Access Tokens > Generate New Token
   - Select the type "Publish"
   - Copy the token

2. Add the token to your GitHub repository:
   - Go to your GitHub repo > Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your npm token
   - Click "Add secret"

## Working with Changesets

### View pending changes

To see what changes are pending release:

```bash
pnpm changeset status
```

### Generate release notes without publishing

To preview release notes:

```bash
pnpm changeset version --no-git-tag
```

This updates the package.json files and changelogs without committing or creating git tags.