# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **security@operatorone.ai** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will acknowledge your report within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |

## Security Architecture

OperatorOne uses defense-in-depth:

- **TLS termination** at Traefik (TLS 1.2+ enforced)
- **SSO/OIDC** via Authentik for all user-facing services
- **Secrets management** via OpenBao (KV v2, encrypted storage)
- **Network isolation** via Docker internal networks (`op1-backend`)
- **Role-based access** (viewer/member/admin/owner) enforced at API and tool level
- **No direct database exposure** to the internet

See [Architecture](docs/ARCHITECTURE.md) for the full security model.
