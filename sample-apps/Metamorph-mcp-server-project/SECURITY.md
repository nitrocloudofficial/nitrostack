# Security policy

## Reporting a vulnerability
- Use GitHub's **Report a vulnerability** button (Security tab, private advisory) on this repository.
- Do not open a public issue for a security problem. Include steps to reproduce and the affected tool or file.

## Secrets and keys
- Never commit `.env` files, API keys, tokens or private keys. `.env.example` lists variable names only.
- Hosted-server API keys are set as host environment variables and shown once when generated. Rotate by adding a new key, then removing the old one.
- Redaction (`src/common/redact.ts`) strips secret-looking strings from tool output and logs.
- CI runs a secret scan (gitleaks) on every push; GitHub secret scanning and push protection apply when the repository is public.

## Automated checks
- Dependabot alerts and security updates for npm packages; Dependabot also keeps pinned GitHub Actions current.
- CodeQL code scanning (JavaScript/TypeScript, security-extended queries) once the repository is public.
- CI: type check, unit tests, `npm audit` for production dependencies.

## Known advisories
- See `docs/THREAT_MODEL.md` ("Known dependency advisories in our own build") for open items and mitigations.
