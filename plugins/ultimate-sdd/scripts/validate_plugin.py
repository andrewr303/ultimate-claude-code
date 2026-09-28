#!/usr/bin/env python3
"""Validate the self-contained Ultimate SDD plugin without third-party tools."""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import sys
from pathlib import Path, PurePosixPath

NAME = "ultimate-sdd"
VERSION = "1.0.0"
DISPLAY_NAME = "Ultimate SDD"
COMMANDS = frozenset("""
apply archive auto board checkpoint context decompose design explore frame from-code
go goal handoff improve load new next plan project propose push refine resume retain
revert review review-cycle scope setup specify sync tdd verify
""".split())
AGENTS = frozenset({
    "orchestrator", "planner", "specifier", "verifier", "implementer",
    "spec-reviewer", "quality-reviewer",
})
DIRECTORIES = frozenset({
    ".claude-plugin", ".codex-plugin", "agents", "codex", "commands", "examples",
    "pipelines", "references", "scripts", "skills", "templates", "tests", "hooks",
    "licenses",
})
TOP_FILES = frozenset({
    "AGENTS.md", "CLAUDE.md", "README.md", "LICENSE", "plugin.json", "kimi.plugin.json",
    ".gitignore", "THIRD_PARTY_NOTICES.md",
})
MANIFESTS = (".claude-plugin/plugin.json", ".codex-plugin/plugin.json",
             "plugin.json", "kimi.plugin.json")
CLAUDE_KEYS = frozenset({
    "name", "version", "description", "author", "homepage", "repository", "license",
    "keywords", "commands", "agents", "skills", "hooks", "mcpServers", "outputStyles",
    "lspServers",
})
EXCLUDED_DIRS = frozenset({
    ".git", ".hg", ".svn", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    ".cache", ".chunkhound", "node_modules", ".venv", "venv", ".tox", ".nox",
    ".ssh", ".aws", ".azure", ".kube", "validation", ".validation", "scratch",
    ".scratch", "temp", "tmp", ".tmp", ".temp", "dist", "build",
    "openspec-main", "openspec", "rasen", "donor", "donors", "donor-repos",
    "ai-prd-workflow", "bm-prd-creator", "conductor-main", "openspec-plus-main",
    "pilot-shell-main", "prd", "prd-development", "prd-plugin",
    "spec_driven_develop-main", "spec-kit", "to-spec",
})
SECRET_NAMES = frozenset({
    ".env", ".npmrc", ".pypirc", ".netrc", "_netrc", ".git-credentials",
    "credentials", "credentials.json", "credentials.yaml", "credentials.yml",
    "secrets.json", "secrets.yaml", "secrets.yml", "auth.json", "token.json",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
})
SKIP_SUFFIXES = frozenset({
    ".pyc", ".pyo", ".plugin", ".zip", ".tmp", ".temp", ".bak", ".swp", ".swo",
    ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore",
})
IDENTIFIER = re.compile(r"^[a-z][a-z0-9-]*$")
LOCAL_PATH = re.compile(
    r"(?<![\w./-])((?:references|templates|skills|agents|scripts|hooks)/"
    r"[^\s`\"'|,;()]+)"
)
SLASH_COMMAND = re.compile(r"(?<![\w./-])/(ultimate-sdd|prd)(:|-)([a-z][a-z0-9-]*)")
MARKED_SKILL = re.compile(
    r"(?:`|\*\*)((?:plan|prd|req|task)-[a-z0-9-]+|orchestrator|plan)(?:`|\*\*)"
)
NAMED_SKILL = re.compile(r"(?:`|\*\*)([a-z][a-z0-9-]*)(?:`|\*\*)\s+skill\b")
PRIVATE_PATH = re.compile(r"\b[A-Za-z]:[/\\]")
DONOR_PATH = re.compile(
    r"(?i)(?:OpenSpec-main|openspec-plus-main|pilot-shell-main|conductor-main|rasen)/"
    r"[^\s`\"'<>]+"
)
DONOR_COMMAND = re.compile(
    r"(?i)(?:\b(?:npx|uvx|bunx)\s+(?:-y\s+)?(?:@[\w-]+/)?(?:openspec|rasen)\b|"
    r"(?:^\s*|`)(?:openspec|rasen)\s+(?:init|new|apply|archive|propose|run|auto)\b)"
)


def _excluded(name: str, directory: bool = False) -> bool:
    lower = name.casefold()
    if lower in SECRET_NAMES or lower in {".ds_store", "thumbs.db"}:
        return True
    if lower.startswith(".env.") and lower not in {".env.example", ".env.sample", ".env.template"}:
        return True
    if lower.startswith((".test-", ".validation-", ".scratch-", ".tmp-", ".temp-")):
        return True
    if directory:
        return lower in EXCLUDED_DIRS
    return Path(lower).suffix in SKIP_SUFFIXES or lower.endswith("~")


def is_link(path: Path) -> bool:
    """Include Windows junctions/reparse points, which must not escape the tree."""
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    )


def collect_files(root: Path) -> tuple[list[Path], list[str]]:
    """Select only distributable regular files; never descend into linked trees."""
    files: list[Path] = []
    errors: list[str] = []
    root = Path(root).absolute()
    try:
        if is_link(root):
            return [], ["plugin root must not be a symlink or junction"]
        if not root.is_dir():
            return [], ["plugin root must be a directory"]
    except OSError as exc:
        return [], [f"cannot inspect plugin root: {exc}"]

    def walk(folder: Path) -> None:
        try:
            entries = sorted(folder.iterdir(), key=lambda p: p.name)
            for path in entries:
                relative = path.relative_to(root).as_posix()
                if folder == root and path.name not in DIRECTORIES | TOP_FILES:
                    continue
                if _excluded(path.name) or _excluded(path.name, directory=True):
                    continue
                if is_link(path):
                    errors.append(f"{relative}: packaged symlinks/junctions are not allowed")
                    continue
                info = path.stat()
                if stat.S_ISDIR(info.st_mode):
                    if path.name in TOP_FILES and folder == root:
                        errors.append(f"{relative}: expected a file")
                        continue
                    if any((path / marker).exists() for marker in (".git", ".hg", ".svn")):
                        continue
                    walk(path)
                elif stat.S_ISREG(info.st_mode):
                    files.append(path)
                else:
                    errors.append(f"{relative}: expected a regular file")
        except OSError as exc:
            errors.append(f"cannot inspect {folder.relative_to(root).as_posix()}: {exc}")

    walk(root)
    files.sort(key=lambda p: p.relative_to(root).as_posix())
    names: set[str] = set()
    for path in files:
        name = path.relative_to(root).as_posix()
        if name.casefold() in names:
            errors.append(f"{name}: case-insensitive archive path collision")
        names.add(name.casefold())
    return files, errors


def _object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _frontmatter(text: str, label: str, errors: list[str]) -> dict[str, str]:
    """Read the small scalar/block-scalar subset used by plugin entry points."""
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        errors.append(f"{label}: missing frontmatter")
        return {}
    try:
        end = lines.index("---", 1)
    except ValueError:
        errors.append(f"{label}: unclosed frontmatter")
        return {}
    result: dict[str, str] = {}
    index = 1
    while index < end:
        line = lines[index]
        index += 1
        if not line.strip() or line.lstrip().startswith("#") or line[0].isspace():
            continue
        match = re.fullmatch(r"([A-Za-z][\w-]*):(?:\s+(.*))?", line)
        if not match:
            errors.append(f"{label}: invalid frontmatter line: {line}")
            continue
        key, value = match.group(1), (match.group(2) or "").strip()
        if key in result:
            errors.append(f"{label}: duplicate frontmatter key: {key}")
        if value in {">", "|", ">-", "|-", ">+", "|+"}:
            block = []
            while index < end and (not lines[index].strip() or lines[index][0].isspace()):
                block.append(lines[index].strip())
                index += 1
            value = " ".join(block).strip()
        elif value.startswith(('"', "'")):
            if len(value) < 2 or value[-1] != value[0]:
                errors.append(f"{label}: unclosed quoted frontmatter value: {key}")
                value = ""
            else:
                value = value[1:-1].replace("''", "'")
        else:
            value = re.sub(r"(?:^|\s)#.*$", "", value).rstrip()
            non_string = (value.startswith(("[", "{")) or
                          value.casefold() in {"null", "~", "true", "false"} or
                          re.fullmatch(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", value))
            if key in {"name", "description"} and non_string:
                errors.append(f"{label}: {key} must be a nonempty string")
                value = ""
        result[key] = value
    return result


def _local_references(text: str) -> set[str]:
    # Known plugin-root prefixes are different from target-repo src/docs paths.
    for prefix in ("${CLAUDE_PLUGIN_ROOT}/", "${PLUGIN_ROOT}/", "<plugin>/", "ultimate-sdd/"):
        text = text.replace(prefix, " ")
    result = set()
    for match in LOCAL_PATH.finditer(text):
        value = match.group(1).rstrip(".,:;]")
        if any(char in value for char in "*?$<>{}[]…"):
            continue
        value = value.split("#", 1)[0]
        value = re.sub(r":\d+(?:-\d+)?$", "", value)
        if PurePosixPath(value).suffix:
            result.add(value)
    return result


def _dependency_text(text: str, label: str, errors: list[str]) -> None:
    for number, line in enumerate(text.splitlines(), 1):
        if PRIVATE_PATH.search(line):
            errors.append(f"{label}:{number}: private absolute drive path is not portable")
        attribution = re.search(r"(?i)\b(source ideas|attribution|historical|upstream source)\b", line)
        prohibition = re.search(r"(?i)\b(do not|never|must not|does not|not require)\b", line)
        if not attribution and not prohibition and (DONOR_PATH.search(line) or DONOR_COMMAND.search(line)):
            errors.append(f"{label}:{number}: donor dependency is not self-contained")


def _has_cycle(graph: dict[str, list[str]]) -> bool:
    remaining = {node: set(deps) & graph.keys() for node, deps in graph.items()}
    while remaining:
        ready = {node for node, deps in remaining.items() if not deps}
        if not ready:
            return True
        remaining = {node: deps - ready for node, deps in remaining.items() if node not in ready}
    return False


def validate(root: str | Path) -> dict:
    """Return an ok/errors contract. Validation never executes plugin commands."""
    root = Path(root).absolute()
    files, errors = collect_files(root)
    inventory = {path.relative_to(root).as_posix(): path for path in files}
    directories = {parent.as_posix() for name in inventory for parent in PurePosixPath(name).parents}
    required = TOP_FILES | set(MANIFESTS) | {
        ".claude-plugin/marketplace.json", "hooks/hooks.json", "scripts/sdd.py",
        "scripts/plan.py", "scripts/validate_plugin.py", "scripts/package_plugin.py",
    } | {f"agents/{name}.md" for name in AGENTS}
    for name in sorted(required - inventory.keys()):
        errors.append(f"{name}: required packaged file is missing")
    for name in sorted(DIRECTORIES - directories):
        errors.append(f"{name}/: required packaged component is missing or empty")

    def read(name: str) -> str:
        try:
            return inventory[name].read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError) as exc:
            errors.append(f"{name}: cannot read UTF-8 text: {exc}")
            return ""

    def load(name: str) -> dict:
        if name not in inventory:
            return {}
        try:
            value = json.loads(read(name), object_pairs_hook=_object)
            if not isinstance(value, dict):
                raise ValueError("expected a JSON object")
            return value
        except (ValueError, RecursionError) as exc:
            errors.append(f"{name}: invalid JSON: {exc}")
            return {}

    def target(value: object, label: str, *, native: bool = False) -> None:
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{label}: expected a nonempty local path")
            return
        if native and not value.startswith("./"):
            errors.append(f"{label}: native component paths must start with ./")
        name = value[2:] if value.startswith("./") else value
        name = name.rstrip("/")
        if ("\\" in name or ".." in PurePosixPath(name).parts or
                PurePosixPath(name).is_absolute() or PRIVATE_PATH.search(name)):
            errors.append(f"{label}: local target escapes the plugin: {value}")
        elif name not in inventory and name not in directories:
            errors.append(f"{label}: missing packaged target: {value}")

    manifests = {name: load(name) for name in MANIFESTS}
    for name, data in manifests.items():
        if data.get("name") != NAME:
            errors.append(f"{name}: name must be {NAME}")
        if data.get("version") != VERSION:
            errors.append(f"{name}: version must be {VERSION}")
        if not isinstance(data.get("description"), str) or not data["description"].strip():
            errors.append(f"{name}: description must be a nonempty string")
        for key in ("homepage", "repository", "license"):
            if key in data and (not isinstance(data[key], str) or not data[key].strip()):
                errors.append(f"{name}: {key} must be a nonempty string")
        if "author" in data:
            author = data["author"]
            if (not isinstance(author, dict) or not isinstance(author.get("name"), str) or
                    not author["name"].strip() or any(not isinstance(value, str) for value in author.values())):
                errors.append(f"{name}: author must be an object with a nonempty name and string fields")
        if "keywords" in data and (not isinstance(data["keywords"], list) or
                                   any(not isinstance(value, str) or not value.strip() for value in data["keywords"])):
            errors.append(f"{name}: keywords must be a list of nonempty strings")
        if name != MANIFESTS[0] and "hooks" in data:
            if isinstance(data["hooks"], str):
                target(data["hooks"], f"{name}:hooks")
            elif not isinstance(data["hooks"], dict):
                errors.append(f"{name}: hooks must be an object or local path")
        if name == ".claude-plugin/plugin.json":
            for key in sorted(data.keys() - CLAUDE_KEYS):
                errors.append(f"{name}: unsupported native manifest key: {key}")
        elif "displayName" in data and (name != "plugin.json" or data["displayName"] != DISPLAY_NAME):
            errors.append(f"{name}: displayName belongs in the supported interface location")
        if "interface" in data:
            interface = data["interface"]
            if not isinstance(interface, dict) or interface.get("displayName") != DISPLAY_NAME:
                errors.append(f"{name}: interface.displayName must be {DISPLAY_NAME}")
        for key in ("commands", "agents", "skills", "outputStyles"):
            if key not in data:
                continue
            values = data[key] if isinstance(data[key], list) else [data[key]]
            if not values:
                errors.append(f"{name}: {key} must not be empty")
            for value in values:
                target(value, f"{name}:{key}", native=name == MANIFESTS[0])
        if name == MANIFESTS[0] and "agents" in data:
            agents = data["agents"] if isinstance(data["agents"], list) else [data["agents"]]
            registered = {value.removeprefix("./").rstrip("/") for value in agents if isinstance(value, str)}
            if "agents" not in registered:
                for agent in sorted(AGENTS):
                    if f"agents/{agent}.md" not in registered:
                        errors.append(f"{name}: required agent not registered: {agent}")
        for key in ("mcpServers", "lspServers"):
            if isinstance(data.get(key), str):
                target(data[key], f"{name}:{key}", native=name == MANIFESTS[0])
            elif key in data and not isinstance(data[key], dict):
                errors.append(f"{name}:{key}: expected an object or local path")

    marketplace = load(".claude-plugin/marketplace.json")
    entries = marketplace.get("plugins")
    if not isinstance(entries, list) or len(entries) != 1 or not isinstance(entries[0], dict):
        errors.append(".claude-plugin/marketplace.json: expected one plugin entry")
    elif entries[0].get("name") != NAME or entries[0].get("source") != "./":
        errors.append(".claude-plugin/marketplace.json: plugin must match ultimate-sdd with source ./")
    elif "version" in entries[0] and entries[0]["version"] != VERSION:
        errors.append(".claude-plugin/marketplace.json: plugin version mismatch")
    if not isinstance(marketplace.get("name"), str) or not marketplace["name"].strip():
        errors.append(".claude-plugin/marketplace.json: name must be a nonempty string")
    owner = marketplace.get("owner")
    if not isinstance(owner, dict) or not isinstance(owner.get("name"), str) or not owner["name"].strip():
        errors.append(".claude-plugin/marketplace.json: owner.name must be a nonempty string")

    hook_config = load("hooks/hooks.json")
    native_hooks = manifests[MANIFESTS[0]].get("hooks")
    if native_hooks is not None:
        if isinstance(native_hooks, str):
            target(native_hooks, f"{MANIFESTS[0]}:hooks", native=True)
            if PurePosixPath(native_hooks).as_posix() == "hooks/hooks.json":
                errors.append(f"{MANIFESTS[0]}: default hooks/hooks.json is autoloaded; do not register it twice")
        elif not isinstance(native_hooks, dict):
            errors.append(f"{MANIFESTS[0]}: hooks must be an object or local path")
        elif native_hooks == hook_config:
            errors.append(f"{MANIFESTS[0]}: default hooks must not be duplicated inline")
    events = hook_config.get("hooks")
    if not isinstance(events, dict):
        errors.append("hooks/hooks.json: hooks must be an event object")
        events = {}
    for event in ("SessionStart", "PreCompact"):
        groups = events.get(event)
        if not isinstance(groups, list) or not groups:
            errors.append(f"hooks/hooks.json: {event} must have hook groups")
            continue
        for group in groups:
            hooks = group.get("hooks") if isinstance(group, dict) else None
            if not isinstance(hooks, list) or not hooks:
                errors.append(f"hooks/hooks.json:{event}: expected nonempty hooks list")
                continue
            for hook in hooks:
                if not isinstance(hook, dict) or hook.get("type") != "command" or not isinstance(hook.get("command"), str) or not hook["command"].strip():
                    errors.append(f"hooks/hooks.json:{event}: expected a command hook")
                    continue
                command = hook["command"]
                _dependency_text(command, f"hooks/hooks.json:{event}", errors)
                targets = {ref for ref in _local_references(command) if ref.endswith(".py")}
                if not targets:
                    errors.append(f"hooks/hooks.json:{event}: command must target a local Python script")
                for ref in sorted(targets):
                    target(ref, f"hooks/hooks.json:{event}")

    skill_files = {name for name in inventory if name.startswith("skills/") and name.endswith("/SKILL.md")}
    skill_ids = {PurePosixPath(name).parent.name for name in skill_files}
    if not skill_ids:
        errors.append("skills/: no skills found")
    for folder in sorted({PurePosixPath(name).parts[1] for name in inventory if name.startswith("skills/")}):
        if f"skills/{folder}/SKILL.md" not in inventory:
            errors.append(f"skills/{folder}/SKILL.md: required skill entry point is missing")
    command_files = {name for name in inventory if PurePosixPath(name).parent.as_posix() == "commands" and name.endswith(".md")}
    codex_files = {name for name in inventory if PurePosixPath(name).parent.as_posix() == "codex/prompts" and name.endswith(".md")}
    expected_commands = {f"commands/{name}.md" for name in COMMANDS}
    expected_codex = {f"codex/prompts/{NAME}-{name}.md" for name in COMMANDS}
    for label, found, expected in (("commands", command_files, expected_commands), ("Codex wrappers", codex_files, expected_codex)):
        for name in sorted(expected - found):
            errors.append(f"{label}: missing {name}")
        for name in sorted(found - expected):
            errors.append(f"{label}: unexpected {name}")
    agent_files = {name for name in inventory if PurePosixPath(name).parent.as_posix() == "agents" and name.endswith(".md")}
    for name in sorted(skill_files | agent_files | command_files | codex_files):
        data = _frontmatter(read(name), name, errors)
        if not data.get("description", "").strip():
            errors.append(f"{name}: frontmatter description must be nonempty")
        if name in skill_files | agent_files:
            expected = PurePosixPath(name).parent.name if name in skill_files else PurePosixPath(name).stem
            if data.get("name") != expected:
                errors.append(f"{name}: frontmatter name must be {expected}")
            if not IDENTIFIER.fullmatch(expected):
                errors.append(f"{name}: invalid entry point identifier")

    for name in sorted(inventory):
        if name.endswith(".md") and not name.startswith("tests/"):
            text = read(name)
            _dependency_text(text, name, errors)
            for ref in sorted(_local_references(text)):
                target(ref, name)
            for namespace, _, command in SLASH_COMMAND.findall(text):
                if namespace != NAME:
                    errors.append(f"{name}: obsolete /prd command namespace")
                elif command not in COMMANDS:
                    errors.append(f"{name}: unknown command target: {command}")
            for skill in sorted(set(MARKED_SKILL.findall(text)) | set(NAMED_SKILL.findall(text))):
                if skill not in skill_ids:
                    errors.append(f"{name}: unknown skill target: {skill}")
        elif name.endswith(".py") and name.startswith(("scripts/", "hooks/")):
            _dependency_text(read(name), name, errors)

    pipelines = {PurePosixPath(name).stem: load(name) for name in inventory
                 if PurePosixPath(name).parent.as_posix() == "pipelines" and name.endswith(".json")}
    if not pipelines:
        errors.append("pipelines/: no pipeline definitions found")
    children: dict[str, list[str]] = {}
    for pipeline, data in sorted(pipelines.items()):
        label = f"pipelines/{pipeline}.json"
        if data.get("name") != pipeline:
            errors.append(f"{label}: pipeline name must match its filename")
        if type(data.get("version")) is not int or data["version"] != 1:
            errors.append(f"{label}: pipeline version must be 1")
        stages = data.get("stages")
        if not isinstance(stages, list) or not stages:
            errors.append(f"{label}: stages must be a nonempty list")
            continue
        graph: dict[str, list[str]] = {}
        children[pipeline] = []
        for stage in stages:
            if not isinstance(stage, dict) or not isinstance(stage.get("id"), str) or not IDENTIFIER.fullmatch(stage["id"]):
                errors.append(f"{label}: stage id must be a nonempty identifier")
                continue
            stage_id = stage["id"]
            if stage_id in graph:
                errors.append(f"{label}: duplicate stage id: {stage_id}")
            skill = stage.get("skill")
            if not isinstance(skill, str) or skill not in skill_ids:
                errors.append(f"{label}:{stage_id}: unknown skill target: {skill}")
            requires = stage.get("requires")
            if not isinstance(requires, list) or any(not isinstance(dep, str) for dep in requires):
                errors.append(f"{label}:{stage_id}: requires must be a list of stage ids")
                requires = []
            elif len(set(requires)) != len(requires):
                errors.append(f"{label}:{stage_id}: duplicate requires entry")
            graph[stage_id] = requires
            if "childPipeline" in stage:
                child = stage["childPipeline"]
                if not isinstance(child, str) or child not in pipelines:
                    errors.append(f"{label}:{stage_id}: unknown childPipeline")
                else:
                    children[pipeline].append(child)
        for stage_id, requires in graph.items():
            for dep in requires:
                if dep not in graph:
                    errors.append(f"{label}:{stage_id}: requires unknown stage: {dep}")
        if _has_cycle(graph):
            errors.append(f"{label}: stage dependency cycle")
    if _has_cycle(children):
        errors.append("pipelines/: childPipeline dependency cycle")
    return {"ok": not errors, "errors": sorted(set(errors))}


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise ValueError(f"{message}; use --help for usage")


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    try:
        parser = ArgumentParser(description=__doc__, allow_abbrev=False)
        parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
        parser.add_argument("--json", action="store_true")
        args = parser.parse_args(argv)
        result = validate(args.root)
    except (ValueError, OSError, RecursionError) as exc:
        result = {"ok": False, "errors": [str(exc)]}
    if "--json" in argv:
        print(json.dumps(result, ensure_ascii=True, sort_keys=True))
    elif result["ok"]:
        print("Plugin validation passed.")
    else:
        for error in result["errors"]:
            print(f"error: {error}", file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
