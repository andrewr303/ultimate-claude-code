"""Local evidence gates; declared identities are not process provenance.

Review history is hash-linked to detect malformed or casually edited records, not
signed against a malicious local writer. Evidence hashes prove freshness, not
truthfulness, test coverage, or that a separate reviewer process actually ran.
Each recorded failure consumes one repair round, across both review stages.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
from pathlib import Path, PurePosixPath

from planlib.parse import FM_RE, collect, parse_list, readiness_int

from .config import add_common, atomic_write_json, load_config, resolve_paths

TASK_RE = re.compile(r"(REQ-[1-9][0-9]*)/(TASK-[1-9][0-9]*)\Z")
REQ_RE = re.compile(r"REQ-[1-9][0-9]*\Z")
LOCAL_TASK_RE = re.compile(r"TASK-[1-9][0-9]*\Z")
CHANGE_RE = re.compile(r"CHANGE-[1-9][0-9]*\Z")
SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")
ENTRY_KEYS = {
    "sequence", "stage", "status", "author", "reviewer", "recorded_at",
    "evidence", "source_hashes", "contract", "contract_fingerprint",
    "spec_review", "previous_hash", "record_hash",
}
LIMITATION = "Checks freshness and declared identities, not independent process provenance or truthful evidence."


class GateError(ValueError):
    pass


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _json_hash(value) -> str:
    return _digest(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def _relative(raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip() or "\x00" in raw or ":" in raw:
        raise GateError("paths must be nonempty repository-relative paths")
    value = raw.replace("\\", "/")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise GateError(f"path must stay inside the repository: {raw!r}")
    return path.as_posix()


def _inside(path: Path, boundary: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(boundary.resolve()):
        raise GateError(f"path escapes {boundary}: {path}")
    return path


def _file(repo: Path, raw: str, *, evidence: bool = False) -> dict:
    name = _relative(raw)
    path = _inside(repo / name, repo)
    if not path.is_file():
        raise GateError(f"missing or non-file {'evidence' if evidence else 'source'}: {name}")
    data = path.read_bytes()
    if evidence and not data.strip():
        raise GateError(f"evidence must be nonempty: {name}")
    return {"path": name, "sha256": _digest(data)}


def _identity(raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip() or any(ord(c) < 32 for c in raw):
        raise GateError("author and reviewer must be nonempty identity labels")
    return raw.strip()


def _selector(selector: str) -> tuple[str, str]:
    hit = TASK_RE.fullmatch(selector) if isinstance(selector, str) else None
    if not hit:
        raise GateError("task must be exactly REQ-n/TASK-k with positive integer IDs")
    return hit.group(1), hit.group(2)


def _ids(fm: dict, key: str) -> list[str]:
    raw = fm.get(key, "[]")
    if not re.fullmatch(r"\[[^\[\]\n]*\](?:\s*#.*)?", raw):
        raise GateError(f"{fm.get('id')}: {key} must be an inline ID list")
    values = parse_list(raw)
    if len(values) != len(set(values)):
        raise GateError(f"{fm.get('id')}: duplicate {key} IDs")
    return values


def _artifacts(repo: Path, root: Path) -> list:
    # Validate containment before planlib.collect reads any Markdown. TASK IDs
    # remain REQ-scoped below; planlib.by_id_map alone would conflate TASK-1s.
    for path in root.rglob("*"):
        # Resolve directories too: Windows junctions are not is_symlink(), and
        # globbing Markdown is case-insensitive on Windows (.MD is an artifact).
        _inside(path, root)
        _inside(path, repo)
    artifacts = collect(root)
    for path, fm in artifacts:
        text = path.read_text(encoding="utf-8")
        match = FM_RE.match(text)
        keys = []
        for line in match.group(1).splitlines():
            if line.strip() and not line.lstrip().startswith("#") and ":" in line:
                keys.append(line.split(":", 1)[0].strip())
        if len(keys) != len(set(keys)):
            raise GateError(f"duplicate frontmatter keys in {path}")
    return artifacts


def _one(artifacts: list, fid: str, *, req: str | None = None) -> tuple:
    matches = [(p, fm) for p, fm in artifacts if fm.get("id") == fid and (req is None or fm.get("req") == req)]
    if len(matches) != 1:
        raise GateError(f"{'missing' if not matches else 'ambiguous'} artifact: {req + '/' if req else ''}{fid}")
    return matches[0]


def _task_location(root: Path, path: Path, req_id: str) -> None:
    if path.parent != root / "tasks" / req_id:
        raise GateError(f"TASK is outside its parent REQ task directory: {path}")


def _blockers(artifacts: list, root: Path, fm: dict, *, req_id: str | None = None, stack: tuple = ()) -> None:
    key = f"{req_id}/{fm['id']}" if req_id else fm["id"]
    if key in stack:
        raise GateError("dependency cycle: " + " -> ".join((*stack, key)))
    for blocker in _ids(fm, "blocked_by"):
        if req_id:
            local = blocker[len(req_id) + 1:] if blocker.startswith(req_id + "/") else blocker
            if not LOCAL_TASK_RE.fullmatch(local):
                raise GateError(f"{key}: task blocker must be a TASK in the same REQ: {blocker}")
            path, other = _one(artifacts, local, req=req_id)
            _task_location(root, path, req_id)
        else:
            if not REQ_RE.fullmatch(blocker):
                raise GateError(f"{key}: requirement blocker must be a REQ ID: {blocker}")
            _path, other = _one(artifacts, blocker)
        if other.get("status") != "done":
            raise GateError(f"{key}: blocker {blocker} is not done")
        _blockers(artifacts, root, other, req_id=req_id, stack=(*stack, key))


def _paths(repo: Path, root: Path) -> tuple[Path, Path, dict]:
    repo, root = resolve_paths(argparse.Namespace(repo=str(repo), root=str(root)))
    if not root.is_dir():
        raise GateError(f"plan root does not exist: {root}")
    _inside(root / "config.json", repo)
    return repo, root, load_config(root)


def _task(repo: Path, root: Path, selector: str, phase: str) -> tuple:
    req_id, task_id = _selector(selector)
    if phase not in {"load", "complete"}:
        raise GateError("phase must be load or complete")
    artifacts = _artifacts(repo, root)
    req_path, req = _one(artifacts, req_id)
    task_path, task = _one(artifacts, task_id, req=req_id)
    if req_path.parent != root / "reqs":
        raise GateError(f"REQ is outside reqs/: {req_path}")
    _task_location(root, task_path, req_id)
    if readiness_int(req) not in {4, 5}:
        raise GateError(f"{req_id}: readiness must be 4 or 5")
    req_statuses = {"ready", "in-progress", "review"}
    task_statuses = {"planned", "ready", "in-progress", "sent-back"}
    if phase == "complete":
        req_statuses.add("done")
        task_statuses.add("done")
    if req.get("status") not in req_statuses:
        raise GateError(f"{req_id}: status {req.get('status')!r} is ineligible for {phase}")
    if task.get("status") not in task_statuses:
        raise GateError(f"{selector}: status {task.get('status')!r} is ineligible for {phase}")
    _blockers(artifacts, root, req)
    _blockers(artifacts, root, task, req_id=req_id)
    return req_path, task_path


def _contract_file(repo: Path, path: Path) -> dict:
    text = path.read_bytes().decode("utf-8")
    if not FM_RE.match(text):
        raise GateError(f"missing frontmatter in {path}")
    lines = text.splitlines(keepends=True)
    end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    # Keep every byte except these two frontmatter fields, including body text
    # that happens to start with 'status:' or 'updated:'.
    body = "".join(
        line for i, line in enumerate(lines)
        if not (0 < i < end and re.match(r"^[ \t]*(?:status|updated)[ \t]*:", line))
    )
    return {"path": path.relative_to(repo).as_posix(), "sha256": _digest(body.encode("utf-8"))}


def _contract(repo: Path, paths: tuple) -> dict:
    return {"req": _contract_file(repo, paths[0]), "task": _contract_file(repo, paths[1])}


def _record_path(repo: Path, root: Path, selector: str) -> Path:
    req_id, task_id = _selector(selector)
    path = root / "verify" / f"{req_id}-{task_id}.reviews.json"
    _inside(path, root)
    return _inside(path, repo)


def _object(value, keys: set, label: str) -> None:
    if not isinstance(value, dict) or set(value) != keys:
        raise GateError(f"malformed review {label}: expected keys {', '.join(sorted(keys))}")


def _hash(value) -> bool:
    return isinstance(value, str) and HASH_RE.fullmatch(value) is not None


def _snapshot_file(value, label: str) -> None:
    _object(value, {"path", "sha256"}, label)
    if _relative(value["path"]) != value["path"] or not _hash(value["sha256"]):
        raise GateError(f"malformed review {label} path/hash")


def _same_snapshot(spec: dict, review: dict) -> bool:
    return all(spec[key] == review[key] for key in ("author", "source_hashes", "contract", "contract_fingerprint"))


def _unique_json(pairs: list) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise GateError(f"duplicate JSON key in review history: {key}")
        result[key] = value
    return result


def _history(path: Path, selector: str) -> list[dict]:
    if not path.exists():
        if path.is_symlink():
            raise GateError(f"broken review history symlink: {path}")
        return []
    data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_json)
    _object(data, {"schema_version", "task", "history"}, "document")
    if type(data["schema_version"]) is not int or data["schema_version"] != 1 or data["task"] != selector:
        raise GateError("review history schema version or task identity mismatch")
    history = data["history"]
    if not isinstance(history, list) or not history:
        raise GateError("review history must be a nonempty ordered list")
    previous = None
    spec = None
    for sequence, entry in enumerate(history, 1):
        _object(entry, ENTRY_KEYS, "entry")
        if type(entry["sequence"]) is not int or entry["sequence"] != sequence:
            raise GateError("review history sequence is not ordered")
        if entry["stage"] not in ("spec", "quality") or entry["status"] not in ("pass", "fail"):
            raise GateError("malformed review stage/status")
        author, reviewer = _identity(entry["author"]), _identity(entry["reviewer"])
        if author != entry["author"] or reviewer != entry["reviewer"] or author.casefold() == reviewer.casefold():
            raise GateError("reviewer must differ from author (no self review)")
        if not isinstance(entry["recorded_at"], str):
            raise GateError("malformed review timestamp")
        if dt.datetime.fromisoformat(entry["recorded_at"]).tzinfo is None:
            raise GateError("review timestamp must include a timezone")
        _snapshot_file(entry["evidence"], "evidence")
        sources = entry["source_hashes"]
        if not isinstance(sources, dict) or not sources:
            raise GateError("review source_hashes must be a nonempty object")
        for name, digest in sources.items():
            if _relative(name) != name or not _hash(digest):
                raise GateError("malformed review source path/hash")
        _object(entry["contract"], {"req", "task"}, "contract")
        for kind in ("req", "task"):
            _snapshot_file(entry["contract"][kind], kind)
        if not _hash(entry["contract_fingerprint"]) or entry["contract_fingerprint"] != _json_hash(entry["contract"]):
            raise GateError("review contract fingerprint mismatch")
        if entry["previous_hash"] != previous:
            raise GateError("review history hash chain is broken")
        expected = _json_hash({k: v for k, v in entry.items() if k != "record_hash"})
        if not _hash(entry["record_hash"]) or entry["record_hash"] != expected:
            raise GateError("review record hash mismatch (record edited or corrupted)")
        if entry["stage"] == "quality":
            if not spec or spec["status"] != "pass" or entry["spec_review"] != spec["record_hash"]:
                raise GateError("quality review must reference the current passing spec review")
            if not _same_snapshot(spec, entry):
                raise GateError("quality review must use the same author, source scope and contract as spec review")
        else:
            if entry["spec_review"] is not None:
                raise GateError("spec review cannot reference another spec review")
            spec = entry
        previous = entry["record_hash"]
    return history


def _fresh(repo: Path, contract: dict, entry: dict) -> list[str]:
    errors = []
    if entry["contract"] != contract or entry["contract_fingerprint"] != _json_hash(contract):
        errors.append(f"{entry['stage']} review is stale: REQ/TASK contract changed")
    for name, expected in entry["source_hashes"].items():
        try:
            if _file(repo, name)["sha256"] != expected:
                errors.append(f"{entry['stage']} review is stale: source changed: {name}")
        except (ValueError, OSError, RuntimeError) as exc:
            errors.append(str(exc))
    try:
        if _file(repo, entry["evidence"]["path"], evidence=True) != entry["evidence"]:
            errors.append(f"{entry['stage']} review is stale: evidence changed")
    except (ValueError, OSError, RuntimeError) as exc:
        errors.append(str(exc))
    return errors


def _latest(history: list[dict], stage: str) -> dict | None:
    return next((entry for entry in reversed(history) if entry["stage"] == stage), None)


def _escalation(history: list[dict], config: dict) -> dict:
    failures = sum(entry["status"] == "fail" for entry in history)
    maximum = config["max_review_rounds"]
    return {"failed_rounds": failures, "max_review_rounds": maximum, "escalation_required": failures >= maximum}


def _cap_error() -> str:
    return "review round cap reached; escalation required: stop automatic repairs and request human resolution"


def check_task(repo: Path, root: Path, selector: str, phase: str = "complete") -> dict:
    """Check graph eligibility and, on completion, current snapshot-bound reviews."""
    result = {"ok": False, "errors": [], "task": selector, "phase": phase, "limitation": LIMITATION}
    try:
        repo, root, config = _paths(repo, root)
        paths = _task(repo, root, selector, phase)
        history = _history(_record_path(repo, root, selector), selector)
        result.update(_escalation(history, config))
        if result["escalation_required"]:
            result["errors"].append(_cap_error())
        if phase == "complete":
            contract = _contract(repo, paths)
            spec, quality = _latest(history, "spec"), _latest(history, "quality")
            if not spec or spec["status"] != "pass":
                result["errors"].append("a current passing spec review is required")
            else:
                result["errors"].extend(_fresh(repo, contract, spec))
            if not quality or quality["status"] != "pass":
                result["errors"].append("a current passing quality review is required")
            else:
                if not spec or quality["spec_review"] != spec["record_hash"] or quality["sequence"] <= spec["sequence"]:
                    result["errors"].append("quality review does not reference the current passing spec review; re-review quality")
                elif not _same_snapshot(spec, quality):
                    result["errors"].append("quality and spec review author/scope/contract differ")
                result["errors"].extend(_fresh(repo, contract, quality))
    except (ValueError, OSError, RuntimeError) as exc:
        result["errors"].append(str(exc))
    result["ok"] = not result["errors"]
    return result


def check_change(repo: Path, root: Path, selector: str) -> dict:
    """Require all linked work to be done and freshly reviewed before archive."""
    result = {"ok": False, "errors": [], "change": selector, "tasks": []}
    try:
        if not isinstance(selector, str) or not (CHANGE_RE.fullmatch(selector) or SLUG_RE.fullmatch(selector)):
            raise GateError("change must be a CHANGE-n ID or kebab-case slug, not a path")
        repo, root, _config = _paths(repo, root)
        artifacts = _artifacts(repo, root)
        changes = [(p, fm) for p, fm in artifacts if CHANGE_RE.fullmatch(fm["id"]) and p.is_relative_to(root / "changes") and "archive" not in p.relative_to(root / "changes").parts and fm.get("status") != "archived"]
        matches = [(p, fm) for p, fm in changes if selector in (fm["id"], fm.get("slug"), p.parent.name)]
        if len(matches) != 1:
            raise GateError(f"{'missing' if not matches else 'ambiguous'} active change: {selector}")
        path, change = matches[0]
        _one(artifacts, change["id"])
        if path.name != "CHANGE.md" or path.parent.parent != root / "changes" or change.get("status") not in {"proposed", "specified", "applying", "verifying"}:
            raise GateError("invalid active CHANGE identity/status/location")
        if not SLUG_RE.fullmatch(change.get("slug") or path.parent.name):
            raise GateError("CHANGE slug must be kebab-case")
        # The legacy merger trusts domains as paths. Preflight their read/write
        # destinations before it is allowed to touch a configured plan's truth.
        _inside(root / "changes" / "archive", root)
        for domain in _ids(change, "deltas"):
            if _relative(domain) != domain:
                raise GateError(f"invalid delta domain: {domain}")
            for target in (
                path.parent / "deltas" / f"{domain}.md",
                path.parent / "deltas" / domain,
                path.parent / "deltas" / domain / "spec.md",
                root / "truth" / domain / "spec.md",
            ):
                _inside(target, root)
        result["change"] = change["id"]
        req_ids = _ids(change, "reqs")
        if not req_ids:
            raise GateError("change has no linked REQs; scoped, verified work is required")
        for _p, fm in artifacts:
            if REQ_RE.fullmatch(fm["id"]) and fm.get("change") == change["id"] and fm["id"] not in req_ids:
                raise GateError(f"{fm['id']} links this CHANGE but is missing from its reqs list")
        for req_id in req_ids:
            if not REQ_RE.fullmatch(req_id):
                raise GateError(f"invalid linked REQ ID: {req_id}")
            _p, req = _one(artifacts, req_id)
            if req.get("change") != change["id"]:
                raise GateError(f"{req_id} must link change: {change['id']}")
            if req.get("status") != "done":
                result["errors"].append(f"{req_id} is not done")
            tasks = [(p, fm) for p, fm in artifacts if fm.get("req") == req_id and fm["id"].startswith("TASK-")]
            task_paths = {p for p, fm in tasks if LOCAL_TASK_RE.fullmatch(fm["id"])}
            for child in (root / "tasks" / req_id).glob("*.md"):
                if child not in task_paths:
                    raise GateError(f"missing or foreign TASK identity in {child}")
            if not tasks:
                result["errors"].append(f"{req_id} has no TASKs")
            for task_path, task in tasks:
                _task_location(root, task_path, req_id)
                task_selector = f"{req_id}/{task['id']}"
                if task.get("status") != "done":
                    result["errors"].append(f"{task_selector} is not done")
                checked = check_task(repo, root, task_selector)
                result["tasks"].append(checked)
                result["errors"].extend(f"{task_selector}: {error}" for error in checked["errors"])
    except (ValueError, OSError, RuntimeError) as exc:
        result["errors"].append(str(exc))
    result["ok"] = not result["errors"]
    return result


def _emit(result: dict, args: argparse.Namespace) -> int:
    if args.json:
        print(json.dumps(result, indent=2))
    elif result["ok"]:
        print("PASS: " + result.get("message", result.get("task", "gate")))
    else:
        for error in result["errors"]:
            print("ERROR: " + error)
    return 0 if result["ok"] else 1


def cmd_gate(args: argparse.Namespace) -> int:
    try:
        repo, root = resolve_paths(args)
        result = check_task(repo, root, args.task, args.phase)
    except (ValueError, OSError, RuntimeError) as exc:
        result = {"ok": False, "errors": [str(exc)]}
    return _emit(result, args)


def cmd_review_record(args: argparse.Namespace) -> int:
    result = {"ok": False, "errors": [], "task": args.task, "limitation": LIMITATION}
    try:
        repo, root = resolve_paths(args)
        repo, root, config = _paths(repo, root)
        paths = _task(repo, root, args.task, "complete")
        path = _record_path(repo, root, args.task)
        history = _history(path, args.task)
        result.update(_escalation(history, config))
        if result["escalation_required"]:
            raise GateError(_cap_error())
        author, reviewer = _identity(args.author), _identity(args.reviewer)
        if author.casefold() == reviewer.casefold():
            raise GateError("reviewer must differ from author (no self review)")
        if args.stage not in {"spec", "quality"} or args.status not in {"pass", "fail"}:
            raise GateError("invalid review stage/status")
        if not args.files:
            raise GateError("--files must name a nonempty source scope")
        sources = {}
        for name in args.files:
            source = _file(repo, name)
            if source["path"] in sources:
                raise GateError("--files must not contain duplicate source paths")
            sources[source["path"]] = source["sha256"]
        contract = _contract(repo, paths)
        entry = {
            "sequence": len(history) + 1,
            "stage": args.stage,
            "status": args.status,
            "author": author,
            "reviewer": reviewer,
            "recorded_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "evidence": _file(repo, args.evidence, evidence=True),
            "source_hashes": sources,
            "contract": contract,
            "contract_fingerprint": _json_hash(contract),
            "spec_review": None,
            "previous_hash": history[-1]["record_hash"] if history else None,
        }
        if args.stage == "quality":
            spec = _latest(history, "spec")
            if not spec or spec["status"] != "pass":
                raise GateError("quality review requires a current passing spec review first")
            errors = _fresh(repo, contract, spec)
            if errors:
                raise GateError("; ".join(errors))
            if not _same_snapshot(spec, entry):
                raise GateError("quality review must use the same author, source scope and contract as spec review")
            entry["spec_review"] = spec["record_hash"]
        entry["record_hash"] = _json_hash(entry)
        history.append(entry)
        atomic_write_json(path, {"schema_version": 1, "task": args.task, "history": history})
        result.update(_escalation(history, config))
        result["recorded"] = True
        result["record"] = entry
        result["message"] = f"recorded {args.stage} review: {args.status}"
        if args.status == "fail":
            result["errors"].append(f"{args.stage} review failed; failure recorded, task remains unverified")
        if result["escalation_required"]:
            result["errors"].append(_cap_error())
        result["ok"] = not result["errors"]
    except (ValueError, OSError, RuntimeError) as exc:
        result["errors"].append(str(exc))
    return _emit(result, args)


def register(subparsers) -> None:
    gate = subparsers.add_parser("gate", help="check task eligibility or fresh review evidence")
    add_common(gate)
    gate.add_argument("--task", required=True)
    gate.add_argument("--phase", choices=("load", "complete"), default="complete")
    gate.set_defaults(func=cmd_gate)

    review = subparsers.add_parser("review-record", help="record a declared review and snapshot; does not run tests")
    add_common(review)
    review.add_argument("--task", required=True)
    review.add_argument("--stage", required=True, choices=("spec", "quality"))
    review.add_argument("--status", required=True, choices=("pass", "fail"))
    review.add_argument("--author", required=True)
    review.add_argument("--reviewer", required=True)
    review.add_argument("--evidence", required=True)
    review.add_argument("--files", required=True, nargs="+")
    review.set_defaults(func=cmd_review_record)
