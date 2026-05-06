# Security Policy

code2pia is a static analysis tool for privacy engineering workflows. Please do not share real personal data, secrets, credentials, customer records, production URLs, or confidential source code in public issues or pull requests.

## Reporting a Vulnerability

If you believe you found a security issue, please report it privately.

Use GitHub private vulnerability reporting if it is enabled for this repository. If it is not enabled, contact the maintainers through a private channel before opening a public issue.

Please include:

- a short description of the issue
- affected version or commit
- steps to reproduce
- expected impact
- a minimal redacted example

## Public Issues

For normal bugs, use the issue templates and redact all sensitive information.

Good examples:

- synthetic DTOs
- fake endpoint names
- fake personal data fields
- reduced fixtures

Avoid:

- real personal data
- access tokens
- production logs
- database exports
- full proprietary repositories

## Supported Versions

code2pia is currently an MVP. Security fixes are handled on the `main` branch until versioned releases are introduced.
