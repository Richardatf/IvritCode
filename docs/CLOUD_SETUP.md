# Cloud development setup

These instructions prepare the Observatory, CLI, workspace packages, and Python
bridge for development. No credentials are required. The optional Chavruta service
has separate configuration in [CHAVRUTA.md](CHAVRUTA.md).

Use the existing checkout in an isolated cloud task. Do not create a Git worktree
unless explicitly requested. Commands below run from the repository root.

## Install

Use Node.js 22, as specified in `.nvmrc`, npm, and Python 3.12 or newer.
With an existing Node version manager, activate the version from `.nvmrc` before
installing dependencies.

```bash
npm ci --no-audit --no-fund
npm run build
```

Keep Python dependencies outside the checkout to avoid formatting generated files:

```bash
python -m venv /workspace/.ivritcode-python
/workspace/.ivritcode-python/bin/python -m pip install pytest==9.1.1
```

If the cloud image lacks Node 22 and only permits writes below `/workspace`, use
the npm-distributed Node binary without changing repository dependencies:

```bash
export npm_config_cache=/workspace/.npm-cache
npm install --prefix /workspace/.ivritcode-tools --no-audit --no-fund node@22.23.4
export PATH=/workspace/.ivritcode-tools/node_modules/.bin:$PATH
node --version
```

Then run the installation commands above. Repeat the PATH export in new shells
when using this fallback.

## Start and check the Observatory

```bash
npm run dev -w @ivritcode/web -- --host=127.0.0.1 --port=4173 --strictPort
```

Keep the server in a managed terminal session. In another terminal, check:

```bash
curl -fsS http://127.0.0.1:4173/
```

The response should contain `<title>IvritCode Observatory</title>`. This checks
startup; use the browser tests below to check behavior. Live processes must be
restarted in new cloud tasks, even when dependencies and build outputs are retained.
Local addresses are for internal checks; the onboarding UI does not expose web
previews for them.

## Validate

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
PYTHONDONTWRITEBYTECODE=1 /workspace/.ivritcode-python/bin/python -m pytest -p no:cacheprovider packages/ivrit-compiler/python/test_bridge.py -q
node apps/cli/dist/index.js run examples/bereshit.ivc
```

`npm test` includes the workspace build. The CLI example should finish after six
steps with Aleph Olam equal to 9. The Python flags prevent generated caches from
appearing in the checkout.

For the browser tests, install Chromium and its platform dependencies using
Playwright's supported installer, then run the existing suite:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Installing operating-system dependencies may require administrator access. The
browser suite starts its own server on port 4173, or reuses an existing server
outside CI. It exercises both desktop Chromium and a mobile viewport. CI selects
the desktop project with `npm run test:e2e -- --project=chromium`.

### Restricted browser downloads

If a proxy returns `403 Domain forbidden`, allow the download destination in cloud
environment settings and retry after the network change applies. Playwright may
use `cdn.playwright.dev`, `storage.googleapis.com`, and
`playwright.download.prss.microsoft.com`. Preserve existing allowed domains and
TLS verification.

If the image already supplies `/usr/bin/chromium`, an external configuration can
run the same tests without downloading another browser. From the repository root:

```bash
mkdir -p /workspace/.ivritcode-setup
cat > /workspace/.ivritcode-setup/playwright.config.ts <<EOF
import base from '${PWD}/playwright.config';
export default {
  ...base,
  testDir: '${PWD}/apps/web/e2e',
  webServer: { ...base.webServer, cwd: '${PWD}' },
  outputDir: '${PWD}/test-results',
  use: { ...base.use, launchOptions: { executablePath: '/usr/bin/chromium' } },
};
EOF
npm run test:e2e -- --config=/workspace/.ivritcode-setup/playwright.config.ts
```

System Chromium can differ from Playwright's pinned browser. Use the standard
installer for exact CI browser parity. The system-browser fallback passed all four
desktop/mobile tests during onboarding; the build, type checks, lint, formatting,
81 TypeScript tests, and 10 Python tests also passed.

## Save configuration and publish

Codex environment installation and startup fields are separate from Git commits.
Store the installation commands in the environment's installation script and
the tool activation, server startup, and readiness checks in its startup
instructions. Review and publish the environment to retain the prepared filesystem
for future tasks. Publishing a Codex environment does not push Git commits or
deploy the Netlify site.
