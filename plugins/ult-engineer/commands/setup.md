---
description: Check and install the external tools ult-engineer skills rely on — ast-grep, semgrep, dap, Node/npx, knip, jq — and report what's ready.
argument-hint: [--check-only to report without installing]
---

Verify the toolchain behind this plugin's skills, then fix gaps ($ARGUMENTS may include `--check-only`).

1. Probe each tool with `command -v` / version calls and build a status table:
   - `jq` — required by the pre-flight hook and several scripts.
   - `ast-grep` — powers `ast-grep-search`, `code-antipatterns`, `code-hidden-failures` rules.
   - `semgrep` — powers `semgrep-scan`.
   - `dap` — powers `debugging-code` (interactive DAP debugging).
   - `node`/`npx` — powers `debug-agent` (`npx debug-agent`) and `knip-dead-code` (`npx knip`).
   - Language debug backends only if relevant to this repo: `debugpy` (Python), `dlv` (Go), `js-debug` (Node), `codelldb` (Rust/C++) — see `skills/debugging-code/references/installing-debuggers.md`.
2. If `--check-only` was passed, print the table and stop.
3. Otherwise, for each missing tool, propose the install command and ask before running anything that changes the machine:
   - `ast-grep`: `npm i -g @ast-grep/cli` or `brew install ast-grep` or `cargo install ast-grep --locked`.
   - `semgrep`: `pip install semgrep` or `brew install semgrep`.
   - `dap`: `bash ${CLAUDE_PLUGIN_ROOT}/skills/debugging-code/scripts/install-dap.sh` (or `brew install AlmogBaku/tap/dap`, or `go install github.com/AlmogBaku/debug-skill/cmd/dap@latest`).
   - `knip`: no install needed — invoked as `npx knip` per run.
   - `jq`: system package manager (`apt-get install jq` / `brew install jq`).
4. Re-probe after installs and print the final table: tool | version | status | skills unlocked.
5. Note the hook escape hatch: setting `ULT_ENGINEER_SKIP_HOOKS=1` silences the pre-flight cue hook for a session.
