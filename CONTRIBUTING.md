# Contributing to OperatorOne

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repo and clone your fork
2. Copy `.env.example` to `.env`
3. Run `./scripts/start.sh` to generate secrets and start the stack
4. Complete the setup wizard at `http://console.localhost`

See the [README](README.md) for detailed setup instructions.

## Development

```bash
# Start the dev stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  -f modules/console/docker-compose.yml -f modules/console/docker-compose.dev.yml \
  -f modules/admin/docker-compose.yml -f modules/admin/docker-compose.dev.yml \
  -f modules/paperless/docker-compose.yml -f modules/paperless/docker-compose.dev.yml \
  up -d
```

The console app supports hot reload via volume mounts in dev mode.

## Pull Requests

- Create a feature branch from `main`
- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Make sure the dev stack starts cleanly with your changes

## Reporting Bugs

Use the [bug report template](https://github.com/caseycapshaw/OperatorOne/issues/new?template=bug_report.md) when filing issues.

## Security

Found a vulnerability? **Do not open a public issue.** Use [GitHub's private vulnerability reporting](https://github.com/caseycapshaw/OperatorOne/security/advisories/new) instead. See [SECURITY.md](SECURITY.md) for details.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
