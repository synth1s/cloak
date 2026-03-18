# Requirements — @synth1s/cloak

## 1. Overview

**Cloak** is an addon for Claude Code that lets developers dress their Claude in different identities — switching between multiple accounts without losing session state, with full support for concurrent sessions.

Every developer wears a different cloak: one for work, one for personal projects, one for freelance. Cloak manages these identities so you never have to `/logout` and `/login` again.

### 1.1 Technical context

Claude Code stores the user's session in:

| File | Content |
|------|---------|
| `~/.claude.json` | OAuth token, MCP servers, session metadata |
| `~/.claude/settings.json` | Preferences, permissions, hooks |

There is no built-in support for multiple accounts. Manually switching (`/logout` → `/login`) destroys the previous session state.

### 1.2 Underlying mechanism

Claude Code officially supports the `CLAUDE_CONFIG_DIR` environment variable ([reference](https://code.claude.com/docs/en/env-vars)), which redirects where configuration files are stored. Cloak uses this variable to isolate each account in its own directory, eliminating conflicts between sessions.

**References:**
- [Environment Variables Reference](https://code.claude.com/docs/en/env-vars) — official documentation for `CLAUDE_CONFIG_DIR`
- [Issue #261](https://github.com/anthropics/claude-code/issues/261) — Anthropic team confirmation of multi-account use via env var
- [Issue #3833](https://github.com/anthropics/claude-code/issues/3833) — details on which files are relocated by `CLAUDE_CONFIG_DIR`
- [Issue #18435](https://github.com/anthropics/claude-code/issues/18435) — community demand for multi-account support (181 upvotes)
- [Issue #25762](https://github.com/anthropics/claude-code/issues/25762) — request for config directory configuration (7+ duplicates)
- [Issue #4739](https://github.com/anthropics/claude-code/issues/4739) — known limitation: IDE integration may not respect `CLAUDE_CONFIG_DIR`

---

## 2. Account architecture

Each account is an isolated directory — a cloak that Claude can wear:

```
~/.cloak/
└── profiles/
    ├── work/                # The "work" cloak
    │   ├── .claude.json     # Isolated auth/session
    │   ├── settings.json    # Isolated settings
    │   ├── credentials.json
    │   ├── projects/
    │   └── ...
    └── home/                # The "home" cloak
        ├── .claude.json
        ├── settings.json
        └── ...
```

**Principle:** each cloak is a complete, independent Claude Code configuration. There is no file copying between accounts — each one operates from its own directory.

**Active cloak:** determined by the `CLAUDE_CONFIG_DIR` environment variable in the current shell. Each terminal can wear a different cloak simultaneously.

---

## 3. Shell integration

Cloak requires shell integration for account switching. This is because a child process (the `cloak` binary) cannot modify the parent shell's environment variables — an OS-level constraint. Shell functions run inside the shell itself, so they can.

### 3.1 What shell integration provides

After `eval "$(cloak init)"`, the shell gets two functions:

**`cloak()` function** — intercepts `cloak switch` to set `CLAUDE_CONFIG_DIR` in the current shell:
```bash
cloak switch work          # switches account
cloak create work          # delegated to binary (no interception needed)
cloak list                 # delegated to binary
cloak whoami               # delegated to binary
```

**`claude()` function** — extends the `claude` command:
```bash
claude -a work             # switch + launch claude
claude account switch work # same as cloak switch work
claude account list        # same as cloak list
claude                     # passes through to original claude
```

All commands that don't modify environment variables (`create`, `list`, `whoami`, `delete`, `rename`) work without shell integration via the `cloak` binary directly.

### 3.2 Automatic setup

When the user runs `cloak switch` for the first time without shell integration, the system prompts:

```
! Shell integration is required to switch accounts.

? How would you like to proceed?
❯ Set it up now (recommended)
  Show manual instructions
```

Automatic setup appends `eval "$(cloak init)"` to the user's rc file (`.bashrc` or `.zshrc`).

### 3.3 First-run tip

When any other `cloak` command runs without shell integration, a non-blocking tip is shown:

```
* Tip: Run this once to enable "claude -a" and "claude account":
   echo 'eval "$(cloak init)"' >> ~/.bashrc && source ~/.bashrc
```

**Business rules:**
- The tip is shown only when shell integration is not active (the `claude` function does not exist in the current shell)
- The tip is non-blocking — it does not interrupt the command's execution
- The tip is shown at most once per shell session (tracked via an environment variable)
- The tip is suppressed if stdout is not a TTY (piped output, scripts)
- After the tip is shown, the command proceeds normally

---

## 4. Use cases

### UC-01: Initialize shell integration

**Actor:** User installing Cloak for the first time.

**Main flow (direct mode — no setup):**
1. User runs `npm install -g @synth1s/cloak`
2. User runs any `cloak` command (e.g., `cloak create work`)
3. System shows a one-time tip suggesting shell integration
4. Command executes normally regardless

**Alternative flow (shell integration):**
1. User adds `eval "$(cloak init)"` to their `.bashrc` or `.zshrc`
2. User restarts the terminal or runs `source ~/.bashrc`
3. The `claude` command now accepts `account` and `-a`

**Business rules:**
- `cloak init` must detect the current shell (bash or zsh) and emit compatible code
- The shell function must only intercept `claude account` and `claude -a`; everything else passes through to the original `claude` binary
- The first-run tip is shown only once per session, only on TTY, and does not block execution

---

### UC-02: Create an account

**Actor:** User with an active Claude Code session.

**Main flow:**
1. User runs `claude account create <name>`
2. System validates the name
3. System checks for an active session (`~/.claude.json` or `$CLAUDE_CONFIG_DIR/.claude.json`)
4. System creates the directory `~/.cloak/profiles/<name>/`
5. System copies current session files into the cloak directory
6. System displays confirmation

**Alternative flow — no name:**
1. User runs `claude account create` (no argument)
2. System prompts for the name interactively
3. Continues from step 2 of main flow

**Alternative flow — account already exists:**
1. System detects the directory already exists
2. System asks whether to overwrite
3. If yes, overwrites files. If no, cancels

**Business rules:**
- If `CLAUDE_CONFIG_DIR` is set, source files are read from `$CLAUDE_CONFIG_DIR`
- If `CLAUDE_CONFIG_DIR` is not set, source files are read from default paths (`~/.claude.json`, `~/.claude/settings.json`)
- Name must pass validation (see section 6)
- `~/.claude.json` (or equivalent) is required. Without it, there is no session to save
- `settings.json` is optional. If it doesn't exist, the cloak is created with auth only

---

### UC-03: Switch account

**Actor:** User with at least one saved account.

**Main flow (with shell integration):**
1. User runs `cloak switch <name>` (or `claude account switch <name>`, or `claude account use <name>`)
2. Shell function `cloak()` intercepts the command
3. System validates the name and checks the account exists
4. Shell function evals `export CLAUDE_CONFIG_DIR=~/.cloak/profiles/<name>`
5. System displays confirmation
6. Next `claude` invocation uses the new account

**Alternative flow — shortcut with launch:**
1. User runs `claude -a <name>` (optionally with extra arguments)
2. Shell function `claude()` intercepts the command
3. System validates the name and checks the account exists
4. Shell function evals the switch, then calls `command claude` with extra arguments
5. Claude Code opens with the selected account

**Alternative flow — already wearing this cloak:**
1. System detects that `CLAUDE_CONFIG_DIR` already points to the requested account
2. System informs the user and does nothing

**Alternative flow — account not found:**
1. System reports the account was not found
2. System suggests `claude account create`

**Alternative flow — no shell integration (first time):**
1. System detects shell integration is not active (`CLOAK_SHELL_INTEGRATION !== '1'`)
2. System presents two options:
   - **Option 1: Automatic setup** — adds `eval "$(cloak init)"` to the user's shell rc file
   - **Option 2: Manual instructions** — prints the commands for the user to run manually
3. If user chooses automatic setup:
   a. System detects the shell (bash → `~/.bashrc`, zsh → `~/.zshrc`)
   b. System checks if the line already exists in the rc file (no duplicates)
   c. System appends `eval "$(cloak init)"` to the rc file
   d. System instructs user to reload shell (`source ~/.bashrc`)
   e. After reload, `cloak switch` works normally
4. If user chooses manual instructions:
   a. System prints the `eval "$(cloak init)"` setup command
   b. Switch is not executed (user must reload shell first)

**Business rules:**
- Switching does **not** modify any account files. It only changes the environment variable
- Claude Code sessions already running are not affected by the switch
- Each terminal maintains its own `CLAUDE_CONFIG_DIR` independently
- All three switch commands (`cloak switch`, `claude account switch`, `claude -a`) go through shell functions, ensuring `CLAUDE_CONFIG_DIR` is set in the parent shell
- The shell integration setup prompt only appears when `CLOAK_SHELL_INTEGRATION` is not set
- Automatic setup does not duplicate the init line if it already exists in the rc file
- Automatic setup detects the correct rc file based on `SHELL` env var

---

### UC-04: List accounts

**Actor:** Any user.

**Main flow:**
1. User runs `claude account list` (or `claude account ls`)
2. System reads subdirectories of `~/.cloak/profiles/`
3. System compares each against the current `CLAUDE_CONFIG_DIR`
4. System displays the list with a visual indicator on the active cloak

**Alternative flow — no accounts:**
1. System reports no cloaks in the wardrobe
2. System suggests `claude account create`

**Business rules:**
- The "active" indicator is based on the current shell's `CLAUDE_CONFIG_DIR`, not a global file
- Accounts are listed in alphabetical order
- Each account shows the associated email address (read from `.claude.json` → `oauthAccount.emailAddress`)
- If the email cannot be read (file missing or corrupt), the account is listed without email

---

### UC-05: Delete an account

**Actor:** User with saved accounts.

**Main flow:**
1. User runs `claude account delete <name>` (or `claude account rm <name>`)
2. System validates the name
3. System checks the account exists
4. System checks whether it's the active cloak in the current shell
5. System prompts for confirmation
6. If confirmed, removes the entire cloak directory
7. System displays confirmation

**Alternative flow — active cloak:**
1. System detects the account to delete is currently being worn
2. System refuses with a message: switch to another cloak first

**Alternative flow — account not found:**
1. System reports the account was not found

**Business rules:**
- The active cloak in the current shell cannot be deleted
- Deletion requires interactive confirmation
- The entire cloak directory is removed (`~/.cloak/profiles/<name>/`)

---

### UC-06: Show active account

**Actor:** Any user.

**Main flow:**
1. User runs `claude account whoami`
2. System reads `CLAUDE_CONFIG_DIR` from the environment
3. System extracts the account name from the path
4. System displays the name

**Alternative flow — no active cloak:**
1. `CLAUDE_CONFIG_DIR` is not set or doesn't point to a Cloak account
2. System reports: using default Claude Code config (no cloak)
3. System suggests `claude account switch`

---

### UC-07: Rename an account

**Actor:** User with saved accounts.

**Main flow:**
1. User runs `claude account rename <old> <new>`
2. System validates both names
3. System checks the source account exists
4. System checks the destination name is not taken
5. System renames the cloak directory
6. If the renamed cloak is active, warns user to run `claude account switch <new>`
7. System displays confirmation

**Alternative flow — destination name taken:**
1. System reports the name is already in use

**Business rules:**
- Same validation rules as UC-02 apply to the new name
- If the renamed cloak is the active one, `CLAUDE_CONFIG_DIR` will point to a directory that no longer exists. The system must warn the user to switch

---

### UC-08: Switch + launch (shortcut)

**Actor:** User in their daily workflow.

**Main flow (requires shell integration):**
1. User runs `claude -a <name>` (optionally with extra arguments)
2. Shell function calls `cloak switch --print-env <name>` and evals the output (sets `CLAUDE_CONFIG_DIR` in the **current shell**)
3. Shell function calls `command claude` with any extra arguments
4. Claude Code opens using the selected cloak's configuration
5. After Claude Code exits, the shell still has the correct `CLAUDE_CONFIG_DIR`

**Flow with extra arguments:**
1. User runs `claude -a work --resume`
2. Shell function evals the switch, then calls `command claude --resume`

**Alternative flow — no shell integration:**
1. User runs `cloak switch work`
2. System prints the `export CLAUDE_CONFIG_DIR=...` command
3. User copies and pastes the export command
4. User runs `claude`
5. Claude Code opens with the selected cloak

**Business rules:**
- All arguments after the account name are passed directly to `claude`
- `claude -a <name>` sets `CLAUDE_CONFIG_DIR` in the **parent shell**, so `whoami` reflects the correct account after Claude exits
- This command requires shell integration — it is the primary incentive for users to set up `eval "$(cloak init)"`
- Without shell integration, the equivalent workflow is `cloak switch <name>` (copy export) + `claude`

---

### UC-09: Context bar (universal status indicator)

**Actor:** Any user running a cloak command.

**Description:** every `cloak` command displays a context bar at the top of its output showing: the command executed, the active profile, and the associated email. This follows Nielsen's Heuristic #1 (Visibility of System Status) and the Starship prompt pattern of context-aware indicators.

**Format:**
```
cloak › <command> · <profile> ‹email› ──────────────────
```

**Examples:**
```
cloak › list · work ‹filipe@company.com› ───────────────
cloak › switch · home ‹filipe@personal.com› ────────────
cloak › whoami · work ‹filipe@company.com› ─────────────
cloak › claude · work ‹filipe@company.com› ─────────────
```

**When no cloak is active:**
```
cloak › list ───────────────────────────────────────────
```

**Business rules:**
- Displayed at the top of every `cloak` command and every `claude` launch (via shell function)
- The trailing bar (`─`) fills to the terminal width
- Goes to stderr (does not interfere with stdout data or --print-env eval)
- Only shown on TTY (suppressed in pipes)
- Command name is bold, profile and email are dim
- When no profile is active, only command name is shown
- The `init` command does NOT show the context bar (its stdout is raw shell code)

---

### UC-10: Auto-switch by project directory

**Actor:** Developer working on multiple projects with different accounts.

**Description:** a `.cloak` file in a project's root directory indicates which profile to use. When the user runs `claude` from that directory, the shell function reads the file and switches to the indicated profile automatically.

**Setup flow:**
1. User navigates to a project directory
2. User runs `cloak bind <name>` (e.g., `cloak bind work`)
3. System creates a `.cloak` file in the current directory containing the profile name
4. From now on, running `claude` in this directory automatically uses that profile

**Main flow (with shell integration):**
1. User runs `claude` in a directory containing a `.cloak` file
2. Shell function reads the `.cloak` file
3. Shell function switches to the indicated profile (eval switch)
4. Claude Code launches with the correct profile

**Alternative flow — no `.cloak` file:**
1. User runs `claude` in a directory without a `.cloak` file
2. Shell function uses the currently active profile (no change)

**Alternative flow — `.cloak` references non-existent profile:**
1. Shell function reads the profile name from `.cloak`
2. Profile does not exist
3. Error message shown, Claude Code does not launch

**Business rules:**
- The `.cloak` file contains only the profile name (single line, no whitespace)
- The file is opt-in — directories without `.cloak` behave as before
- `cloak bind` validates the profile name and checks it exists
- `cloak unbind` removes the `.cloak` file from the current directory
- The `.cloak` file should be added to `.gitignore` (contains environment-specific info)
- Auto-switch is silent — no extra confirmation, just the context bar showing the active profile
- Works with `claude -a` too — explicit `-a` overrides the `.cloak` file
- Pattern follows `.nvmrc`, `.node-version`, `.ruby-version` convention

---

## 5. Full journey flows

### 5.1 First-time setup (direct mode — zero config)

```
$ npm i -g @synth1s/cloak

# Logged in with work account in Claude Code:
$ cloak create work
* Tip: Run this once to enable "claude -a" and "claude account":
   echo 'eval "$(cloak init)"' >> ~/.bashrc && source ~/.bashrc
+ Cloak "work" created.

# /logout + /login with personal account in Claude Code:
$ cloak create home
+ Cloak "home" created.
```

### 5.2 First-time setup (with shell integration)

```
$ npm i -g @synth1s/cloak
$ echo 'eval "$(cloak init)"' >> ~/.bashrc
$ source ~/.bashrc

# Logged in with work account in Claude Code:
$ claude account create work
+ Cloak "work" created.

# /logout + /login with personal account in Claude Code:
$ claude account create home
+ Cloak "home" created.
```

### 5.3 Daily use — with shell integration

```
$ claude -a work
# Claude Code opens wearing the work cloak

# In another terminal:
$ claude -a home
# Claude Code opens wearing the home cloak
```

### 5.4 Daily use — without shell integration

```
$ cloak switch work
Run this command to switch:

  export CLAUDE_CONFIG_DIR=/home/user/.cloak/profiles/work

$ export CLAUDE_CONFIG_DIR=/home/user/.cloak/profiles/work
$ claude
# Claude Code opens wearing the work cloak
```

### 5.5 Check which cloak you're wearing

```
$ cloak whoami
work

$ cloak list
> work (active)
  home
```

### 5.6 Concurrent sessions

```
# Terminal A:
$ claude -a work
# ... working ...

# Terminal B (at the same time):
$ claude -a home
# ... personal use, no conflicts ...
```

---

## 6. Global business rules

### 6.1 Name validation

- Accepted pattern: `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`
- Must start with a letter or number
- Allowed characters: letters, numbers, hyphens, underscores
- Maximum 64 characters

### 6.2 Storage

| Item | Path |
|------|------|
| Base directory | `~/.cloak/` |
| Profiles directory | `~/.cloak/profiles/` |
| Single account directory | `~/.cloak/profiles/<name>/` |

There is no global `current` file. The active cloak is determined by `CLAUDE_CONFIG_DIR` in each shell.

### 6.3 Source file resolution

When creating an account, Cloak needs to locate the current session files:

| `CLAUDE_CONFIG_DIR` set? | Source |
|------|------|
| Yes | `$CLAUDE_CONFIG_DIR/.claude.json` and `$CLAUDE_CONFIG_DIR/settings.json` |
| No | `~/.claude.json` and `~/.claude/settings.json` |

### 6.4 Security

- Account names are validated before any I/O operation
- No path outside `~/.cloak/` should be accessed by account management
- Account files inherit default system permissions

---

## 7. Non-functional requirements

### 7.1 Installation
- Install via `npm install -g @synth1s/cloak`
- All commands work immediately after install via `cloak` binary (no setup required)
- Shell integration (`eval "$(cloak init)"`) is optional — enables `claude account` and `claude -a` syntax
- Requires Node.js >= 18

### 7.2 Performance
- All operations must complete in under 1 second

### 7.3 Compatibility
- macOS, Linux, and Windows (via WSL or Git Bash)
- Supported shells for integration: bash, zsh
- All commands except `switch` work without shell integration via `cloak` binary directly
- `switch` requires shell integration to modify the parent shell's environment
- Shell integration adds `claude account`, `claude -a`, and `cloak switch` support

### 7.4 Dependencies
- Minimal external dependencies
- No native dependencies (no compilation)

### 7.5 Known limitations
- IDE integration (JetBrains, VSCode) may not respect `CLAUDE_CONFIG_DIR` ([Issue #4739](https://github.com/anthropics/claude-code/issues/4739))
- If Anthropic adds native `claude account` or `claude --profile`, the shell integration should be disabled to avoid conflicts
