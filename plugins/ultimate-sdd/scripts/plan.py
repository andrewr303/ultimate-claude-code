#!/usr/bin/env python3
"""Plan harness CLI. Stdlib only. Subcommands drive the plugin from disk."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from planlib.board import render_index, spec_tree, write_index  # noqa: E402
from planlib.classify import classify  # noqa: E402
from planlib.graph import next_action, tasks_for  # noqa: E402
from planlib.parse import (  # noqa: E402
    by_id_map,
    collect,
    is_archived_change,
    next_id,
    of_kind,
    parse_list,
    readiness_int,
    slugify,
    type_of,
)
from planlib.pipelines import list_pipelines, load_pipeline  # noqa: E402
from planlib.runstate import advance_run, load_run, start_run  # noqa: E402
from planlib.validate import validate_tree  # noqa: E402


def emit(data, *, as_json: bool) -> None:
    if as_json:
        print(json.dumps(data, indent=2, default=str))
    elif isinstance(data, str):
        print(data)
    else:
        print(json.dumps(data, indent=2, default=str))


def cmd_validate(args: argparse.Namespace) -> int:
    result = validate_tree(Path(args.root))
    for line in result.errors:
        print(f"ERROR: {line}")
    for line in result.warnings:
        print(f"WARN:  {line}")
    print(f"{result.artifacts} artifacts, {len(result.errors)} error(s), {len(result.warnings)} warning(s)")
    return 1 if result.errors else 0


def cmd_status(args: argparse.Namespace) -> int:
    root = Path(args.root)
    artifacts = collect(root)
    nxt = next_action(root, artifacts)
    reqs = of_kind(artifacts, "REQ")
    tasks = of_kind(artifacts, "TASK")
    changes = [
        fm
        for p, fm in of_kind(artifacts, "CHANGE")
        if not is_archived_change(p) and fm.get("status") != "archived"
    ]
    payload = {
        "root": str(root),
        "artifacts": len(artifacts),
        "epics": len(of_kind(artifacts, "EPIC")),
        "reqs": len(reqs),
        "tasks": len(tasks),
        "ready_reqs": sum(1 for _p, fm in reqs if readiness_int(fm) >= 4),
        "active_changes": [
            {"id": fm["id"], "slug": fm.get("slug"), "status": fm.get("status")}
            for fm in changes
        ],
        "next": nxt,
        "run": load_run(root),
    }
    if args.json:
        emit(payload, as_json=True)
        return 0
    print(f"root: {root}")
    print(
        f"artifacts: {payload['artifacts']}  epics: {payload['epics']}  "
        f"reqs: {payload['reqs']}  tasks: {payload['tasks']}  "
        f"ready: {payload['ready_reqs']}"
    )
    if payload["active_changes"]:
        print("changes:")
        for ch in payload["active_changes"]:
            print(f"  {ch['id']}  {ch['slug']}  {ch['status']}")
    print(f"next: {nxt['reason']}")
    print(f"      {nxt['command']}")
    if payload["run"]:
        run = payload["run"]
        print(f"run:  {run.get('pipeline')} @ {run.get('stage')} ({run.get('status')})")
    return 0


def cmd_next(args: argparse.Namespace) -> int:
    nxt = next_action(Path(args.root), collect(Path(args.root)))
    emit(nxt, as_json=args.json)
    return 0


def cmd_board(args: argparse.Namespace) -> int:
    root = Path(args.root)
    if args.write:
        path = write_index(root)
        print(f"wrote {path}")
        return 0
    artifacts = collect(root)
    print(spec_tree(artifacts))
    print()
    nxt = next_action(root, artifacts)
    print(f"Next: {nxt['reason']} → {nxt['command']}")
    return 0


def cmd_classify(args: argparse.Namespace) -> int:
    result = classify(args.text)
    emit(result, as_json=args.json)
    return 0


def cmd_pipeline(args: argparse.Namespace) -> int:
    if args.pipeline_cmd == "list":
        rows = [
            {"name": p["name"], "description": p.get("description", ""), "stages": len(p.get("stages") or [])}
            for p in list_pipelines()
        ]
        if args.json:
            emit(rows, as_json=True)
            return 0
        for row in rows:
            print(f"{row['name']:18} {row['stages']} stages  {row['description']}")
        return 0
    spec = load_pipeline(args.name)
    emit(spec, as_json=True)
    return 0


def cmd_propose_scaffold(args: argparse.Namespace) -> int:
    root = Path(args.root)
    artifacts = collect(root)
    slug = args.slug or slugify(args.title)
    dest = root / "changes" / slug
    if dest.exists():
        print(f"ERROR: {dest} already exists", file=sys.stderr)
        return 1
    cid = next_id(artifacts, "CHANGE")
    today = dt.date.today().isoformat()
    dest.mkdir(parents=True)
    (dest / "deltas").mkdir()
    skip = bool(args.skip_specs)
    domains = [d.strip() for d in (args.deltas or "").split(",") if d.strip()]
    if not skip and not domains:
        domains = ["app"]
    (dest / "CHANGE.md").write_text(
        (
            "---\n"
            f"id: {cid}\n"
            f"title: {args.title}\n"
            f"slug: {slug}\n"
            "status: proposed\n"
            "reqs: []\n"
            f"deltas: [{', '.join(domains)}]\n"
            f"skip_specs: {'true' if skip else 'false'}\n"
            "retire_capabilities: false\n"
            f"created: {today}\n"
            f"updated: {today}\n"
            "---\n\n"
            f"# {cid} — {args.title}\n\n"
            "## Why\n\n"
            f"{args.title}\n\n"
            "## What Changes\n\n"
            "(fill)\n\n"
            "## Capabilities\n\n"
            "### New Capabilities\n\n"
            + "".join(f"- `{d}`: (fill)\n" for d in domains)
            + "\n### Modified Capabilities\n\n- *(none yet)*\n\n"
            "## Impact\n\n(fill)\n\n## Out of scope\n\n- \n\n## Approach\n\n(fill)\n"
        ),
        encoding="utf-8",
    )
    if not skip:
        for domain in domains:
            (dest / "deltas" / f"{domain}.md").write_text(
                (
                    "## Purpose\n\n"
                    f"{args.title}\n\n"
                    "## ADDED Requirements\n\n"
                    f"### Requirement: {args.title}\n"
                    "The system SHALL (fill one observable behavior).\n\n"
                    "#### Scenario: happy\n"
                    "- WHEN (action)\n"
                    "- THEN (observable)\n"
                ),
                encoding="utf-8",
            )
    write_index(root)
    print(f"wrote {dest / 'CHANGE.md'} ({cid})")
    return 0


def cmd_apply_status(args: argparse.Namespace) -> int:
    from sddlib.gates import check_task

    root = Path(args.root)
    artifacts = collect(root)
    by_id = by_id_map(artifacts)
    selector = args.change
    match = None
    for path, fm in of_kind(artifacts, "CHANGE"):
        if is_archived_change(path) or fm.get("status") == "archived":
            continue
        if fm["id"] == selector or fm.get("slug") == selector or path.parent.name == selector:
            match = (path, fm)
            break
    if not match:
        emit({"ok": False, "errors": [f"no active change matching {selector!r}"]}, as_json=args.json)
        return 1
    _path, fm = match
    rows = []
    for req_id in parse_list(fm.get("reqs")):
        req = by_id.get(req_id, (None, {}))[1]
        tasks = tasks_for(req_id, artifacts)
        rows.append(
            {
                "req": req_id,
                "status": req.get("status"),
                "readiness": readiness_int(req),
                "tasks": len(tasks),
                "done": sum(1 for t in tasks if t.get("status") == "done"),
                "ready_to_load": [
                    t["id"]
                    for t in tasks
                    if t.get("status") in {"planned", "ready"}
                    and check_task(Path.cwd(), root.resolve(), f"{req_id}/{t['id']}", phase="load")["ok"]
                ],
            }
        )
    payload = {"change": fm["id"], "slug": fm.get("slug"), "reqs": rows}
    emit(payload, as_json=args.json)
    return 0


def cmd_archive(args: argparse.Namespace) -> int:
    root = Path(args.root)
    import merge_deltas

    as_json = getattr(args, "json", False)
    config = root / "config.json"
    if config.exists() or config.is_symlink():
        from sddlib.gates import check_change

        # A configured archive is verification, not an ordinary pipeline approval.
        # Use cwd as the repository boundary, including during --dry-run.
        checked = check_change(Path.cwd(), root, args.change)
        if not checked["ok"]:
            emit(checked, as_json=as_json)
            return 1
    try:
        if args.move:
            path, fm = merge_deltas.find_change(root, args.change)
            today = dt.date.today().isoformat()
            slug = fm.get("slug") or path.parent.name
            name = slug if slug.startswith(today) else f"{today}-{slug}"
            dest = root / "changes" / "archive" / name
            if dest.exists() or dest.is_symlink():
                raise merge_deltas.MergeError(f"archive target exists: {dest}")
        logs = merge_deltas.merge_change(root, args.change, dry_run=args.dry_run)
    except (merge_deltas.MergeError, OSError, ValueError) as exc:
        emit({"ok": False, "errors": [str(exc)]}, as_json=as_json)
        return 1
    if not as_json:
        for line in logs:
            print(line)
    if args.dry_run or not args.move:
        if as_json:
            emit({"ok": True, "errors": [], "logs": logs}, as_json=True)
        return 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    text = path.read_text(encoding="utf-8")
    text = text.replace("status: proposed", "status: archived", 1)
    text = text.replace("status: specified", "status: archived", 1)
    text = text.replace("status: applying", "status: archived", 1)
    text = text.replace("status: verifying", "status: archived", 1)
    path.write_text(text, encoding="utf-8")
    shutil.move(str(path.parent), str(dest))
    write_index(root)
    logs.append(f"archived → {dest}")
    if as_json:
        emit({"ok": True, "errors": [], "logs": logs}, as_json=True)
    else:
        print(logs[-1])
    return 0


def cmd_decompose(args: argparse.Namespace) -> int:
    root = Path(args.root)
    import merge_deltas

    try:
        path, fm = merge_deltas.find_change(root, args.change)
    except merge_deltas.MergeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    children: list[dict] = []
    for domain in parse_list(fm.get("deltas")):
        dpath = merge_deltas.delta_path(path.parent, domain)
        if not dpath.exists():
            continue
        delta = merge_deltas.parse_delta(dpath.read_text(encoding="utf-8"))
        for section, items in (
            ("ADDED", delta["added"]),
            ("MODIFIED", delta["modified"]),
            ("REMOVED", delta["removed"]),
        ):
            for name, _block in items:
                children.append(
                    {
                        "slug": slugify(f"{section.lower()}-{name}"),
                        "title": f"{section}: {name}",
                        "domain": domain,
                        "section": section,
                    }
                )
    payload = {
        "change": fm["id"],
        "slug": fm.get("slug"),
        "needs_split": len(children) > 2,
        "child_pipeline": "small-feature",
        "children": children,
        "policy": "serial unless children touch distinct domains",
    }
    emit(payload, as_json=args.json)
    return 0


def cmd_handoff(args: argparse.Namespace) -> int:
    root = Path(args.root)
    artifacts = collect(root)
    nxt = next_action(root, artifacts)
    today = dt.date.today().isoformat()
    lines = [
        f"# Handoff — {today}",
        "",
        f"**Next:** {nxt['reason']}",
        f"**Command:** `{nxt['command']}`",
        "",
        "## Open REQs",
        "",
    ]
    for _p, fm in of_kind(artifacts, "REQ"):
        if fm.get("status") in {"done", "cancelled"}:
            continue
        lines.append(
            f"- {fm['id']} · {fm.get('status')} · {readiness_int(fm)}/5 · {fm.get('title', '')}"
        )
    lines += ["", "## Active CHANGEs", ""]
    for p, fm in of_kind(artifacts, "CHANGE"):
        if is_archived_change(p) or fm.get("status") == "archived":
            continue
        lines.append(f"- {fm['id']} `{fm.get('slug')}` · {fm.get('status')}")
    run = load_run(root)
    if run:
        lines += ["", "## Pipeline run", "", f"- {run.get('pipeline')} @ {run.get('stage')} ({run.get('status')})"]
    text = "\n".join(lines) + "\n"
    if args.write:
        out = Path(args.out) if args.out else root / "HANDOFF.md"
        out.write_text(text, encoding="utf-8")
        print(f"wrote {out}")
        return 0
    print(text, end="")
    return 0


def cmd_retain(args: argparse.Namespace) -> int:
    root = Path(args.root)
    lessons_dir = root / "lessons"
    catalog = lessons_dir / "CATALOG.md"
    payload = {
        "change": args.change,
        "gates": [
            "durable",
            "reusable",
            "actionable",
            "evidenced",
            "novel",
            "bounded",
        ],
        "instruction": (
            "Do not invent a lesson. Zero accepted lessons is success. "
            "Never copy source text into a lesson. Synthesize."
        ),
        "catalog": str(catalog) if catalog.exists() else None,
    }
    if args.write:
        lessons_dir.mkdir(parents=True, exist_ok=True)
        if not catalog.exists():
            catalog.write_text(
                "# Lessons\n\n"
                "Durable procedures only. Six gates: durable, reusable, "
                "actionable, evidenced, novel, bounded.\n\n"
                "| ID | Title | Gates | Source |\n|---|---|---|---|\n"
                "| — | — | — | empty |\n",
                encoding="utf-8",
            )
        payload["catalog"] = str(catalog)
        print(f"wrote {catalog}")
    emit(payload, as_json=args.json)
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    root = Path(args.root)
    if args.run_cmd == "start":
        data = start_run(
            root,
            args.pipeline,
            change=args.change or "",
            gates="off" if args.no_gate else "on",
            selection=args.selection,
            intent=args.intent or "",
        )
        emit(data, as_json=args.json)
        return 0
    if args.run_cmd == "show":
        data = load_run(root)
        if not data:
            print("no current run")
            return 1
        emit(data, as_json=True if args.json or True else False)
        return 0
    data = advance_run(root, approve_gate=args.approve)
    emit(data, as_json=args.json)
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    plugin = SCRIPTS.parent
    checks = {
        "scripts/plan.py": (SCRIPTS / "plan.py").is_file(),
        "scripts/validate_plan.py": (SCRIPTS / "validate_plan.py").is_file(),
        "scripts/merge_deltas.py": (SCRIPTS / "merge_deltas.py").is_file(),
        "pipelines/": (plugin / "pipelines").is_dir(),
        "references/model.md": (plugin / "references" / "model.md").is_file(),
        "references/openspec.md": (plugin / "references" / "openspec.md").is_file(),
        "references/rasen.md": (plugin / "references" / "rasen.md").is_file(),
    }
    pipes = [p["name"] for p in list_pipelines()]
    ok = all(checks.values())
    payload = {"ok": ok, "checks": checks, "pipelines": pipes}
    emit(payload, as_json=args.json)
    return 0 if ok else 1


def cmd_init(args: argparse.Namespace) -> int:
    import init_plan

    argv = sys.argv
    sys.argv = ["init_plan.py", "--root", args.root, "--title", args.title]
    if args.force:
        sys.argv.append("--force")
    try:
        return int(init_plan.main())
    finally:
        sys.argv = argv


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Ultimate SDD harness")
    sub = p.add_subparsers(dest="cmd", required=True)

    def root(sp):
        sp.add_argument("--root", default="docs/plan")
        sp.add_argument("--json", action="store_true")

    s = sub.add_parser("init")
    s.add_argument("--root", default="docs/plan")
    s.add_argument("--title", default="Untitled project")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_init)

    s = sub.add_parser("validate")
    root(s)
    s.set_defaults(func=cmd_validate)

    s = sub.add_parser("status")
    root(s)
    s.set_defaults(func=cmd_status)

    s = sub.add_parser("next")
    root(s)
    s.set_defaults(func=cmd_next)

    s = sub.add_parser("board")
    root(s)
    s.add_argument("--write", action="store_true")
    s.set_defaults(func=cmd_board)

    s = sub.add_parser("classify")
    s.add_argument("text")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_classify)

    s = sub.add_parser("pipeline")
    ps = s.add_subparsers(dest="pipeline_cmd", required=True)
    ls = ps.add_parser("list")
    ls.add_argument("--json", action="store_true")
    ls.set_defaults(func=cmd_pipeline)
    sh = ps.add_parser("show")
    sh.add_argument("name")
    sh.add_argument("--json", action="store_true")
    sh.set_defaults(func=cmd_pipeline)

    s = sub.add_parser("propose-scaffold")
    s.add_argument("--root", default="docs/plan")
    s.add_argument("--title", required=True)
    s.add_argument("--slug")
    s.add_argument("--deltas", help="comma-separated domains")
    s.add_argument("--skip-specs", action="store_true")
    s.set_defaults(func=cmd_propose_scaffold)

    s = sub.add_parser("apply-status")
    root(s)
    s.add_argument("--change", required=True)
    s.set_defaults(func=cmd_apply_status)

    s = sub.add_parser("archive")
    s.add_argument("--root", default="docs/plan")
    s.add_argument("--change", required=True)
    s.add_argument("--dry-run", action="store_true")
    s.add_argument("--move", action="store_true", help="move folder after merge")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_archive)

    s = sub.add_parser("decompose")
    root(s)
    s.add_argument("--change", required=True)
    s.set_defaults(func=cmd_decompose)

    s = sub.add_parser("handoff")
    s.add_argument("--root", default="docs/plan")
    s.add_argument("--write", action="store_true")
    s.add_argument("--out")
    s.set_defaults(func=cmd_handoff)

    s = sub.add_parser("retain")
    root(s)
    s.add_argument("--change")
    s.add_argument("--write", action="store_true")
    s.set_defaults(func=cmd_retain)

    s = sub.add_parser("run")
    rs = s.add_subparsers(dest="run_cmd", required=True)
    st = rs.add_parser("start")
    st.add_argument("--root", default="docs/plan")
    st.add_argument("--pipeline", required=True)
    st.add_argument("--change")
    st.add_argument("--intent")
    st.add_argument("--no-gate", action="store_true")
    st.add_argument("--selection", default="manual", choices=["manual", "classify"])
    st.add_argument("--json", action="store_true")
    st.set_defaults(func=cmd_run)
    sh = rs.add_parser("show")
    sh.add_argument("--root", default="docs/plan")
    sh.add_argument("--json", action="store_true")
    sh.set_defaults(func=cmd_run)
    adv = rs.add_parser("advance")
    adv.add_argument("--root", default="docs/plan")
    adv.add_argument("--approve", action="store_true")
    adv.add_argument("--json", action="store_true")
    adv.set_defaults(func=cmd_run)

    s = sub.add_parser("doctor")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_doctor)
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
