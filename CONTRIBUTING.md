# Contributing to @synth1s/cloak

Thanks for your interest in contributing!

## Development

```bash
git clone https://github.com/synth1s/cloak.git
cd cloak
npm install
npm test
```

## Methodology

This project follows **strict TDD**. Every change must follow:

1. Write the test first (it must fail)
2. Implement the minimum code to make it pass
3. Refactor if needed

## Running tests

```bash
npm test              # run all tests
node --test tests/    # same thing
```

Tests use `node:test` (native Node.js test runner). No external test frameworks.

## Code style

- Node.js ESM (`type: "module"`)
- All user-facing strings in `src/lib/messages.js`
- All paths in `src/lib/paths.js`
- One file per command in `src/commands/`
- stderr for errors/warnings, stdout for data/success

## Pull requests

- One feature or fix per PR
- Include tests for new behavior
- Update documentation if the change affects user-facing behavior
- Run `npm test` before submitting

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
