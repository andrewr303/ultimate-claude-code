#!/usr/bin/env python3
"""Build a claude.ai-uploadable .plugin zip from a Claude Code plugin folder.

usage: pack_plugin.py <plugin_root> [<out_dir>]

Rules enforced (each was a real upload rejection or a known Claude Code trap):
  * exactly one plugin.json in the archive: .claude-plugin/plugin.json
  * no continueOnBlock on non-prompt hooks
  * hook timeouts are seconds, not ms
  * manifest must not re-declare the auto-loaded hooks/hooks.json
  * no other-platform manifests, caches, node_modules, nested zips
  * shell scripts are LF and executable
"""
import json, os, re, sys, zipfile

EXC_DIRS = {"node_modules", ".git", ".npm-cache", "__pycache__", ".gemini", ".agents",
            "codex", ".codex-plugin", "kimi", ".venv", ".pytest_cache", ".DS_Store"}
EXC_FILES = {".DS_Store", "marketplace.json", "gemini-extension.json", "Thumbs.db"}
KEEP_MANIFEST = ".claude-plugin/plugin.json"
CLAUDE_KEYS_DROP = ("interface", "displayName")


def excluded(rel, name):
    if name in EXC_FILES or name.endswith((".plugin", ".zip", ".pyc")):
        return True
    if name == "plugin.json" or name.endswith(".plugin.json"):
        return rel != KEEP_MANIFEST
    return False


VALID = re.compile(r"[^A-Za-z0-9._\-/]")


def safe(rel):
    """claude.ai rejects zip paths with characters outside [A-Za-z0-9._-/]."""
    return VALID.sub("_", rel)


def fix_hooks(text, problems):
    data = json.loads(text)
    for event, groups in (data.get("hooks") or {}).items():
        for g in groups:
            for h in g.get("hooks", []):
                if "continueOnBlock" in h and h.get("type") != "prompt":
                    del h["continueOnBlock"]; problems.append(f"{event}: removed continueOnBlock")
                t = h.get("timeout")
                if isinstance(t, (int, float)) and t >= 1000:
                    h["timeout"] = max(1, int(t // 1000)); problems.append(f"{event}: timeout {t} -> {h['timeout']}s")
    return json.dumps(data, indent=2) + "\n"


def main():
    root = os.path.abspath(sys.argv[1])
    out_dir = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, ".."))
    manifest = json.load(open(os.path.join(root, KEEP_MANIFEST), encoding="utf8"))
    name = manifest["name"]
    problems = []
    for k in CLAUDE_KEYS_DROP:
        if manifest.pop(k, None) is not None: problems.append(f"manifest: dropped {k}")
    if manifest.get("hooks") == "./hooks/hooks.json":
        del manifest["hooks"]; problems.append("manifest: dropped duplicate hooks path")
    out = os.path.join(out_dir, name + ".plugin")
    if os.path.exists(out): os.remove(out)
    count = 0
    renames = {}
    for r, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in EXC_DIRS]
        for f in files:
            rel = os.path.relpath(os.path.join(r, f), root).replace(os.sep, "/")
            if not excluded(rel, f) and safe(rel) != rel:
                renames[rel] = safe(rel)
    if len({*renames.values()} & set(renames)) or len(set(renames.values())) != len(renames):
        raise SystemExit("path sanitizing would collide: " + str(list(renames.items())[:3]))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for r, dirs, files in os.walk(root):
            dirs[:] = sorted(d for d in dirs if d not in EXC_DIRS)
            for f in sorted(files):
                p = os.path.join(r, f); rel = os.path.relpath(p, root).replace(os.sep, "/")
                if excluded(rel, f): continue
                data = open(p, "rb").read()
                if rel == KEEP_MANIFEST:
                    data = (json.dumps(manifest, indent=2) + "\n").encode()
                elif rel == "hooks/hooks.json":
                    data = fix_hooks(data.decode("utf8"), problems).encode()
                elif f.endswith((".sh", ".bash")) and b"\r\n" in data:
                    data = data.replace(b"\r\n", b"\n"); problems.append(f"CRLF->LF {rel}")
                if f == "source-provenance.json" and renames:
                    txt = data.decode("utf8")
                    for old, new in renames.items():
                        txt = txt.replace('"snapshotPath": "%s"' % old, '"snapshotPath": "%s"' % new)
                    data = txt.encode("utf8")
                zi = zipfile.ZipInfo(renames.get(rel, rel), date_time=(2026, 1, 1, 0, 0, 0))
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = (0o755 if f.endswith((".sh", ".bash")) else 0o644) << 16
                z.writestr(zi, data); count += 1
    # verify the artifact, not the intent
    z = zipfile.ZipFile(out); names = z.namelist()
    assert z.testzip() is None
    pj = [n for n in names if n.split("/")[-1] == "plugin.json" or n.endswith(".plugin.json")]
    assert pj == [KEEP_MANIFEST], f"plugin.json files: {pj}"
    for n in names:
        if n.endswith("hooks.json") or n.endswith("plugin.json"):
            json.loads(z.read(n))
        if n.endswith(".json") and b"continueOnBlock" in z.read(n) and n.endswith("hooks.json") and "/vendor/" not in "/" + n:
            raise SystemExit(f"continueOnBlock left in {n}")
        if n.endswith(".sh") and b"\r\n" in z.read(n) and not n.startswith("vendor/"):
            raise SystemExit(f"CRLF in {n}")
    print(f"{name}: {count} files, {os.path.getsize(out)//1024} KB -> {out}")
    if renames: problems.append(f"renamed {len(renames)} paths with invalid characters")
    bad = [n for n in names if VALID.search(n)]
    assert not bad, f"invalid path characters remain: {bad[:3]}"
    for p in problems[:12]: print("   fixed:", p)
    if len(problems) > 12: print(f"   ... +{len(problems)-12} more fixes")


main()
