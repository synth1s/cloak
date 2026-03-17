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

## FAQ

### Will switching accounts overwrite my settings or preferences?

No. Each account is a completely isolated directory. Switching only changes which directory Claude Code reads from — it doesn't copy, move, or overwrite any files. Your settings, MCP servers, and preferences for each account stay exactly where they are.

### Can I lose data when running multiple accounts simultaneously?

No, as long as each terminal uses a **different** account. Each account has its own directory (`~/.cloak/profiles/<name>/`), so there's no file overlap. Terminal A writing to `work/` and Terminal B writing to `home/` never interfere.

### What about token renewals? Are they preserved when I switch?

Yes. When Claude Code renews your OAuth token during a session, it writes the new token to the active account's directory. When you switch away and back, the renewed token is still there — Cloak never touches those files.

### What happens if I create a new account? Does it affect existing ones?

No. `cloak create` copies your current session into a **new** directory. Existing accounts are not modified. It's a snapshot, not a move.

### What if I run the same account in two terminals at once?

This is not recommended. Two Claude Code instances writing to the same directory (`~/.cloak/profiles/work/`) can cause token conflicts. This is a Claude Code limitation, not specific to Cloak — the same issue exists without Cloak if you open two `claude` instances normally.

### What happens if I uninstall Cloak?

Your account directories remain in `~/.cloak/`. Claude Code continues to work normally with its default config. To use a saved account manually, set the environment variable:

```bash
export CLAUDE_CONFIG_DIR=~/.cloak/profiles/work
claude
```

To clean up completely: `rm -rf ~/.cloak`

### Is my auth token safe?

Cloak never transmits, logs, or modifies your tokens. It only copies files during `cloak create` (from Claude Code's config to a profile directory) and changes an environment variable during `cloak switch`. All data stays local on your machine.

### Does Cloak work with Claude Code IDE extensions (VSCode, JetBrains)?

IDE extensions may not respect `CLAUDE_CONFIG_DIR` ([known limitation](https://github.com/anthropics/claude-code/issues/4739)). Cloak is designed for terminal-based Claude Code usage.

## Requirements

- Node.js >= 18
- bash or zsh (for shell integration)

## Documentation

- [Requirements & use cases](docs/requirements.md)
- [Technical specification](docs/technical-spec.md)

## License

MIT
