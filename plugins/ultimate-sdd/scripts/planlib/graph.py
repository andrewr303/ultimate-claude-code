from __future__ import annotations

from pathlib import Path

from .parse import (
    artifact_id,
    by_id_map,
    codebase_exists,
    dependency_id,
    is_archived_change,
    is_true,
    of_kind,
    parse_list,
    readiness_int,
    type_of,
)


def has_cycle(edges: dict[str, list[str]]) -> list[str] | None:
    seen: set[str] = set()
    stack: set[str] = set()

    def dfs(node: str, path: list[str]) -> list[str] | None:
        if node in stack:
            return path + [node]
        if node in seen:
            return None
        seen.add(node)
        stack.add(node)
        for nxt in edges.get(node, []):
            hit = dfs(nxt, path + [node])
            if hit:
                return hit
        stack.remove(node)
        return None

    for node in edges:
        hit = dfs(node, [])
        if hit:
            return hit
    return None


def blocker_edges(
    artifacts: list[tuple[Path, dict[str, str]]],
) -> dict[str, list[str]]:
    edges: dict[str, list[str]] = {}
    for _path, fm in artifacts:
        fid = artifact_id(fm)
        for other in parse_list(fm.get("blocked_by")):
            target = dependency_id(fm, other)
            if target is not None:
                edges.setdefault(target, []).append(fid)
    return edges


def _loadable_req(fm: dict[str, str]) -> bool:
    return (
        type_of(fm["id"]) == "REQ"
        and fm.get("status") in {"ready", "in-progress", "review"}
        and readiness_int(fm) in {4, 5}
    )


def is_unblocked(fm: dict[str, str], by_id: dict[str, tuple[Path, dict[str, str]]]) -> bool:
    """Resolve scoped blockers transitively; stale done states cannot hide a cycle."""
    def check(current: dict[str, str], stack: set[str]) -> bool:
        fid = artifact_id(current)
        if fid in stack:
            return False
        for other in parse_list(current.get("blocked_by")):
            target = dependency_id(current, other)
            if target is None or target not in by_id:
                return False
            blocker = by_id[target][1]
            if blocker.get("status") != "done":
                return False
            if not check(blocker, stack | {fid}):
                return False
        return True

    return check(fm, set())


def tasks_for(req_id: str, artifacts: list[tuple[Path, dict[str, str]]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for _path, fm in artifacts:
        if type_of(fm["id"]) == "TASK" and fm.get("req") == req_id:
            out.append(fm)
    return out


def next_action(
    root: Path, artifacts: list[tuple[Path, dict[str, str]]]
) -> dict[str, str]:
    """Highest-priority next move. Executable form of references/model.md."""
    by_id = by_id_map(artifacts)
    run = root / "runs" / "current.json"
    if run.exists():
        return {
            "action": "resume",
            "command": "/ultimate-sdd:auto",
            "target": "runs/current.json",
            "reason": "A pipeline run is in progress — resume or inspect it.",
        }

    platform = root / "context" / "platform.md"
    if codebase_exists(root) and not platform.exists():
        return {
            "action": "context",
            "command": "/ultimate-sdd:context",
            "target": "",
            "reason": "Codebase exists and platform.md is missing.",
        }

    briefs = of_kind(artifacts, "BRIEF")
    aligned = [fm for _p, fm in briefs if fm.get("status") == "aligned"]
    prds = []
    project = by_id.get("PROJECT")
    if project and project[1].get("prd"):
        prds.append(project[1]["prd"])
    epics = of_kind(artifacts, "EPIC")
    if not aligned and not prds:
        return {
            "action": "frame",
            "command": "/ultimate-sdd:frame",
            "target": "",
            "reason": "No aligned brief and no PRD.",
        }
    if (aligned or prds) and not epics:
        target = aligned[0]["id"] if aligned else (prds[0] if prds else "")
        return {
            "action": "project",
            "command": "/ultimate-sdd:project",
            "target": target,
            "reason": "Destination exists but there are no EPICs.",
        }

    reqs = of_kind(artifacts, "REQ")
    for _path, fm in reqs:
        if fm.get("status") == "cancelled":
            continue
        if not is_unblocked(fm, by_id):
            continue
        if readiness_int(fm) < 4 and fm.get("status") not in {"in-progress", "review", "done"}:
            return {
                "action": "specify",
                "command": f"/ultimate-sdd:specify {fm['id']}",
                "target": fm["id"],
                "reason": f"{fm['id']} is unblocked and readiness {readiness_int(fm)}/5.",
            }

    for _path, fm in reqs:
        if fm.get("status") in {"cancelled", "done"}:
            continue
        if readiness_int(fm) < 4:
            continue
        if not is_unblocked(fm, by_id):
            continue
        if not tasks_for(fm["id"], artifacts):
            return {
                "action": "scope",
                "command": f"/ultimate-sdd:scope {fm['id']}",
                "target": fm["id"],
                "reason": f"{fm['id']} is ready and has no TASKs.",
            }

    for _path, fm in of_kind(artifacts, "TASK"):
        if fm.get("status") not in {"planned", "ready"}:
            continue
        if not is_unblocked(fm, by_id):
            continue
        parent = by_id.get(fm.get("req", ""))
        if not parent or not _loadable_req(parent[1]) or not is_unblocked(parent[1], by_id):
            continue
        cite = artifact_id(fm)
        return {
            "action": "load",
            "command": f"/ultimate-sdd:load {cite}",
            "target": cite,
            "reason": f"{cite} is unblocked and ready to load.",
        }

    for _path, fm in reqs:
        if fm.get("status") in {"in-progress", "review"}:
            return {
                "action": "verify",
                "command": f"/ultimate-sdd:verify {fm['id']}",
                "target": fm["id"],
                "reason": f"{fm['id']} is {fm.get('status')} with open AC.",
            }

    for path, fm in of_kind(artifacts, "CHANGE"):
        if is_archived_change(path) or fm.get("status") == "archived":
            continue
        req_ids = parse_list(fm.get("reqs"))
        if fm.get("status") in {"applying", "verifying"} and req_ids:
            if all(by_id.get(r, (None, {}))[1].get("status") == "done" for r in req_ids):
                return {
                    "action": "archive",
                    "command": f"/ultimate-sdd:archive {fm.get('slug') or fm['id']}",
                    "target": fm["id"],
                    "reason": f"{fm['id']} REQs are done — merge deltas into truth/.",
                }

    for path, fm in of_kind(artifacts, "CHANGE"):
        if is_archived_change(path) or fm.get("status") == "archived":
            continue
        if fm.get("status") != "proposed":
            continue
        if is_true(fm.get("skip_specs")):
            continue
        if parse_list(fm.get("deltas")) and not parse_list(fm.get("reqs")):
            return {
                "action": "explode",
                "command": f"/ultimate-sdd:project {fm['id']}",
                "target": fm["id"],
                "reason": f"{fm['id']} has deltas and no REQs.",
            }

    return {
        "action": "clean",
        "command": "/ultimate-sdd:board",
        "target": "",
        "reason": "Board is clean.",
    }
