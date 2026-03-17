# @synth1s/cloak

[![CI](https://github.com/synth1s/cloak/actions/workflows/ci.yml/badge.svg)](https://github.com/synth1s/cloak/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@synth1s/cloak)](https://www.npmjs.com/package/@synth1s/cloak)
[![license](https://img.shields.io/npm/l/@synth1s/cloak)](LICENSE)

**Stop logging out. Start switching.**

Multiple Claude Code accounts — one command. Sessions, tokens, MCP servers, and settings fully preserved. Concurrent sessions across terminals. [181+ developers asked for this.](https://github.com/anthropics/claude-code/issues/18435)

## Before / After

**Before Cloak:**
```
claude → /logout → /login (lose session) → work on project
claude → /logout → /login (lose session) → personal use
```

**After Cloak:**
```
claude -a work     # instant. sessions preserved.
claude -a home     # in another terminal. at the same time.
```

## Install

```bash
npm install -g @synth1s/cloak
```

## 3 steps to get started

```bash
# 1. Save your current Claude session
cloak create work

# 2. Log out, log in with another account in Claude, then:
cloak create home

# 3. Set up shell integration
cloak switch work    # follows the guided setup on first run
```

That's it. From now on:

```bash
claude -a work       # switch and launch
claude -a home       # in another terminal, at the same time
```

## Commands

| Command | Description |
|---------|-------------|
| `cloak create [name]` | Save current session as a new cloak |
| `cloak switch <name>` | Wear a different cloak |
| `cloak list` | See all cloaks in your wardrobe |
| `cloak whoami` | Which cloak are you wearing? |
| `cloak delete <name>` | Discard a cloak |
| `cloak rename <old> <new>` | Rename a cloak |

With shell integration (`eval "$(cloak init)"`):

| Command | Description |
|---------|-------------|
| `claude -a <name>` | Switch and launch Claude |
| `claude account <cmd>` | All cloak commands via claude |

## Concurrent sessions

Different terminal, different identity. No conflicts.

```bash
# Terminal A:
claude -a work

# Terminal B (at the same time):
claude -a home
```

Each account is a completely isolated directory. No file overlap, no token conflicts.

## Context bar

Every command shows which identity is active:

```
cloak > list . work <filipe@company.com> ────────────────────────────

Your Cloaks

  > work (active) — filipe@company.com
    home — filipe@personal.com
```

## How it works

Cloak uses Claude Code's official [`CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars) environment variable. Each account gets its own directory:

```
~/.cloak/
└── profiles/
    ├── work/                # complete, isolated config
    │   ├── .claude.json
    │   ├── settings.json
    │   └── ...
    └── home/
        ├── .claude.json
        └── ...
```

Switching changes which directory Claude Code reads from. Nothing is copied, moved, or overwritten.

## FAQ

<details>
<summary><strong>Will switching overwrite my settings?</strong></summary>

No. Each account is a completely isolated directory. Switching only changes which directory Claude Code reads from. Your settings, MCP servers, and preferences for each account stay exactly where they are.
</details>

<details>
<summary><strong>Are token renewals preserved?</strong></summary>

Yes. When Claude Code renews your OAuth token during a session, it writes to the active account's directory. When you switch away and back, the renewed token is still there.
</details>

<details>
<summary><strong>Can I lose data with multiple accounts running?</strong></summary>

No, as long as each terminal uses a different account. Each has its own directory — no file overlap.
</details>

<details>
<summary><strong>Is my auth token safe?</strong></summary>

Cloak never transmits, logs, or modifies your tokens. It only copies files during `cloak create` and changes an environment variable during `cloak switch`. All data stays local. Credential files are created with restrictive permissions (0o600).
</details>

<details>
<summary><strong>What if I uninstall Cloak?</strong></summary>

Your account directories remain in `~/.cloak/`. Claude Code works normally with its default config. To clean up: `rm -rf ~/.cloak`
</details>

<details>
<summary><strong>Does it work with IDE extensions?</strong></summary>

IDE extensions may not respect `CLAUDE_CONFIG_DIR` ([known limitation](https://github.com/anthropics/claude-code/issues/4739)). Cloak is designed for terminal-based Claude Code.
</details>

## Requirements

- Node.js >= 18
- bash or zsh (for shell integration)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## Documentation

- [Requirements & use cases](docs/requirements.md)
- [Technical specification](docs/technical-spec.md)

## License

MIT
