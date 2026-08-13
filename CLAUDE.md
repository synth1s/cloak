# @synth1s/cloak — Claude Code context

## What is this project
CLI addon for Claude Code that extends the `claude` command with multi-account support.
Each account is an isolated directory used via the official `CLAUDE_CONFIG_DIR` environment variable.
Supports concurrent sessions — different terminals can wear different cloaks simultaneously.

## Stack
- Node.js >= 20 ESM (type: "module")
- commander — CLI command parsing
- chalk — colored terminal output
- inquirer — interactive prompts (confirmation, input)
- node:test + node:assert — native test runner (no Jest)

## Project structure
```
src/
  cli.js              — entry point, command registration (commander)
  commands/
    init.js            — shell integration (cloak init)
    create.js          — cloak create
    switch.js          — cloak switch / use
    list.js            — cloak list / ls
    delete.js          — cloak delete / rm
    whoami.js          — cloak whoami
    rename.js          — cloak rename
    bind.js            — cloak bind (auto-switch by directory)
    unbind.js          — cloak unbind
  lib/
    paths.js           — path constants, directory helpers, active account resolution
    validate.js        — account name validation
    tip.js             — first-run shell integration tip
    setup.js           — automatic shell integration setup
    messages.js        — centralized user-facing messages (i18n-ready)
    context-bar.js     — universal context bar (status indicator)
tests/
    validate.test.js, paths.test.js, create.test.js, whoami.test.js,
    list.test.js, switch.test.js, delete.test.js, rename.test.js,
    setup.test.js, tip.test.js, context-bar.test.js, bind.test.js, init.test.js,
    prompt.test.js
docs/
    requirements.md    — use cases, business rules, references
    technical-spec.md  — architecture, contracts, test matrix
```

## How it works
Cloak uses Claude Code's official `CLAUDE_CONFIG_DIR` env var to isolate accounts:

- Each account is a directory: `~/.cloak/profiles/<name>/`
- Switching sets `CLAUDE_CONFIG_DIR` to point to the account directory
- No file swapping — each account is a complete, independent config
- Active account is per-shell (determined by env var), not global

Shell integration (`eval "$(cloak init)"`) emits two shell functions:
- `cloak()` — intercepts `cloak switch` to eval export in the current shell
- `claude()` — extends `claude` with `account` subcommands and `-a` flag
- Commands that don't modify env (create, list, whoami, delete, rename) pass through to binary

On first `cloak switch` without shell integration, user is prompted to set it up.

## Available commands
```
cloak create [name]                — save current session as a new cloak
cloak switch <name>                — wear a different cloak (alias: use)
cloak list                         — see all cloaks (alias: ls)
cloak whoami                       — which cloak are you wearing?
cloak delete <name>                — discard a cloak (alias: rm)
cloak rename <old> <new>           — rename a cloak
cloak bind <name>                  — bind current directory to a cloak
cloak unbind                       — remove directory binding
cloak init                         — output shell integration code
```

With shell integration:
```
claude -a <name>                   — throw on a cloak and launch claude
claude account <subcommand>        — routed to cloak binary
```

## Development methodology
This project follows strict TDD. Tests are always written before implementation.
Test runner: `node --test tests/`

## Key references
- `CLAUDE_CONFIG_DIR`: https://code.claude.com/docs/en/env-vars
- Multi-account workaround: https://github.com/anthropics/claude-code/issues/261
- Community demand: https://github.com/anthropics/claude-code/issues/18435
