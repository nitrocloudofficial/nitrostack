# Metamorph runner

Isolated verification of a repository, with an optional patch applied first. It installs dependencies without
scripts, runs the project's tests and a set of scanners, and writes one normalised `result.json` (schema v1,
validated by `src/modules/verify/result.ts`).

**It executes untrusted project code.** Run it only in the container below or on a GitHub Actions ephemeral VM,
never inside the MCP server. The container runs as a non-root user, the child processes get a minimal environment
(no inherited tokens), and the workflow uses `permissions: contents: read` and no secrets. Network access is left
on because composer, npm, trivy and semgrep need it; that is a known residual risk of the container tier.

## Inputs

| Name | Meaning |
|---|---|
| `REPO_URL` | `https://github.com/<owner>/<repo>` only. Cloned shallow, no submodules, no hooks. |
| `SUBFOLDER` | Project folder inside the repo (optional, no `..`). |
| `PATCH_B64` | Optional base64 unified diff, paths relative to the repo root (plain `git diff` output). `git apply --check` runs first; a patch that does not apply gives `patchApplied:false` and a failed `git-apply` check, and nothing else runs. |
| `PATCH_GZ_B64` | Preferred. The same diff, gzip-compressed and then base64 encoded (`gzip -9c fix.diff \| base64 -w0`). Send this or `PATCH_B64`, not both. Decompressed size is capped (`MAX_PATCH_BYTES`, default 8 MiB). |
| `CHECKS` | Comma list, default `all`. Ids: `composer-install, composer-audit, phpunit, phpstan, rector, npm-ci, npm-audit, eslint, tsc, npm-test, trivy, semgrep, gitleaks, checkov, hadolint`. Aliases: `php, composer, npm, node, scanners, light` (light = everything except trivy, semgrep, checkov, rector). |

Optional env: `OUT_FILE` (default `/out/result.json`), `CHECK_TIMEOUT_S` (600), `INSTALL_TIMEOUT_S` (900),
`OUTPUT_CAP_BYTES` (16 MiB per check), `MAX_PATCH_B64_CHARS` (60000, applies to the characters sent, i.e. after compression), `MAX_PATCH_BYTES` (8 MiB, decompressed).

## Local use

```bash
docker build -t metamorph-runner -f runner/Dockerfile runner
mkdir -p out && chmod 777 out
docker run --rm -e REPO_URL=https://github.com/dhilipa01/metamorph-demo-legacy -e SUBFOLDER=php-shop \
  -v "$PWD/out:/out" metamorph-runner
```

The script exits 0 whenever it wrote `result.json`, including when checks fail. Read `checks[].status`.

## Result semantics

- `status`: `pass` (tool ran, nothing to report), `fail` (tool ran and reported problems, or the patch did not apply),
  `error` (tool could not run, timed out, or its output could not be parsed), `skipped` (not applicable or not selected).
- `findings` are sorted by severity and capped at 500; `findingsTotal` and `findingsDropped` count the rest.
- `buildOk` is true when every detected ecosystem installed (`composer-install` and/or `npm-ci` passed) and `tsc`, if it ran, passed.
- `php` (optional, only when a `composer.json` was checked): `selected`/`version` (the PHP used for composer and phpunit), `constraint` and `constraintSource`
  (`require.php`, `config.platform.php`, `composer.lock` or `default`), `reason`, `supported`, and `lockRegenerated`.
  The older fields keep their meaning, so results without `php` stay valid.
- `tests` is the sum over PHPUnit (junit xml) and the project's `npm test` (counts parsed from vitest/jest/node:test output; when the output is not recognised the counts stay 0 and the check summary says so).
- Every string is passed through the secret redaction regexes (ported from `src/common/redact.ts`; keep them in sync).
- Severity is the tool's own grade where it has one (SARIF `security-severity`, npm audit, checkov). Gitleaks findings are
  fixed at `high`, PHPStan at `low`, Rector at `info`, composer advisories default to `medium` because composer's JSON carries no grade.

## PHP version selection

The image runs `php` 8.4 by default and also has 7.4, 8.1 and 8.3 under `/opt/php/<ver>/` (each with a `shim/php` that selects its ini). `php-select.mjs` reads `composer.json`
and `composer.lock` and chooses one; composer and phpunit run on it (PHPStan and Rector stay on 8.4, they analyse code statically).

1. `require.php` filters the installed versions (caret, tilde, ranges, wildcards, `||`, hyphen ranges). Nothing left: the composer-install check is `error` with
   `no supported PHP version for constraint X`, and nothing falls back to 8.4. A constraint the parser does not understand uses the default only if one is installed, and says so in `reason`.
2. The `require.php` of every locked package narrows the list further (what composer's own platform check enforces), unless that would empty it.
3. `config.platform.php` picks the nearest remaining version at or above it. Without it the lowest remaining version is used, because that is the one legacy pinned
   dependencies are most likely to install on. No PHP constraint at all: the default, 8.4.

**Stub `composer.lock`.** If any locked package has neither `dist` nor `source`, `composer install` cannot work. The runner then copies the project to a scratch directory (no `vendor`,
`node_modules`, `.git`), deletes the lock there, and runs `composer update --no-scripts --no-plugins --no-interaction --no-progress --ignore-platform-reqs --no-security-blocking`
on the selected PHP. `--no-security-blocking` is needed because composer 2.9+ refuses to install package versions that have security advisories; those are reported by `composer-audit` instead.
The composer-install check is always `fail` in this case (so `buildOk` is false and nothing is `verified`), its summary says the lock was stub, what the fresh resolution did, and that the original lock did not build; `php.lockRegenerated` is true.
phpunit then runs in the scratch copy if the resolution worked. `composer-audit` still audits the original lock.

## Image publishing

`.github/workflows/runner-image.yml` builds `runner/Dockerfile` and pushes `ghcr.io/<owner>/metamorph-runner` with the tags `<git sha>` and `latest`
(on `workflow_dispatch` and on pushes to `main` that touch `runner/**`), using GitHub Actions layer caching. It is the only workflow with `packages: write`.
All actions are pinned by commit SHA. The run summary records the digest.

`metamorph-runner.yml` pulls the image (default tag `latest`, or the `image` input: another tag or `sha256:<digest>` to pin) and falls back to `docker build` if the pull fails; the log line and run summary
say which path was used. **One-time step for the owner:** GitHub creates the package private, so set it to public: profile or organisation, **Packages**, **metamorph-runner**,
**Package settings**, **Danger Zone**, **Change package visibility**, **Public**. Otherwise the pull fails (no login in the dispatch workflow) and every run builds locally.
An image pulled by tag follows `latest`: pin by digest when you need reproducibility.

## Order of checks

Static scanners (gitleaks, semgrep, trivy, checkov, hadolint) run first on the clean tree, before installs add `vendor/`
and `node_modules/`. Then composer and PHP tools, then npm and Node tools.

## Image contents and size

Base `php:8.4-cli-bookworm` (Debian 12), plus PHP 7.4 (from `php:7.4-cli-bullseye`, whose apt packages now come from archive.debian.org because Debian 11 is end of life), 8.1 and 8.3 taken from the official `php:<ver>-cli` images with the same extensions (zip, intl, bcmath, pdo_mysql, pcntl, exif), their shared libraries copied alongside (`bundle-php.sh`, libraries the base already has are dropped). Pinned: Node 22.23.4, Composer 2.11.1, Trivy 0.76.1, Gitleaks 8.30.1,
Hadolint 2.15.1 (all sha256-verified against the project's published checksums), Semgrep 1.183.0 and Checkov 3.4.0
(pip, exact version pin; PyPI publishes no per-release checksum we could pin ahead of time), PHPStan 2.3.4 and
Rector 2.8.3 (composer, each in its own `/opt` project because Rector bundles its own PHPStan). The PHP base image
tag is not digest-pinned. The measured image size is recorded in the "Measured" section below. Adding the three PHP versions grew the image from 2.62 GB to 2.75 GB on disk (+130 MB; compressed content 599 MB to 628 MB, +29 MB).

The heavy scanners (semgrep, checkov, trivy) stay in the image; use `CHECKS=light` to skip them for a faster run.

## Semgrep and the network

`semgrep --config auto` downloads rules from the Semgrep registry and requires Semgrep metrics to be on, which sends
project metadata to Semgrep. If it cannot run (offline, registry unreachable, timeout) the runner falls back to the
small local rule set in `runner/rules/` with metrics off, and says which mode produced the result in the check summary.
The fallback rules are deliberately few; they are a safety net, not a replacement for the registry rules.

## GitHub Actions

`.github/workflows/metamorph-runner.yml` (`workflow_dispatch`) pulls the published image (see Image publishing; it builds locally if the pull fails) and runs the same script on an
ephemeral VM, then uploads `result.json` as the `metamorph-result` artifact (retention 3 days).

**Input size limit.** GitHub documents that the whole `workflow_dispatch` inputs payload can contain at most
**65,535 characters** (and at most 25 inputs). The patch shares that budget with the other inputs, so the script
refuses a `PATCH_GZ_B64` or `PATCH_B64` longer than 60,000 characters (the cap applies after compression). The message
says the next step: send `PATCH_GZ_B64` (gzip, then base64) if you used `PATCH_B64`, or split the change into smaller
stages / run the Docker image locally if you already compressed. A real regenerated `composer.lock` patch for the demo
(58,729 bytes of diff, 78,308 base64 characters uncompressed) compresses to 7,760 characters with gzip -9 plus base64.
The workflow also takes `request_id`, which appears in the run name so a dispatcher can find its run.

## Measured with multiple PHP versions

Same demo repo (`dhilipa01/metamorph-demo-legacy`), local Docker, full `CHECKS=all`, wall time 2:44 (php-shop) and 2:37 (php-shop-modernized). Fixtures: `tests/fixtures/runner/php-shop-after-php74.json`
(php-shop at the repo head, no patch) and `php-shop-modernized-php84.json`.

| Project | PHP chosen | composer-install | buildOk | phpunit |
|---|---|---|---|---|
| php-shop (`require.php >=7.2`, stub lock) | 7.4.33 | `fail`: stub lock, fresh `composer update` on 7.4 installed ok in 7.2 s, original lock reported as not built | false | skipped: no phpunit config |
| php-shop-modernized (`require.php ^8.4`, stub lock) | 8.4.27 | `fail`: same stub-lock path | false | skipped: no phpunit config |

Before this change php-shop failed because `symfony/http-kernel 4.4.0` needs PHP ^7.1.3 and the image only had 8.4; on 7.4 the dependencies now resolve and install. `buildOk` stays false on purpose because
the committed lock is a stub. The multi-PHP run did not exercise phpunit: neither demo project has tests. The earlier measurements below were taken with the single-PHP image.

## Measured (earlier, single PHP 8.4 image)


Image `metamorph-runner`: **2.62 GB** on disk (amd64). Largest layers: Semgrep venv about 706 MB, Checkov venv about 254 MB,
Trivy/Gitleaks/Hadolint binaries about 213 MB, Node 22 about 201 MB, base php:8.4-cli about 77 MB plus extensions.
A cold build took about 22 minutes on the development machine (network bound: base image, PyPI, GitHub downloads).
Image size is large but not impractical for a GitHub-hosted VM (the build runs there each dispatch; add layer caching
or publish the image to a registry if build time matters). The heavy scanners stay in the image, selectable with `CHECKS`.

Run against `dhilipa01/metamorph-demo-legacy`, subfolder `php-shop` (commit 41d1c978), full `CHECKS=all`, wall time
about 200 to 265 s per run, of which Trivy is 130 to 210 s (vulnerability DB download plus scan):

| Check | Result | Notes |
|---|---|---|
| gitleaks 8.30.1 | pass | no secrets found |
| semgrep 1.183.0 | fail, 2 findings | `--config auto` (registry) worked, no fallback needed; tainted SQL string in `index.php` and `login.php`; about 15 to 25 s |
| trivy 0.76.1 | fail | 16 findings before, 2 after the guzzle bump |
| checkov 3.4.0 | pass | no IaC files, nothing to scan |
| hadolint 2.15.1 | skipped | php-shop has no Dockerfile |
| composer-install | fail (both runs) | before: the repo's `composer.lock` is a stub (no source/dist, no require-dev info), so install fails even with the `--no-dev` retry. After: a real regenerated lock, but `symfony/http-kernel 4.4.0` requires PHP ^7.1.3 and the image has PHP 8.4, so composer refuses. Not a runner bug; a legacy project cannot be installed on the runner PHP version. The runner has no per-project PHP version selection yet. |
| composer-audit | fail | 16 advisories/abandoned before, 3 after (`--locked`, so it works without install) |
| phpunit, phpstan | skipped | no phpunit config, no phpstan config and no src/app/lib dir; phpunit also depends on composer install |
| rector 2.8.3 | pass | 0 changes proposed with the fallback config |
| npm-*, eslint, tsc | skipped | no package.json in php-shop |

`buildOk` is false in both fixtures because composer install failed. Patch used for "after": `guzzlehttp/guzzle` 6.5.0
to `^7.9` in `composer.json` plus a regenerated `composer.lock`, 59,666 bytes (79,556 base64 characters). That is over the
workflow_dispatch limit, so it was run locally with `MAX_PATCH_B64_CHARS=200000`; with the default limit the runner refuses it
with the message above (tested).

Additional smoke runs on other subfolders of the same demo repo: `php-shop-modernized` (hadolint reported DL3066 on its
Dockerfile, phpstan passed, rector proposed changes to `src/Database.php`, composer install failed for the same stub-lock reason)
and `node-orders` (`npm ci` passed, `npm audit` failed with 9 advisories).

Not exercised by a real run: phpunit (no project with a config), eslint, tsc, `npm test`, the semgrep offline fallback path
in a truly offline container, and the arm64 build.

## Finding identity fields and local test mode

Findings may also carry (all optional, older results stay valid): `aliases` (CVE, GHSA, PKSA ids), `package`, `installedVersion`, `fixedVersion`, `affectedVersions`, `owasp` (Top 10 2021 ids listed by the tool itself, e.g. Semgrep tags) and `cvss` (SARIF `security-severity` for trivy, npm audit's score). Trivy values come from the "Package / Installed Version / Fixed Version" lines of its SARIF message; composer audit values from `packageName`, `affectedVersions`, `cve`, `advisoryId` and `sources[].remoteId`. `src/modules/scanners/` normalises and deduplicates them.

`LOCAL_REPO_DIR` (test only, never set by the workflow): an absolute directory, for example a bind mount, copied instead of cloning from GitHub, so a run can use `docker run --network none`. `REPO_URL` must still be given; it only names the result. Example used to prove the Semgrep offline fallback:
`docker run --rm --network none -e REPO_URL=https://github.com/local/offline-demo -e LOCAL_REPO_DIR=/src -e CHECKS=semgrep,gitleaks -v <dir>:/src:ro -v <out>:/out metamorph-runner`
With no network, `--config auto` fails, the runner falls back to `runner/rules/metamorph-basic.yml` and the semgrep summary reads "offline fallback rules (auto unavailable)". It took about 108 s here, because the registry attempt has to time out first.
