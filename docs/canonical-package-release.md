# Canonical package release

IvritCode owns the canonical engine and contract packages consumed by Quantum
Etz Chaim:

- `@ivritcode/core`
- `@qec/spec`
- `@qec/core`

Their six internal runtime dependencies are released by the same workflow so a
normal `npm install` has a complete dependency graph. The release script packs
and inspects every artifact before publishing in dependency order.

## npm bootstrap

The `@ivritcode` and `@qec` npm scopes must exist and grant the repository owner
publish access. For each package listed by
`scripts/release-canonical-packages.mjs`, configure npm trusted publishing with:

- provider: GitHub Actions
- repository: `Richardatf/IvritCode`
- workflow: `publish-canonical.yml`
- environment: `npm`

Trusted publishing uses GitHub OIDC rather than a long-lived npm token. The
GitHub `npm` environment is the approval boundary for an actual release.

## Release

Run **Publish canonical packages** from GitHub Actions in `verify` mode first.
After it succeeds, rerun it in `publish` mode and approve the `npm` environment.
Existing versions are detected and skipped, making a partially completed release
safe to resume.

After all packages are visible on npm, Quantum Etz Chaim can remove its
`vendor/ivritcode` submodule and install these exact versions from the registry.
