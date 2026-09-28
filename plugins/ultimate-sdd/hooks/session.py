"""Fail-soft, opt-in Claude session hooks with bounded recovery context."""

from __future__ import annotations

import contextlib
import json
import math
import re
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True
SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

MAX_JSON_BYTES = 64 * 1024
MAX_JSON_DEPTH = 64
EVENTS = {"session-start": "SessionStart", "pre-compact": "PreCompact"}
ACTIONS = frozenset(
    {"context", "frame", "project", "specify", "scope", "load", "verify",
     "archive", "resume", "explode", "clean"}
)
TARGET = re.compile(
    r"(?:PROJECT|(?:BRIEF|EPIC|REQ|TASK|CHANGE)-[0-9]{1,9}"
    r"|REQ-[0-9]{1,9}/TASK-[0-9]{1,9}|runs/current\.json)"
)

EVENT_WARNING = "ultimate-sdd hook: expected session-start or pre-compact; hook skipped."
INPUT_WARNING = (
    "ultimate-sdd hook: invalid input; expected bounded JSON, a matching event, "
    "and an absolute existing cwd."
)
PATH_WARNING = "ultimate-sdd hook: unsafe or unreadable plan paths; recovery skipped."
CONFIG_WARNING = "ultimate-sdd hook: invalid or unavailable configuration; recovery skipped."
RECOVERY_WARNING = "ultimate-sdd hook: recovery state unavailable or invalid; recovery skipped."
STATE_WARNING = "ultimate-sdd hook: recovery reported a problem; checkpoint not saved."
WRITE_WARNING = "ultimate-sdd hook: recovery checkpoint could not be saved."
OUTPUT_WARNING = "ultimate-sdd hook: session context could not be written."


class _DiscardOutput:
    """Do not forward runtime diagnostics into the hook's output protocol."""

    def write(self, text: str) -> int:
        return len(text)

    def flush(self) -> None:
        pass


def load_config(root: Path) -> dict:
    from sddlib.config import load_config as shared_load_config

    return shared_load_config(root)


def resume_state(repo: Path, root: Path) -> dict:
    from sddlib.recovery import resume_state as shared_resume_state

    return shared_resume_state(repo, root)


def atomic_write_json(path: Path, data: dict) -> None:
    from sddlib.config import atomic_write_json as shared_atomic_write_json

    shared_atomic_write_json(path, data)


def _warn(message: str) -> None:
    try:
        print(message, file=sys.stderr)
    except Exception:
        pass  # A closed stderr must not turn a hook warning into a session failure.


def _unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ValueError("nonfinite number")


def _finite_float(value: str) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("nonfinite number")
    return result


def _json_object(raw: bytes | str) -> dict:
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    if len(raw) > MAX_JSON_BYTES:
        raise ValueError("oversize JSON")
    text = raw.decode("utf-8")
    depth = 0
    quoted = escaped = False
    for char in text:
        if quoted:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in "[{":
            depth += 1
            if depth > MAX_JSON_DEPTH:
                raise ValueError("deep JSON")
        elif char in "]}":
            depth -= 1
    result = json.loads(
        text, object_pairs_hook=_unique_object,
        parse_constant=_reject_constant, parse_float=_finite_float,
    )
    if not isinstance(result, dict):
        raise ValueError("expected object")
    return result


def _input_repo(event: str) -> Path:
    stream = getattr(sys.stdin, "buffer", sys.stdin)
    payload = _json_object(stream.read(MAX_JSON_BYTES + 1))
    if payload.get("hook_event_name") != event:
        raise ValueError("event mismatch")
    cwd = payload.get("cwd")
    if not isinstance(cwd, str) or not cwd.strip():
        raise ValueError("invalid cwd")
    repo = Path(cwd)
    if not repo.is_absolute():
        raise ValueError("relative cwd")
    repo = repo.resolve(strict=True)
    if not repo.is_dir():
        raise ValueError("cwd is not a directory")
    return repo


def _safe_path(repo: Path, path: Path) -> Path:
    current = repo
    resolved = repo
    parts = path.relative_to(repo).parts
    for index, part in enumerate(parts):
        current /= part
        resolved = current.resolve(strict=False)
        resolved.relative_to(repo)
        if current.is_symlink() and not resolved.exists():
            raise ValueError("dangling symlink")
        if index < len(parts) - 1 and resolved.exists() and not resolved.is_dir():
            raise ValueError("parent is not a directory")
    return resolved


def _directory_if_present(path: Path) -> None:
    if path.exists() and not path.is_dir():
        raise ValueError("expected directory")


def _regular_file(path: Path) -> None:
    if not stat.S_ISREG(path.stat().st_mode):
        raise ValueError("expected regular file")


def _discover(repo: Path) -> tuple[Path, Path] | None:
    root = _safe_path(repo, repo / "docs" / "plan")
    _directory_if_present(root)
    config = _safe_path(repo, root / "config.json")
    if config.exists():
        return root, config
    root = _safe_path(repo, repo / ".plan")
    _directory_if_present(root)
    index = _safe_path(repo, root / "INDEX.md")
    if not index.exists():
        return None
    config = _safe_path(repo, root / "config.json")
    if not config.exists():
        return None
    _regular_file(index)
    return root, config


def _snapshot_path(repo: Path, root: Path) -> Path:
    runs = _safe_path(repo, root / "runs")
    _directory_if_present(runs)
    target = runs / "session-recovery.json"
    if target.is_symlink():
        raise ValueError("snapshot must not be a symlink")
    _safe_path(repo, target)
    if target.exists():
        _regular_file(target)
    # Keep the leaf intact so the atomic writer can reject newly introduced links.
    return target


def _projection(state: dict) -> dict[str, str]:
    next_step = state.get("next")
    if not isinstance(next_step, dict):
        next_step = {}
    action = next_step.get("action")
    if not isinstance(action, str) or action not in ACTIONS:
        action = "unknown"
    target = next_step.get("target")
    if not isinstance(target, str) or len(target) > 32 or not TARGET.fullmatch(target):
        target = ""
    return {"action": action, "target": target}


def main(argv: list[str] | None = None) -> int:
    warning = EVENT_WARNING
    try:
        args = sys.argv[1:] if argv is None else argv
        if len(args) != 1 or args[0] not in EVENTS:
            raise ValueError("invalid event")
        event = EVENTS[args[0]]
        warning = INPUT_WARNING
        repo = _input_repo(event)
        warning = PATH_WARNING
        discovered = _discover(repo)
        if discovered is None:
            return 0
        root, config_path = discovered
        warning = CONFIG_WARNING
        _regular_file(config_path)
        with config_path.open("rb") as stream:
            _json_object(stream.read(MAX_JSON_BYTES + 1))
        sink = _DiscardOutput()
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            config = load_config(root)
        if not isinstance(config, dict) or not isinstance(config.get("hooks"), dict):
            raise ValueError("invalid hooks configuration")
        enabled = config["hooks"].get("enabled")
        if type(enabled) is not bool:
            raise ValueError("hooks.enabled must be boolean")
        if not enabled:
            return 0
        warning = PATH_WARNING
        _snapshot_path(repo, root)
        warning = RECOVERY_WARNING
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            state = resume_state(repo, root)
        if not isinstance(state, dict):
            raise ValueError("invalid recovery state")
        if state.get("ok") is False:
            _warn(STATE_WARNING)
            return 0
        next_step = _projection(state)
        summary = (
            f"Ultimate SDD graph recovery: next action={next_step['action']}; "
            f"target={next_step['target'] or 'none'}."
        )
        if event == "SessionStart":
            warning = OUTPUT_WARNING
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": summary + " Use /ultimate-sdd:resume to inspect plan state.",
            }}))
        else:
            warning = PATH_WARNING
            target = _snapshot_path(repo, root)
            snapshot = {
                "schema_version": 1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": "PreCompact",
                "next": next_step,
                "summary": summary,
            }
            warning = WRITE_WARNING
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                atomic_write_json(target, snapshot)
    except Exception:
        _warn(warning)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
