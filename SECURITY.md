# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in @synth1s/cloak, please report it responsibly.

**Do NOT open a public issue.** Instead, email:

**goulartfs@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive a response within 48 hours. Once confirmed, a fix will be released as a patch version and credited in the changelog (unless you prefer anonymity).

## Scope

This policy covers:
- The `@synth1s/cloak` npm package
- The shell integration code emitted by `cloak init`
- File operations on `~/.cloak/` and shell rc files

## Security Measures

- Account names are validated against `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$` to prevent path traversal
- Credential files are created with restrictive permissions (0o700 dirs, 0o600 files)
- Shell eval output is quoted to prevent injection
- OAuth tokens are never read, logged, or transmitted — only copied as files
- `.bashrc` modifications include a backup (`.cloak-backup`) and a marker comment
