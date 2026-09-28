"""Validated project policy and non-destructive setup. Stdlib only."""

from __future__ import annotations

import argparse
import copy
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from init_plan import DIRS
from planlib.parse import collect, parse_frontmatter, parse_list, type_of
from planlib.validate import validate_tree


PLUGIN_ROOT = Path(__file__).resolve().parents[2]
DEFAULTS = {
    "schema_version": 1,
    "execution_mode": "subagent",
    "parallelism": "disjoint",
    "tdd": "required",
    "max_review_rounds": 3,
    "test_commands": [],
    "hooks": {"enabled": True},
}
REQUIRED_FILES = {
    "project.md": "Run sdd.py setup to restore missing scaffold files.",
    "INDEX.md": "Run sdd.py setup, then regenerate the board from existing artifacts.",
    "workflow.md": "Run sdd.py setup, then complete the project-owned workflow.",
    "context/platform.md": "Run /ultimate-sdd:context and record the actual project context.",
    "config.json": "Run sdd.py setup to create the project configuration.",
}


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--repo", default=".", help="repository directory (default: cwd)")
    parser.add_argument(
        "--root", default="docs/plan", help="plan root inside --repo (default: docs/plan)"
    )
    parser.add_argument("--json", action="store_true", help="emit a machine-readable JSON result")


def _resolved(path: Path) -> Path:
    try:
        return path.resolve()
    except RuntimeError as exc:
        raise ValueError(f"Cannot resolve path {path}: {exc}") from exc


def _inside(base: Path, path: Path) -> Path:
    resolved = _resolved(path)
    if not resolved.is_relative_to(base):
        raise ValueError(f"Path escapes {base}: {path}")
    return resolved


def resolve_paths(args: argparse.Namespace) -> tuple[Path, Path]:
    repo = _resolved(Path(args.repo))
    if not repo.is_dir():
        raise ValueError(f"Repository must be an existing directory: {repo}")
    requested = Path(args.root)
    root = _inside(repo, requested if requested.is_absolute() else repo / requested)
    if root.exists() and not root.is_dir():
        raise ValueError(f"Plan root must be a directory: {root}")
    return repo, root


def _object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate configuration key: {key}")
        result[key] = value
    return result


def _invalid_constant(value: str) -> None:
    raise ValueError(f"Non-standard JSON value: {value}")


def _validate_config(data: object) -> dict:
    if not isinstance(data, dict):
        raise ValueError("Configuration must be a JSON object")
    unknown = set(data) - set(DEFAULTS)
    if unknown:
        raise ValueError("Unknown configuration keys: " + ", ".join(sorted(unknown)))
    effective = copy.deepcopy(DEFAULTS)
    effective.update(data)
    if type(effective["schema_version"]) is not int or effective["schema_version"] != 1:
        raise ValueError("schema_version must be integer 1; review the configuration before migration")
    for key, allowed in (
        ("execution_mode", {"subagent", "inline"}),
        ("parallelism", {"disjoint", "serial"}),
        ("tdd", {"required", "off"}),
    ):
        if not isinstance(effective[key], str) or effective[key] not in allowed:
            raise ValueError(f"{key} must be one of: {', '.join(sorted(allowed))}")
    rounds = effective["max_review_rounds"]
    if type(rounds) is not int or not 1 <= rounds <= 5:
        raise ValueError("max_review_rounds must be an integer from 1 to 5")
    hooks = effective["hooks"]
    if not isinstance(hooks, dict) or set(hooks) - {"enabled"}:
        raise ValueError("hooks must be an object containing only the enabled key")
    enabled = hooks.get("enabled", True)
    if type(enabled) is not bool:
        raise ValueError("hooks.enabled must be a boolean")
    effective["hooks"] = {"enabled": enabled}
    commands = effective["test_commands"]
    if not isinstance(commands, list):
        raise ValueError("test_commands must be an array of argv arrays, not a shell command")
    for index, command in enumerate(commands):
        if not isinstance(command, list) or not command:
            raise ValueError(f"test_commands[{index}] must be a nonempty argv array")
        if any(not isinstance(arg, str) or _has_controls(arg) for arg in command):
            raise ValueError(f"test_commands[{index}] arguments must be strings without control characters")
        if not command[0].strip():
            raise ValueError(f"test_commands[{index}] must start with a nonempty executable")
    return copy.deepcopy(effective)


def _has_controls(value: str) -> bool:
    return any(ord(char) < 32 or ord(char) == 127 for char in value)


def _read_config(path: Path) -> dict:
    try:
        data = json.loads(
            path.read_text(encoding="utf-8"), object_pairs_hook=_object,
            parse_constant=_invalid_constant,
        )
        return _validate_config(data)
    except (ValueError, RecursionError) as exc:
        raise ValueError(f"Invalid configuration at {path}: {exc}") from exc


def load_config(root: Path) -> dict:
    root = _resolved(root)
    if root.exists() and not root.is_dir():
        raise ValueError(f"Plan root must be a directory: {root}")
    path = root / "config.json"
    _inside(root, path)
    if path.is_symlink():
        raise ValueError(f"Configuration must not be a symbolic link: {path}")
    try:
        path.stat()
    except FileNotFoundError:
        return copy.deepcopy(DEFAULTS)
    return _read_config(path)


def _temporary_text(path: Path, text: str) -> Path:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n", dir=path.parent,
            prefix=f".{path.name}.", suffix=".tmp", delete=False,
        ) as stream:
            temporary = Path(stream.name)
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        return temporary
    except BaseException:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        raise


def atomic_write_json(path: Path, data: object) -> None:
    """Atomically replace machine-owned JSON, staging it in the same directory."""
    text = json.dumps(data, indent=2, ensure_ascii=True, allow_nan=False) + "\n"
    if path.is_symlink():
        raise ValueError(f"Refusing to replace a symbolic link: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = _temporary_text(path, text)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _create_text(path: Path, text: str) -> bool:
    """Publish a new file atomically without replacing a concurrently created file."""
    temporary = _temporary_text(path, text)
    try:
        try:
            os.link(temporary, path)
        except FileExistsError:
            return False
        return True
    finally:
        temporary.unlink(missing_ok=True)


def _check_setup_paths(root: Path) -> None:
    for name in DIRS:
        path = root / name
        _inside(root, path)
        if (path.exists() or path.is_symlink()) and not path.is_dir():
            raise ValueError(f"Setup needs a directory at {path}; preserve or relocate the existing entry")
    files = ["project.md", "INDEX.md", "context/CATALOG.md", "config.json", "workflow.md"]
    files.extend(f"{name}/.gitkeep" for name in DIRS)
    for name in files:
        path = root / name
        _inside(root, path)
        if (path.exists() or path.is_symlink()) and not path.is_file():
            raise ValueError(f"Setup needs a regular file at {path}; preserve or relocate the existing entry")


def _emit(payload: dict, args: argparse.Namespace) -> int:
    print(json.dumps(payload, indent=None if args.json else 2, ensure_ascii=True))
    return 0 if payload["ok"] else 1


def cmd_config(args: argparse.Namespace) -> int:
    repo, root = resolve_paths(args)
    effective = load_config(root)
    return _emit({
        "ok": True, "errors": [], "repo": str(repo), "root": str(root),
        "config": effective, "config_exists": (root / "config.json").is_file(),
    }, args)


def _missing_steps(root: Path) -> list[str]:
    return [f"Missing {name}. {action}" for name, action in REQUIRED_FILES.items()
            if not (root / name).is_file()]


def cmd_setup(args: argparse.Namespace) -> int:
    repo, root = resolve_paths(args)
    effective = load_config(root)  # Validate existing policy before any setup writes.
    if not args.title.strip() or _has_controls(args.title):
        raise ValueError("Project title must be nonempty and on one line without control characters")
    _check_setup_paths(root)
    config_path = root / "config.json"
    workflow_path = root / "workflow.md"
    new_config = None
    new_workflow = None
    if not config_path.exists():
        effective = _read_config(PLUGIN_ROOT / "templates" / "config-template.json")
        new_config = json.dumps(effective, indent=2, ensure_ascii=True) + "\n"
    if not workflow_path.exists():
        new_workflow = (PLUGIN_ROOT / "templates" / "workflow-template.md").read_text(encoding="utf-8")
    existing = {name for name in REQUIRED_FILES if (root / name).exists()}
    result = subprocess.run(
        [sys.executable, str(PLUGIN_ROOT / "scripts" / "init_plan.py"),
         "--root", root.relative_to(repo).as_posix(), "--title", args.title],
        cwd=repo, capture_output=True, text=True, encoding="utf-8", errors="replace",
        env={**os.environ, "PYTHONUTF8": "1", "PYTHONDONTWRITEBYTECODE": "1"}, timeout=60,
    )
    initializer = {"returncode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}
    if result.returncode:
        return _emit({
            "ok": False, "errors": ["Base initializer failed; inspect initializer output and rerun setup."],
            "initializer": initializer,
        }, args)
    if new_config is not None:
        _create_text(config_path, new_config)
    if new_workflow is not None:
        _create_text(workflow_path, new_workflow)
    effective = load_config(root)
    incomplete = _missing_steps(root)
    if not effective["test_commands"]:
        incomplete.append("Complete workflow.md with verified test commands or an explicit manual-test rationale; record applicable argv arrays in config.json.")
    return _emit({
        "ok": True, "errors": [], "repo": str(repo), "root": str(root),
        "created": [name for name in REQUIRED_FILES if name not in existing and (root / name).is_file()],
        "preserved": sorted(existing), "incomplete_steps": incomplete,
        "config": effective, "initializer": initializer,
    }, args)


def _validation_report(root: Path) -> dict:
    # planlib reads Markdown and CHANGE delta paths; check confinement before it does.
    if root.is_dir():
        for path in root.rglob("*"):
            _inside(root, path)
        for path, frontmatter in collect(root):
            if type_of(frontmatter["id"]) == "CHANGE":
                for domain in parse_list(frontmatter.get("deltas")):
                    _inside(root, path.parent / "deltas" / domain)
                    _inside(root, path.parent / "deltas" / f"{domain}.md")
                    _inside(root, path.parent / "deltas" / domain / "spec.md")
    result = validate_tree(root)
    return {"ok": result.ok, "artifacts": result.artifacts,
            "errors": result.errors, "warnings": result.warnings}


def cmd_doctor(args: argparse.Namespace) -> int:
    repo, root = resolve_paths(args)
    errors = []
    warnings = []
    checks = {}
    for name, action in REQUIRED_FILES.items():
        path = root / name
        try:
            _inside(root, path)
            checks[name] = path.is_file()
            if not checks[name]:
                errors.append(f"Missing or non-file {name}. {action}")
            elif not path.read_text(encoding="utf-8").strip():
                errors.append(f"Empty {name}. Restore its project-owned content.")
            elif name == "project.md" and parse_frontmatter(path.read_text(encoding="utf-8")).get("id") != "PROJECT":
                errors.append("project.md must have frontmatter with id: PROJECT; repair it without overwriting project content.")
        except (ValueError, OSError) as exc:
            checks[name] = False
            errors.append(f"Cannot inspect {name}: {exc}")
    effective = None
    try:
        effective = load_config(root)
        if not effective["test_commands"]:
            warnings.append("No test_commands configured. Complete workflow.md with verified commands or a manual-test rationale; no tests were executed.")
    except (ValueError, OSError) as exc:
        errors.append(str(exc))
    try:
        validation = _validation_report(root)
    except (ValueError, OSError, RecursionError) as exc:
        validation = {"ok": False, "artifacts": 0, "errors": [f"Cannot validate plan state: {exc}"], "warnings": []}
    errors.extend(validation["errors"])
    warnings.extend(validation["warnings"])
    return _emit({
        "ok": not errors, "errors": errors, "warnings": warnings,
        "repo": str(repo), "root": str(root), "checks": checks,
        "config": effective, "validation": validation,
    }, args)


def register(subparsers: argparse._SubParsersAction) -> None:
    setup = subparsers.add_parser("setup", help="initialize missing plan files without overwriting project content", allow_abbrev=False)
    add_common(setup)
    setup.add_argument("--title", default="Untitled project", help="project title used only for new scaffold files")
    setup.set_defaults(func=cmd_setup)
    show = subparsers.add_parser("config", help="show validated effective policy; never execute test commands", allow_abbrev=False)
    add_common(show)
    show.set_defaults(func=cmd_config)
    doctor = subparsers.add_parser("doctor", help="check project setup, configuration, and the plan graph without writes", allow_abbrev=False)
    add_common(doctor)
    doctor.set_defaults(func=cmd_doctor)
