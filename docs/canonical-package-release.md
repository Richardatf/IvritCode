# Canonical package release

IvritCode owns the canonical engine and contract packages consumed by Quantum
Etz Chaim:

- `@ivritcode/core`
- `@qec/spec`
- `@qec/core`

Their six internal runtime dependencies are released by the same workflow so a
normal `npm install` has a complete dependency graph. The release script packs
and inspects every artifact before publishing in dependency order. Verification
also installs those tarballs into a temporary project and imports each canonical
API without relying on monorepo workspaces.

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

Quantum Etz Chaim no longer carries a `vendor/ivritcode` submodule. Until the
npm scopes are published, it installs the exact tarballs from the immutable
[`canonical-packages-2026.07.20.1`](https://github.com/Richardatf/IvritCode/releases/tag/canonical-packages-2026.07.20.1)
GitHub Release, with resolved URLs and integrity hashes recorded in its lockfile.
Once the same versions are visible on npm, those release URLs can be replaced by
registry versions without changing package names or runtime imports.
