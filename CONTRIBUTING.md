# Contributing Guide

Thanks for contributing to Açık Kaynak CRM (Open-Source CRM)!

## Development workflow

1. Fork the repo and create a `feature/<short-name>` branch.
2. Read the README (architecture, modules, and roadmap) before starting.
3. Make your change; follow the **architecture rules** (below).
4. `npm run lint && npm run test && npm run test:e2e` must be green.
5. Write a meaningful commit message (WHAT + WHY). Open a PR and check the acceptance criteria.

## Immutable architecture rules

- **Layered architecture:** `Controller → Service → Repository`. No business logic in
  controllers; `prisma.*` calls **only** in repositories.
- **Secure by default:** every endpoint is protected; public ones are deliberately `@Public()`.
- **DTO + validation:** all inputs go through class-validator DTOs.
- **Secrets in `.env`;** never hardcoded. Passwords/tokens/PII are never logged.
- **Frontend:** Atomic Design layers (Atoms → Molecules → Organisms → Templates → Pages).

## Test expectations

Every change must cover the happy path **and** the error/security (negative) paths.
Follow the test pyramid: many unit tests, focused integration/E2E for critical flows.

## Code of conduct

Be respectful, constructive, and inclusive. There is no place for harassment or discrimination.
