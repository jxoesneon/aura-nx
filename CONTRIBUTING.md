# Contributing to Aura-NX

Thank you for your interest in improving Aura-NX. As an institutional-grade project, we maintain a high standard for contributions to ensure the stability and security of the Nintendo Switch ecosystem.

## Contribution Workflow

### 1. Issue Discussion
Before starting any significant work, please open an issue to discuss your proposed changes. This ensures that your contribution aligns with the project's [Architecture](docs/01-architecture.md) and [Security Posture](docs/07-security-posture.md).

### 2. Pull Requests
*   **Branching:** All development should occur on feature branches branched from `develop`.
*   **Style:** Adhere to `clang-format` for C++ and `eslint` for TypeScript.
*   **Documentation:** Update the relevant `.md` files in the `docs/` directory for any new features or API changes.
*   **Tests:** New features must include unit tests. Major protocol changes should include integration or HIL test plans.

### 3. Code Review
All PRs require approval from at least one core maintainer. We look for:
*   Memory safety (no buffer overflows).
*   Correct ASLR handling.
*   Protocol compliance (JSON-RPC).
*   Adherence to the [Security Posture](docs/07-security-posture.md).

## Development Setup

### Switch Components
1.  Install the latest [devkitPro](https://devkitpro.org/wiki/Getting_Started).
2.  Install the `switch-dev` payload.
3.  Run `make` in the `sysmodule/` directory.

### PC Components
1.  Install Node.js LTS.
2.  Run `npm install` in the `mcp-server/` directory.
3.  Run `npm test` to verify the installation.

## Security Disclosures
If you discover a security vulnerability, please DO NOT open a public issue. Instead, email a detailed report to the security team at `security@aura-nx.org`. We follow a responsible disclosure policy.