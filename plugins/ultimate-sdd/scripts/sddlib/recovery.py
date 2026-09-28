"""Append-only checkpoints and read-only recovery/rollback previews. Stdlib only."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import uuid
from functools import cmp_to_key
from pathlib import Path, PurePosixPath, PureWindowsPath

from planlib.graph import next_action
from planlib.parse import collect, parse_list

from .config import add_common, atomic_write_json, load_config, resolve_paths

TASK = re.compile(r"REQ-[1-9]\d*/TASK-[1-9]\d*\Z")
TARGET = re.compile(r"(?:REQ|CHANGE)-[1-9]\d*\Z")
FULL_SHA = re.compile(r"(?:[0-9a-f]{40}|[0-9a-f]{64})\Z")
DIGEST = re.compile(r"[0-9a-f]{64}\Z")
SETUP_FILES = ("config.json", "project.md", "INDEX.md", "workflow.md", "context/CATALOG.md", "context/platform.md")
STATE_ERRORS = (ValueError, OSError, RecursionError, RuntimeError, subprocess.SubprocessError)


def check_task(repo: Path, root: Path, selector: str, phase: str = "complete") -> dict:
    # Late import keeps non-Git checkpoints usable while optional hosts load modules.
    try:
        from .gates import check_task as gate
    except ImportError as exc:
        raise ValueError("Evidence gate module unavailable; review freshness cannot be established") from exc
    return gate(repo, root, selector, phase=phase)


def _inside(repo: Path, path: Path) -> Path:
    if not path.resolve().is_relative_to(repo):
        raise ValueError(f"Path escapes repository: {path}")
    return path


def _relative(repo: Path, value: str) -> Path:
    if (not isinstance(value, str) or not value or "\\" in value or ":" in value
            or any(ord(char) < 32 or ord(char) == 127 for char in value)
            or PurePosixPath(value).is_absolute() or PureWindowsPath(value).is_absolute()
            or any(part in {"", ".", "..", ".git"} for part in value.split("/"))):
        raise ValueError(f"Expected a repository-relative file path: {value!r}")
    return _inside(repo, repo / value)


def _paths(repo: Path, root: Path) -> tuple[Path, Path]:
    return resolve_paths(argparse.Namespace(repo=str(repo), root=str(root)))


def _unique_object(pairs: list[tuple[str, object]]) -> dict:
    data = {}
    for key, value in pairs:
        if key in data:
            raise ValueError(f"Duplicate JSON key: {key}")
        data[key] = value
    return data


def _bad_constant(value: str) -> None:
    raise ValueError(f"Invalid JSON constant: {value}")


def _json(repo: Path, path: Path) -> dict:
    _inside(repo, path)
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_object, parse_constant=_bad_constant)
    except (ValueError, RecursionError) as exc:
        raise ValueError(f"Malformed state at {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"State must be a JSON object: {path}")
    return data


def _artifacts(repo: Path, root: Path) -> list:
    # collect() omits documents without IDs. Canonical artifacts must not vanish
    # from a broad rollback target just because their frontmatter is damaged.
    markdown = list(root.rglob("*.md"))
    for path in markdown:
        _inside(repo, path)
    artifacts = collect(root)
    by_path = dict(artifacts)
    for path in markdown:
        parts = path.relative_to(root).parts
        fm = by_path.get(path, {})
        name_flags = re.IGNORECASE if os.name == "nt" else 0
        if Path(parts[0]) == Path("tasks") and not os.path.normcase(path.name).endswith(os.path.normcase(".handoff.md")):
            match = re.match(r"(TASK-[1-9]\d*)(?:-|\.md$)", path.name, name_flags)
            if (len(parts) != 3 or not match or fm.get("id") != match[1].upper()
                    or path.parent != root / "tasks" / fm.get("req", "")
                    or not TASK.fullmatch(f"{fm.get('req', '')}/{match[1].upper()}")):
                raise ValueError(f"Missing or malformed TASK artifact: {path}")
        elif Path(parts[0]) == Path("reqs"):
            match = re.match(r"(REQ-[1-9]\d*)(?:-|\.md$)", path.name, name_flags)
            if len(parts) != 2 or not match or fm.get("id") != match[1].upper():
                raise ValueError(f"Missing or malformed REQ artifact: {path}")
        elif path == root / "project.md" and fm.get("id") != "PROJECT":
            raise ValueError(f"Missing or malformed project frontmatter: {path}")
        elif Path(path.name) == Path("CHANGE.md") and not re.fullmatch(r"CHANGE-[1-9]\d*", fm.get("id", "")):
            raise ValueError(f"Missing or malformed CHANGE artifact: {path}")
    identities = set()
    for path, fm in artifacts:
        fid = fm["id"]
        identity = f"{fm.get('req', '')}/{fid}" if fid.startswith("TASK-") else fid
        if identity in identities:
            raise ValueError(f"Ambiguous artifact identity {identity}: {path}")
        identities.add(identity)
        if fid.startswith("TASK-") and not TASK.fullmatch(identity):
            raise ValueError(f"Malformed TASK identity in {path}")
    return artifacts


def _task(artifacts: list, selector: str) -> tuple:
    if not TASK.fullmatch(selector):
        raise ValueError("Use a qualified task selector: REQ-n/TASK-k")
    req, task = selector.split("/")
    parents = [(p, fm) for p, fm in artifacts if fm["id"] == req]
    matches = [(p, fm) for p, fm in artifacts if fm["id"] == task and fm.get("req") == req]
    if len(parents) != 1 or len(matches) != 1:
        raise ValueError(f"Task or parent missing/ambiguous: {selector}")
    return matches[0]


def _tasks(artifacts: list) -> list[str]:
    return sorted(f"{fm['req']}/{fm['id']}" for _, fm in artifacts if fm["id"].startswith("TASK-"))


def _run(repo: Path, root: Path) -> dict | None:
    path = _inside(repo, root / "runs/current.json")
    if not path.exists():
        return None
    data = _json(repo, path)
    if (not isinstance(data.get("pipeline"), str)
            or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", data["pipeline"])
            or not isinstance(data.get("stage"), str) or not data["stage"]
            or not isinstance(data.get("status"), str) or data["status"] not in {"running", "paused", "done"}
            or not isinstance(data.get("completed"), list)
            or any(not isinstance(item, str) for item in data["completed"])
            or not isinstance(data.get("gates"), list)
            or any(not isinstance(item, dict) for item in data["gates"])
            or not isinstance(data.get("policy"), dict)):
        raise ValueError(f"Malformed pipeline run state: {path}")
    return data


def _git(repo: Path, *args: str, binary: bool = False) -> subprocess.CompletedProcess:
    env = dict(os.environ, GIT_OPTIONAL_LOCKS="0", GIT_NO_REPLACE_OBJECTS="1", GIT_TERMINAL_PROMPT="0")
    return subprocess.run(
        ["git", "--no-pager", "-c", "core.fsmonitor=false", "-C", str(repo), *args],
        capture_output=True, text=not binary, encoding=None if binary else "utf-8",
        timeout=15, env=env,
    )


def _git_ok(repo: Path, *args: str, binary: bool = False):
    result = _git(repo, *args, binary=binary)
    if result.returncode:
        raise ValueError(f"Git could not validate {args[0]} (exit {result.returncode})")
    return result.stdout


def _git_state(repo: Path) -> dict:
    absent = {"available": False, "head": None, "dirty": None, "reason": "Not a Git working tree; rollback preview unavailable."}
    try:
        top = _git(repo, "rev-parse", "--show-toplevel")
    except FileNotFoundError:
        return {**absent, "reason": "Git unavailable; rollback preview unavailable."}
    if top.returncode:
        if "not a git repository" in top.stderr.lower():
            return absent
        raise ValueError(f"Git repository inspection failed (exit {top.returncode})")
    if Path(top.stdout.strip()).resolve() != repo:
        return {**absent, "reason": "--repo must be the Git top-level for commit ownership/rollback."}
    head = _git(repo, "rev-parse", "--verify", "--quiet", "HEAD")
    if head.returncode not in {0, 1}:
        raise ValueError("Cannot inspect Git HEAD")
    sha = head.stdout.strip() if head.returncode == 0 else None
    if sha is not None and not FULL_SHA.fullmatch(sha):
        raise ValueError("Git returned a malformed HEAD hash")
    status = _git_ok(repo, "status", "--porcelain=v1", "--untracked-files=all")
    return {"available": True, "head": sha, "dirty": bool(status), "reason": ""}


def _ancestor(repo: Path, older: str, newer: str) -> bool:
    result = _git(repo, "merge-base", "--is-ancestor", older, newer)
    if result.returncode not in {0, 1}:
        raise ValueError("Cannot establish commit ancestry")
    return result.returncode == 0


def _commit(repo: Path, value: str, git: dict) -> tuple[str, list[str]]:
    if not git["available"] or not git["head"]:
        raise ValueError("A reachable Git commit is required; this repository has no usable HEAD")
    if not re.fullmatch(r"[0-9a-fA-F]{7,64}", value):
        raise ValueError("--commit must be a hexadecimal commit hash (at least 7 characters)")
    sha = _git_ok(repo, "rev-parse", "--verify", f"{value}^{{commit}}").strip()
    if not FULL_SHA.fullmatch(sha):
        raise ValueError("Git returned an invalid full commit hash")
    if not _ancestor(repo, sha, git["head"]):
        raise ValueError(f"Commit is not reachable from current HEAD: {sha}")
    # Raw object headers retain parents even at a shallow-history boundary.
    headers = _git_ok(repo, "cat-file", "-p", sha, binary=True).partition(b"\n\n")[0].splitlines()
    parents = [line[7:].decode("ascii") for line in headers if line.startswith(b"parent ")]
    if (not headers or not headers[0].startswith(b"tree ") or not FULL_SHA.fullmatch(headers[0][5:].decode("ascii"))
            or any(not FULL_SHA.fullmatch(p) for p in parents)):
        raise ValueError(f"Cannot establish raw parents of commit {sha}")
    if len(parents) > 1:
        raise ValueError(f"Merge commit requires manual analysis: {sha}")
    for parent in parents:
        _git_ok(repo, "cat-file", "-e", f"{parent}^{{commit}}")
    output = _git_ok(repo, "diff-tree", "--no-ext-diff", "--no-textconv", "--root", "--no-commit-id", "--name-only", "--no-renames", "-r", "-z", *parents, sha)
    files = [name for name in output.split("\0") if name]
    if not files or len(files) != len(set(files)):
        raise ValueError(f"Commit has empty or ambiguous file scope: {sha}")
    for name in files:
        _relative(repo, name)
    return sha, sorted(files)


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _blob_hash(repo: Path, sha: str, name: str) -> str:
    data = _git_ok(repo, "cat-file", "blob", f"{sha}:{name}", binary=True)
    return hashlib.sha256(data).hexdigest()


def _review_structure(repo: Path, path: Path, task: str, data: dict) -> None:
    """Distinguish corrupt persisted state from ordinary missing/stale evidence.

    This reads the gates schema-v1 storage contract, not its private helpers;
    check_task remains responsible for eligibility and current evidence freshness.
    """
    def require(condition):
        if not condition:
            raise ValueError(f"Malformed review history: {path}")

    def digest(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()

    def valid_hash(value):
        return isinstance(value, str) and DIGEST.fullmatch(value) is not None

    def snapshot(value):
        require(isinstance(value, dict) and set(value) == {"path", "sha256"})
        _relative(repo, value["path"])
        require(valid_hash(value["sha256"]))

    require(set(data) == {"schema_version", "task", "history"})
    require(type(data["schema_version"]) is int and data["schema_version"] == 1 and data["task"] == task)
    require(isinstance(data["history"], list) and bool(data["history"]))
    fields = {"sequence", "stage", "status", "author", "reviewer", "recorded_at", "evidence", "source_hashes",
              "contract", "contract_fingerprint", "spec_review", "previous_hash", "record_hash"}
    previous, spec = None, None
    for sequence, entry in enumerate(data["history"], 1):
        require(isinstance(entry, dict) and set(entry) == fields)
        require(type(entry["sequence"]) is int and entry["sequence"] == sequence)
        require(entry["stage"] in ("spec", "quality") and entry["status"] in ("pass", "fail"))
        for key in ("author", "reviewer"):
            require(isinstance(entry[key], str) and bool(entry[key].strip()) and entry[key] == entry[key].strip()
                    and not any(ord(char) < 32 for char in entry[key]))
        require(entry["author"].casefold() != entry["reviewer"].casefold())
        require(isinstance(entry["recorded_at"], str))
        try:
            require(dt.datetime.fromisoformat(entry["recorded_at"]).utcoffset() is not None)
        except ValueError as exc:
            raise ValueError(f"Malformed review timestamp: {path}") from exc
        snapshot(entry["evidence"])
        sources = entry["source_hashes"]
        require(isinstance(sources, dict) and bool(sources))
        for name, hashed in sources.items():
            _relative(repo, name)
            require(valid_hash(hashed))
        require(isinstance(entry["contract"], dict) and set(entry["contract"]) == {"req", "task"})
        for value in entry["contract"].values():
            snapshot(value)
        require(entry["contract_fingerprint"] == digest(entry["contract"]))
        require(entry["previous_hash"] == previous)
        require(entry["record_hash"] == digest({k: v for k, v in entry.items() if k != "record_hash"}))
        if entry["stage"] == "quality":
            require(spec is not None and spec["status"] == "pass" and entry["spec_review"] == spec["record_hash"])
            require(all(entry[k] == spec[k] for k in ("author", "source_hashes", "contract", "contract_fingerprint")))
        else:
            require(entry["spec_review"] is None)
            spec = entry
        previous = entry["record_hash"]


def _reviews(repo: Path, root: Path, task: str) -> tuple[Path, str, list, dict]:
    path = _inside(repo, root / "verify" / f"{task.replace('/', '-')}.reviews.json")
    if not path.exists():
        return path, "", [], check_task(repo, root, task, phase="complete")
    digest = _hash(path)
    data = _json(repo, path)
    _review_structure(repo, path, task, data)
    result = check_task(repo, root, task, phase="complete")
    if _hash(path) != digest:
        raise ValueError("Review history changed during recovery; retry after writers finish")
    return path, digest, data["history"], result


def _scope(repo: Path, root: Path, task: str, sha: str, files: list[str]) -> tuple[dict | None, list[str]]:
    if not files:
        return None, ["No --files declaration; commit association is recorded but scope is unproven."]
    review_path, digest, history, result = _reviews(repo, root, task)
    if not result.get("ok"):
        return None, ["Complete evidence gate did not pass; ownership scope is unproven.", *result.get("errors", [])]
    quality = next((entry for entry in reversed(history) if entry.get("stage") == "quality"), {})
    reviewed = quality.get("source_hashes")
    if (quality.get("status") != "pass" or not isinstance(reviewed, dict) or not reviewed
            or not isinstance(quality.get("record_hash"), str) or not DIGEST.fullmatch(quality["record_hash"])):
        return None, ["No verifiable reviewed source scope; rollback must be analyzed manually."]
    for name in reviewed:
        _relative(repo, name)
    if not set(files).issubset(reviewed):
        return None, ["Commit file scope extends beyond current passing review evidence."]
    snapshot = {}
    for name in files:
        path = _relative(repo, name)
        if not path.is_file():
            return None, [f"Reviewed source file is missing: {name}"]
        snapshot[name] = _hash(path)
        if snapshot[name] != reviewed[name] or snapshot[name] != _blob_hash(repo, sha, name):
            return None, [f"Reviewed bytes do not match commit blob: {name}"]
    if _hash(review_path) != digest:
        raise ValueError("Review history changed during checkpoint; retry after writers finish")
    return {"files": snapshot, "review_scope": sorted(reviewed), "review": {
        "path": review_path.relative_to(repo).as_posix(), "sha256": digest, "record_hash": quality["record_hash"],
    }}, []


def _checkpoint_valid(repo: Path, path: Path, data: dict) -> None:
    required = {"schema_version", "task", "timestamp", "next", "git", "commit", "files", "scope", "scope_errors"}
    if (set(data) != required or type(data.get("schema_version")) is not int or data["schema_version"] != 1
            or not isinstance(data.get("task"), str) or not TASK.fullmatch(data["task"])):
        raise ValueError(f"Malformed checkpoint identity/schema: {path}")
    try:
        stamp = dt.datetime.fromisoformat(data["timestamp"])
        if stamp.utcoffset() is None:
            raise ValueError("timezone required")
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Malformed checkpoint timestamp: {path}") from exc
    nxt = data["next"]
    if not isinstance(nxt, dict) or any(not isinstance(nxt.get(k), str) for k in ("action", "command", "target", "reason")):
        raise ValueError(f"Malformed checkpoint Next: {path}")
    git = data["git"]
    if (not isinstance(git, dict) or type(git.get("available")) is not bool
            or (git.get("head") is not None and (not isinstance(git["head"], str) or not FULL_SHA.fullmatch(git["head"])))
            or (git.get("dirty") is not None and type(git["dirty"]) is not bool)):
        raise ValueError(f"Malformed checkpoint Git observation: {path}")
    commit = data["commit"]
    if commit is not None and (not isinstance(commit, str) or not FULL_SHA.fullmatch(commit)):
        raise ValueError(f"Malformed checkpoint commit: {path}")
    files = data["files"]
    if (not isinstance(files, list) or any(not isinstance(f, str) for f in files)
            or len(files) != len(set(files)) or (files and commit is None)):
        raise ValueError(f"Malformed checkpoint files: {path}")
    for name in files:
        _relative(repo, name)
    if not isinstance(data["scope_errors"], list) or any(not isinstance(e, str) for e in data["scope_errors"]):
        raise ValueError(f"Malformed checkpoint scope errors: {path}")
    scope = data["scope"]
    if scope is None:
        return
    if (not commit or not files or not isinstance(scope, dict) or set(scope) != {"files", "review_scope", "review"}
            or not isinstance(scope["files"], dict) or set(scope["files"]) != set(files)
            or any(not isinstance(h, str) or not DIGEST.fullmatch(h) for h in scope["files"].values())
            or not isinstance(scope["review_scope"], list) or any(not isinstance(f, str) for f in scope["review_scope"])
            or not set(files).issubset(scope["review_scope"])
            or not isinstance(scope["review"], dict) or set(scope["review"]) != {"path", "sha256", "record_hash"}
            or any(not isinstance(scope["review"][k], str) or not DIGEST.fullmatch(scope["review"][k]) for k in ("sha256", "record_hash"))):
        raise ValueError(f"Malformed checkpoint evidence scope: {path}")
    _relative(repo, scope["review"]["path"])
    for name in scope["review_scope"]:
        _relative(repo, name)


def _checkpoints(repo: Path, root: Path) -> list[dict]:
    folder = _inside(repo, root / "runs/checkpoints")
    if not folder.exists():
        return []
    if not folder.is_dir():
        raise ValueError(f"Checkpoint store must be a directory: {folder}")
    records = []
    for path in sorted(folder.glob("*.json")):
        data = _json(repo, path)
        _checkpoint_valid(repo, path, data)
        records.append({**data, "path": path.relative_to(repo).as_posix()})
    return sorted(records, key=lambda d: (dt.datetime.fromisoformat(d["timestamp"]), d["path"]))


def _summary(records: list[dict]) -> dict:
    latest = {}
    for data in records:
        latest[data["task"]] = data
    return {"count": len(records), "latest": records[-1] if records else None, "latest_by_task": list(latest.values())}


def resume_state(repo: Path, root: Path) -> dict:
    """Read current graph, setup gaps, review freshness and checkpoints; never write."""
    try:
        repo, root = _paths(repo, root)
        config = load_config(root)
        artifacts = _artifacts(repo, root)
        run = _run(repo, root)
        records = _checkpoints(repo, root)
        missing = [name for name in SETUP_FILES if not _inside(repo, root / name).is_file()]
        gaps = [] if config["test_commands"] else ["No explicit test_commands configured; establish the project's verification commands."]
        reviews = []
        for task in _tasks(artifacts):
            _task(artifacts, task)
            _path, _digest, _history, result = _reviews(repo, root, task)
            reviews.append({"task": task, "ok": result.get("ok") is True, "errors": result.get("errors", [])})
        handoff = _inside(repo, root / "HANDOFF.md")
        return {"ok": True, "errors": [], "next": next_action(root, artifacts),
                "setup": {"complete": not missing and not gaps, "missing": missing, "gaps": gaps},
                "reviews": reviews, "checkpoints": _summary(records), "git": _git_state(repo),
                "handoff": {"path": handoff.relative_to(repo).as_posix(), "exists": handoff.is_file()}, "run": run}
    except STATE_ERRORS as exc:
        return {"ok": False, "errors": [str(exc)]}


def _emit(args: argparse.Namespace, data: dict) -> int:
    # Both modes stay structured: scripts, hooks and humans see the same failure details.
    print(json.dumps(data, indent=2, ensure_ascii=True))
    return 0 if data["ok"] else 1


def cmd_resume(args: argparse.Namespace) -> int:
    try:
        repo, root = resolve_paths(args)
        data = resume_state(repo, root)
    except STATE_ERRORS as exc:
        data = {"ok": False, "errors": [str(exc)]}
    return _emit(args, data)


def cmd_checkpoint(args: argparse.Namespace) -> int:
    try:
        repo, root = resolve_paths(args)
        load_config(root)
        artifacts = _artifacts(repo, root)
        _task(artifacts, args.task)
        _run(repo, root)
        _checkpoints(repo, root)
        files = args.files or []
        if files and not args.commit:
            raise ValueError("--files requires an explicit --commit")
        if len(files) != len(set(files)):
            raise ValueError("--files must not contain duplicates")
        for name in files:
            _relative(repo, name)
        git = _git_state(repo)
        commit, scope, warnings = None, None, []
        if args.commit:
            commit, changed = _commit(repo, args.commit, git)
            if files and sorted(files) != changed:
                raise ValueError("--files must name exactly all files changed by the explicit commit")
            scope, warnings = _scope(repo, root, args.task, commit, sorted(files))
        now = dt.datetime.now(dt.timezone.utc)
        data = {"schema_version": 1, "task": args.task, "timestamp": now.isoformat(),
                "next": next_action(root, artifacts), "git": git, "commit": commit,
                "files": sorted(files), "scope": scope, "scope_errors": warnings}
        folder = _inside(repo, root / "runs/checkpoints")
        path = _inside(repo, folder / f"{now.strftime('%Y%m%dT%H%M%S%fZ')}-{uuid.uuid4().hex}.json")
        if path.exists():
            raise ValueError("Checkpoint already exists; refusing to overwrite it")
        atomic_write_json(path, data)
        return _emit(args, {"ok": True, "errors": [], "checkpoint": path.relative_to(repo).as_posix(), "warnings": warnings, "state": data})
    except STATE_ERRORS as exc:
        return _emit(args, {"ok": False, "errors": [str(exc)]})


def _selected(artifacts: list, task: str | None, target: str | None) -> list[str]:
    if task:
        _task(artifacts, task)
        return [task]
    if not target or not TARGET.fullmatch(target):
        raise ValueError("Use --task REQ-n/TASK-k or --target REQ-n|CHANGE-n")
    matches = [fm for _, fm in artifacts if fm["id"] == target]
    if len(matches) != 1:
        raise ValueError(f"Target missing/ambiguous: {target}")
    reqs = [target]
    if target.startswith("CHANGE-"):
        reqs = parse_list(matches[0].get("reqs"))
        linked = [fm["id"] for _, fm in artifacts if fm.get("change") == target and fm["id"].startswith("REQ-")]
        if not reqs or set(reqs) != set(linked):
            raise ValueError(f"CHANGE/REQ associations are missing or ambiguous: {target}")
    selected = []
    for req in reqs:
        children = [s for s in _tasks(artifacts) if s.split("/")[0] == req]
        if not children:
            raise ValueError(f"No tasks for {req}; nothing can be inferred from Git history")
        for child in children:
            _task(artifacts, child)
        selected.extend(children)
    return sorted(selected)


def _preview(repo: Path, root: Path, task: str | None, target: str | None) -> dict:
    repo, root = _paths(repo, root)
    load_config(root)
    artifacts = _artifacts(repo, root)
    selected = _selected(artifacts, task, target)
    records = _checkpoints(repo, root)
    git = _git_state(repo)
    if not git["available"] or not git["head"]:
        raise ValueError("Rollback preview unavailable without a Git HEAD")
    if git["dirty"]:
        raise ValueError("Working tree is dirty (including untracked files); no rollback commands are safe to propose")
    associations = {}
    for record in records:
        if record["commit"]:
            associations.setdefault(record["commit"], []).append(record)
    selected_commits = {}
    for selector in selected:
        owned = {sha: rows for sha, rows in associations.items() if any(r["task"] == selector for r in rows)}
        if not owned:
            raise ValueError(f"No explicit checkpoint commit association for {selector}; HEAD is observation only")
        review_path, review_digest, history, gate = _reviews(repo, root, selector)
        if not gate.get("ok"):
            raise ValueError(f"Current completion evidence is not fresh for {selector}: {'; '.join(gate.get('errors', []))}")
        for sha, rows in owned.items():
            if len({r["task"] for r in rows}) != 1:
                raise ValueError(f"Commit is associated with multiple tasks: {sha}")
            resolved, changed = _commit(repo, sha, git)
            if resolved != sha:
                raise ValueError(f"Commit identity changed: {sha}")
            if any(r["files"] and r["files"] != changed for r in rows):
                raise ValueError(f"Conflicting checkpoint/commit scopes: {sha}")
            proven = [r for r in rows if r["scope"] is not None]
            if not proven:
                raise ValueError(f"Ownership scope is unproven for {sha}; passing scoped evidence was not checkpointed")
            for record in proven:
                scope = record["scope"]
                quality = next((e for e in history if e.get("record_hash") == scope["review"]["record_hash"]), {})
                sources = quality.get("source_hashes", {})
                if (record["files"] != changed or scope["review"]["path"] != review_path.relative_to(repo).as_posix()
                        or quality.get("stage") != "quality" or quality.get("status") != "pass"
                        or not isinstance(sources, dict) or sorted(sources) != scope["review_scope"]
                        or any(sources.get(name) != scope["files"][name] for name in changed)):
                    raise ValueError(f"Checkpoint evidence does not match validated review history: {sha}")
                for name in changed:
                    if _blob_hash(repo, sha, name) != scope["files"][name]:
                        raise ValueError(f"Commit blob differs from checkpointed review scope: {sha} {name}")
            selected_commits[sha] = selector
        if _hash(review_path) != review_digest:
            raise ValueError("Review history changed during preview; retry after writers finish")

    def newest_first(left: str, right: str) -> int:
        if left == right:
            return 0
        if _ancestor(repo, left, right):
            return 1
        if _ancestor(repo, right, left):
            return -1
        raise ValueError("Selected commits have incomparable ancestry; rollback ordering requires manual analysis")

    commits = sorted(selected_commits, key=cmp_to_key(newest_first))
    if _git_state(repo) != git:
        raise ValueError("Git HEAD or working tree changed during preview; run it again on a stable clean tree")
    return {"ok": True, "errors": [], "preview_only": True, "target": task or target,
            "tasks": selected, "commits": [{"commit": sha, "task": selected_commits[sha]} for sha in commits],
            "commands": [f"git revert {sha}" for sha in commits],
            "warnings": ["Read-only proposal, not execution authorization or a conflict-free guarantee. Review intervening changes and obtain explicit approval before any Git mutation."]}


def cmd_revert_plan(args: argparse.Namespace) -> int:
    try:
        repo, root = resolve_paths(args)
        data = _preview(repo, root, args.task, args.target)
    except STATE_ERRORS as exc:
        data = {"ok": False, "errors": [str(exc)], "preview_only": True, "commands": []}
    return _emit(args, data)


def register(subparsers) -> None:
    parser = subparsers.add_parser("checkpoint", help="Append a machine checkpoint for an existing task")
    add_common(parser)
    parser.add_argument("--task", required=True, help="REQ-n/TASK-k")
    parser.add_argument("--commit", help="Explicit hexadecimal commit association, not implicit HEAD ownership")
    parser.add_argument("--files", nargs="+", help="Exact repository-relative commit file scope, backed by passing reviews")
    parser.set_defaults(func=cmd_checkpoint)
    parser = subparsers.add_parser("resume", help="Read current graph, setup gaps, checkpoints and review freshness")
    add_common(parser)
    parser.set_defaults(func=cmd_resume)
    parser = subparsers.add_parser("revert-plan", help="Read-only preview of explicitly associated task commits")
    add_common(parser)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--task", help="REQ-n/TASK-k")
    group.add_argument("--target", help="REQ-n or CHANGE-n; every contained task needs explicit associations")
    parser.set_defaults(func=cmd_revert_plan)
