from __future__ import annotations

import datetime as dt
from pathlib import Path

from .graph import is_unblocked, next_action, tasks_for
from .parse import (
    artifact_id,
    by_id_map,
    collect,
    is_archived_change,
    of_kind,
    parse_list,
    readiness_int,
    readiness_label,
    type_of,
)


def spec_tree(artifacts: list[tuple[Path, dict[str, str]]]) -> str:
    lines: list[str] = []
    by_id = by_id_map(artifacts)
    epics = of_kind(artifacts, "EPIC")
    reqs = of_kind(artifacts, "REQ")
    if not epics and not reqs:
        return "(no EPIC/REQ)"
    for _path, epic in epics:
        spec = epic.get("spec") or epic["id"]
        lines.append(
            f"{spec}  {epic['id']} {epic.get('title', '')}                    "
            f"{epic.get('status', '')} · {epic.get('effort', '—')}"
        )
        children = [
            fm
            for _p, fm in reqs
            if fm.get("epic") == epic["id"] and fm.get("status") != "cancelled"
        ]
        children.sort(key=lambda fm: fm.get("spec") or fm["id"])
        for fm in children:
            label = readiness_label(readiness_int(fm))
            note = ""
            blocked = parse_list(fm.get("blocked_by"))
            if blocked and not is_unblocked(fm, by_id):
                note = f"    needs first: {', '.join(blocked)}"
            lines.append(
                f"  {fm.get('spec', '')}  {fm['id']} · {fm.get('title', '')}    "
                f"{label} · {fm.get('effort', '—')}{note}"
            )
    return "\n".join(lines) if lines else "(empty)"


def render_index(root: Path) -> str:
    artifacts = collect(root)
    by_id = by_id_map(artifacts)
    project = by_id.get("PROJECT", (None, {}))[1]
    title = project.get("title", root.name)
    nxt = next_action(root, artifacts)
    briefs = of_kind(artifacts, "BRIEF")
    aligned = next((fm["id"] for _p, fm in briefs if fm.get("status") == "aligned"), "—")
    platform = "present" if (root / "context" / "platform.md").exists() else "missing"
    ctx_n = len(of_kind(artifacts, "CTX"))
    reqs = [fm for _p, fm in of_kind(artifacts, "REQ") if fm.get("status") != "cancelled"]
    ready_n = sum(1 for fm in reqs if readiness_int(fm) >= 4)
    changes = [
        fm
        for p, fm in of_kind(artifacts, "CHANGE")
        if not is_archived_change(p) and fm.get("status") != "archived"
    ]
    today = dt.date.today().isoformat()

    plan_rows: list[str] = []
    for _p, fm in of_kind(artifacts, "EPIC"):
        kids = [r for r in reqs if r.get("epic") == fm["id"]]
        plan_rows.append(
            f"| {fm['id']} | {fm.get('spec', '')} | {fm.get('title', '')} | "
            f"{fm.get('status', '')} | — | {fm.get('effort', '—')} | {len(kids)} reqs |"
        )
    for fm in reqs:
        if fm.get("status") in {"in-progress", "review", "done"}:
            continue
        plan_rows.append(
            f"| {fm['id']} | {fm.get('spec', '')} | {fm.get('title', '')} | "
            f"{readiness_label(readiness_int(fm))} | {readiness_int(fm)}/5 | "
            f"{fm.get('effort', '—')} | {fm.get('status', '')} |"
        )
    if not plan_rows:
        plan_rows.append("| — | — | — | — | — | — | — |")

    build_rows: list[str] = []
    for fm in reqs:
        if fm.get("status") not in {"in-progress", "review"}:
            continue
        tasks = tasks_for(fm["id"], artifacts)
        done = sum(1 for t in tasks if t.get("status") == "done")
        build_rows.append(
            f"| {fm['id']} | {fm.get('title', '')} | {len(tasks)} | {done}/{len(tasks)} |"
        )
    if not build_rows:
        build_rows.append("| — | — | — | — |")

    change_rows: list[str] = []
    for fm in changes:
        change_rows.append(
            f"| {fm['id']} | {fm.get('slug', '')} | {fm.get('status', '')} | "
            f"{', '.join(parse_list(fm.get('deltas'))) or '—'} | "
            f"{', '.join(parse_list(fm.get('reqs'))) or '—'} |"
        )
    if not change_rows:
        change_rows.append("| — | — | — | — | — |")

    pub_rows: list[str] = []
    for fm in reqs:
        if fm.get("status") != "done":
            continue
        verify = root / "verify" / f"{fm['id']}.md"
        pub_rows.append(
            f"| {fm['id']} | {fm.get('title', '')} | "
            f"{'yes' if verify.exists() else 'missing'} | "
            f"{'verify/' + fm['id'] + '.md' if verify.exists() else '—'} |"
        )
    if not pub_rows:
        pub_rows.append("| — | — | — | — |")

    graph_lines: list[str] = []
    for _p, epic in of_kind(artifacts, "EPIC"):
        graph_lines.append(f"{epic['id']} {epic.get('title', '')}")
        for fm in reqs:
            if fm.get("epic") != epic["id"]:
                continue
            ntask = len(tasks_for(fm["id"], artifacts))
            graph_lines.append(
                f"  {fm['id']} {fm.get('title', '')} "
                f"({fm.get('status')} · {readiness_int(fm)}/5 · {ntask} tasks)"
            )
    for p, fm in of_kind(artifacts, "CHANGE"):
        if is_archived_change(p) or fm.get("status") == "archived":
            continue
        graph_lines.append(
            f"{fm['id']} {fm.get('slug', '')} ({fm.get('status')})"
        )
    if not graph_lines:
        graph_lines.append("(empty)")

    registry: list[str] = []
    for path, fm in sorted(artifacts, key=lambda item: artifact_id(item[1])):
        if type_of(fm["id"]) == "CHANGE" and is_archived_change(path):
            continue
        rel = path.as_posix()
        registry.append(f"| {artifact_id(fm)} | {rel} | {fm.get('status', '—')} |")
    if not registry:
        registry.append("| — | — | — |")

    return (
        f"# Project Plan — {title}\n\n"
        f"| Field | Value |\n|---|---|\n"
        f"| Status | {project.get('status', 'draft')} |\n"
        f"| Brief | {aligned} |\n"
        f"| PRD | {project.get('prd') or '—'} |\n"
        f"| Platform context | {platform} |\n"
        f"| Context sources | {ctx_n} |\n"
        f"| Ready specs | {ready_n} of {len(reqs)} |\n"
        f"| Active changes | {len(changes)} |\n"
        f"| Updated | {today} |\n\n"
        f"## Next\n\n"
        f"{nxt['reason']} → `{nxt['command']}`\n\n"
        f"## Spec tree\n\n```\n{spec_tree(artifacts)}\n```\n\n"
        f"## Board\n\n"
        f"### Plan\n\n"
        f"| ID | Spec | Title | Label | Ready | Effort | Notes |\n"
        f"|---|---|---|---|---|---|---|\n"
        + "\n".join(plan_rows)
        + "\n\n### Build\n\n"
        "| ID | Title | Tasks | Progress |\n|---|---|---|---|\n"
        + "\n".join(build_rows)
        + "\n\n### Changes\n\n"
        "| ID | Slug | Status | Deltas | REQs |\n|---|---|---|---|---|\n"
        + "\n".join(change_rows)
        + "\n\n### Published\n\n"
        "| ID | Title | Verified | Evidence |\n|---|---|---|---|\n"
        + "\n".join(pub_rows)
        + "\n\n## Graph\n\n```\n"
        + "\n".join(graph_lines)
        + "\n```\n\n## Registry\n\n"
        "| ID | File | Status |\n|---|---|---|\n"
        + "\n".join(registry)
        + "\n"
    )


def write_index(root: Path) -> Path:
    path = root / "INDEX.md"
    path.write_text(render_index(root), encoding="utf-8")
    return path
