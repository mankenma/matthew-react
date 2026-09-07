# Security checks

The Security workflow runs on pull requests to main, pushes to main, every Monday,
and on demand from GitHub Actions. No website credentials are required.

- Dependency vulnerabilities: npm audit checks the committed lockfile, including
  development dependencies. High and critical vulnerabilities fail the job.
- CodeQL: security-extended analysis of JavaScript and TypeScript. Findings appear
  in GitHub's Security tab. Astro templates and application authorization rules
  still need manual review. A completed scan does not mean there are no findings.
- Secret scanning: Gitleaks scans changes with full git history available. If a
  real credential is found, revoke or rotate it; deleting it is insufficient.
- Dependabot opens weekly update pull requests for npm packages and GitHub Actions.

Actions are pinned to commit hashes and checkout does not persist credentials.
These workflows do not invoke production APIs or send emails.

## Deployment and enforcement

Scheduled checks and Dependabot become active when these files reach the default
branch. Review failures in Actions and findings in Security. Configure main's
branch rules to require Dependency vulnerabilities and Secret scanning once the
initial baseline is clean. Use a code scanning merge protection rule to enforce
CodeQL findings; successful analysis alone is not a vulnerability gate.

These checks do not automatically block Netlify deployments or configure a WAF,
rate limiting, live-site monitoring, or GitHub account notification preferences.
Do not treat them as a complete security audit.

## Manual review follow-up

The initial source inspection found no server-side authentication in the
leaderboard DELETE handler. The notification POST endpoint also permits an
unauthenticated request to write a score and trigger an email. Address authorization
and abuse prevention before relying on these endpoints. No production requests
were made to test these behaviors.
