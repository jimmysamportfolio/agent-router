---
name: testing
description: >
  Testing conventions and patterns for the Agent Router project.
  Use when writing tests, creating test files, mocking dependencies,
  running vitest, or deciding what to test. Triggers on: test files,
  describe/it blocks, vitest commands, test coverage, mocking DB/Redis/LLM.
---

# Testing Skill

## Setup

- **Vitest 4.x** with global test APIs (`describe`, `it`, `expect` -- no import needed)
- Config: `vitest.config.ts` with `@/` path alias
- Tests in `tests/` at project root (not co-located)
- CI: lint -> type check -> `npx vitest run --passWithNoTests` (all must pass for PR merge)

## Writing Tests

- Files: `{module-name}.test.ts`
- Structure: arrange / act / assert
- One behavior per `it` block
- Mock external deps (DB, Redis, LLM) -- no real service calls
- Test edge cases: empty inputs, boundary values, error conditions

## What to Test

Aggregator, rate limiter, circuit breaker, redactor, Zod schemas, query builders

## What NOT to Test

Next.js page rendering, tRPC route wiring, third-party internals

## Commands

```bash
npx vitest run              # Run all tests once
npx vitest run tests/foo    # Run specific test file
npx vitest                  # Watch mode
```
