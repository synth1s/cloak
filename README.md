# @synth1s/cloak

> Cloak your Claude. Switch identities in seconds.

Every developer wears a different cloak. One for work, one for personal projects, one for that freelance gig. **Cloak** lets you dress your Claude Code in the right identity — and switch between them without breaking a sweat.

## The problem

Claude Code stores your session in `~/.claude.json`. There's no built-in support for multiple accounts, so switching between personal and work means running `/logout` and `/login` every time — losing your session state in the process.

## The solution

Cloak gives each account its own isolated directory using Claude Code's official [`CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars) environment variable. Each identity stays separate. No file conflicts. No data loss. Full support for concurrent sessions.

## Install

```bash
npm install -g @synth1s/cloak
```

## Quick start

```bash
# Save your current Claude session
cloak create work

# Log out, log in with another account, then:
cloak create home

# Set up shell integration (recommended)
echo 'eval "$(cloak init)"' >> ~/.bashrc && source ~/.bashrc

# Throw on a cloak and go
claude -a work
claude -a home
```

## Commands

| Command | Description |
|---------|-------------|
| `cloak create [name]` | Save current session as a new cloak |
| `cloak switch <name>` | Set `CLAUDE_CONFIG_DIR` for the current shell |
| `cloak list` | See all cloaks in your wardrobe |
| `cloak whoami` | Which cloak are you wearing? |
| `cloak delete <name>` | Discard a cloak |
| `cloak rename <old> <new>` | Rename a cloak |
| `cloak init` | Output shell integration code |

## Shell integration (recommended)

Add to your `.bashrc` or `.zshrc`:

```bash
eval "$(cloak init)"
```

This enables:

| Command | Description |
|---------|-------------|
| `claude -a <name>` | Throw on a cloak and launch Claude |
| `claude -a <name> [args...]` | Throw on a cloak and launch with arguments |
| `claude account create [name]` | Save current session as a new cloak |
| `claude account switch <name>` | Wear a different cloak |
| `claude account list` | See all cloaks in your wardrobe |
| `claude account whoami` | Which cloak are you wearing? |
| `claude account delete <name>` | Discard a cloak |
| `claude account rename <old> <new>` | Rename a cloak |

## Concurrent sessions

Different terminal, different cloak. No conflicts.

```bash
# Terminal A — wearing the work cloak:
claude -a work

# Terminal B — wearing the home cloak:
claude -a home
```

## How it works

Each cloak is an isolated directory that acts as a [`CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars):

```
~/.cloak/
└── profiles/
    ├── work/                # Work identity
    │   ├── .claude.json
    │   ├── settings.json
    │   └── ...
    └── home/                # Personal identity
        ├── .claude.json
        └── ...
```

When you run `claude -a work`, Cloak sets `CLAUDE_CONFIG_DIR=~/.cloak/profiles/work` in your current shell and launches Claude Code. Each terminal gets its own environment, so you can wear different cloaks simultaneously.

## Requirements

- Node.js >= 18
- bash or zsh (for shell integration)

## Documentation

- [Requirements & use cases](docs/requirements.md)
- [Technical specification](docs/technical-spec.md)

## License

MIT
