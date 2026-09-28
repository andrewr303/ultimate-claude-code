"""Structural and reproducible-package contracts; fixtures never create Git repos."""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import package_plugin  # noqa: E402
import validate_plugin  # noqa: E402


def temp_base() -> Path:
    for key in ("TMPDIR", "TEMP", "TMP"):
        if os.environ.get(key):
            path = Path(os.environ[key]).resolve()
            if path.is_relative_to(ROOT) and path.is_dir():
                return path
    return ROOT / "tests"


class Fixture(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix=".test-plugin-", dir=temp_base())
        self.addCleanup(temporary.cleanup)
        self.workspace = Path(temporary.name)
        self.root = self.workspace / "plugin"
        self.root.mkdir()
        self.output = self.workspace / "output.plugin"
        for directory in validate_plugin.DIRECTORIES:
            (self.root / directory).mkdir()
        for name in validate_plugin.TOP_FILES:
            self.write(name, "Fixture documentation.\n")
        base = {"name": "ultimate-sdd", "version": "1.0.0", "description": "Fixture plugin"}
        for name in validate_plugin.MANIFESTS:
            data = dict(base)
            data["skills"] = "./skills"
            if name == ".claude-plugin/plugin.json":
                data.update(commands="./commands", agents=[f"./agents/{agent}.md" for agent in sorted(validate_plugin.AGENTS)])
            elif name == "plugin.json":
                data["displayName"] = "Ultimate SDD"
            else:
                data["interface"] = {"displayName": "Ultimate SDD"}
            self.write_json(name, data)
        self.write_json(".claude-plugin/marketplace.json", {
            "name": "ultimate-sdd-marketplace", "owner": {"name": "Fixture Author"},
            "plugins": [{"name": "ultimate-sdd", "source": "./"}],
        })
        for agent in validate_plugin.AGENTS:
            self.write(f"agents/{agent}.md", f"---\nname: {agent}\ndescription: Fixture agent\n---\n")
        self.write("skills/orchestrator/SKILL.md", "---\nname: orchestrator\ndescription: >\n  Fixture skill\n  with a multiline description.\n---\nRead `references/model.md`.\n")
        wrapper = "---\ndescription: Fixture command\nargument-hint: [target]\n---\nUse the **orchestrator** skill.\n"
        for name in validate_plugin.COMMANDS:
            self.write(f"commands/{name}.md", wrapper)
            self.write(f"codex/prompts/ultimate-sdd-{name}.md", wrapper)
        for name in ("sdd.py", "plan.py", "validate_plugin.py", "package_plugin.py"):
            self.write(f"scripts/{name}", '"""Fixture executable placeholder, never run."""\n')
        self.write("tests/test_fixture.py", '"""Fixture test placeholder."""\n')
        self.write("references/model.md", "# Model\n")
        self.write("templates/prd-template.md", "# Product requirements\n")
        self.write("examples/example.md", "Illustrative target paths: `src/foo.py`, `tests/test_foo.py`, `docs/plan/INDEX.md`, `docs/prd/example.md`.\n")
        self.write("licenses/LICENSE", "Fixture license\n")
        self.write("hooks/session.py", '"""Fixture hook, never executed."""\n')
        self.write_json("hooks/hooks.json", {"hooks": {
            event: [{"hooks": [{"type": "command", "command": f'python "${{CLAUDE_PLUGIN_ROOT}}/hooks/session.py" {argument}'}]}]
            for event, argument in (("SessionStart", "session-start"), ("PreCompact", "pre-compact"))
        }})
        self.write_json("pipelines/fixture.json", {
            "version": 1, "name": "fixture", "description": "Fixture pipeline",
            "stages": [
                {"id": "first", "skill": "orchestrator", "requires": []},
                {"id": "second", "skill": "orchestrator", "requires": ["first"]},
            ],
        })

    def write(self, name: str, text: str) -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def write_json(self, name: str, value: object) -> Path:
        return self.write(name, json.dumps(value, ensure_ascii=True))

    def data(self, name: str) -> dict:
        return json.loads((self.root / name).read_text(encoding="utf-8"))

    def assert_invalid(self, expected: str) -> dict:
        result = validate_plugin.validate(self.root)
        self.assertFalse(result["ok"], result)
        self.assertIn(expected, "\n".join(result["errors"]))
        return result

    def symlink(self, link: Path, target: Path, directory: bool = False) -> None:
        try:
            link.symlink_to(target, target_is_directory=directory)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"Symbolic links unavailable: {exc}")


class ValidatorTests(Fixture):
    def test_valid_fixture(self) -> None:
        self.assertEqual(validate_plugin.validate(self.root), {"ok": True, "errors": []})

    def test_missing_root_returns_failure(self) -> None:
        result = validate_plugin.validate(self.workspace / "absent")
        self.assertFalse(result["ok"])
        self.assertTrue(result["errors"])

    def test_manifest_identity_and_versions(self) -> None:
        for name in validate_plugin.MANIFESTS:
            original = self.data(name)
            for key, value in (("name", "prd"), ("version", "2.0.0"), ("description", [])):
                with self.subTest(name=name, key=key):
                    self.write_json(name, {**original, key: value})
                    self.assert_invalid(f"{name}: {key}")
            self.write_json(name, original)

    def test_invalid_json_and_duplicate_keys(self) -> None:
        for text in ("{", "[]", '{"name":"ultimate-sdd","name":"other"}'):
            with self.subTest(text=text):
                self.write("plugin.json", text)
                self.assert_invalid("plugin.json: invalid JSON")

    def test_native_schema_and_components(self) -> None:
        name = ".claude-plugin/plugin.json"
        original = self.data(name)
        for patch, expected in (
            ({"displayName": "Ultimate SDD"}, "unsupported native manifest key"),
            ({"invented": True}, "unsupported native manifest key"),
            ({"skills": 42}, "expected a nonempty local path"),
            ({"commands": "./missing"}, "missing packaged target"),
            ({"skills": "../outside"}, "escapes the plugin"),
            ({"agents": ["./agents/planner.md"]}, "required agent not registered"),
            ({"author": []}, "author"),
            ({"keywords": [42]}, "keywords"),
        ):
            with self.subTest(patch=patch):
                self.write_json(name, {**original, **patch})
                self.assert_invalid(expected)
        self.write_json(name, original)

    def test_marketplace(self) -> None:
        name = ".claude-plugin/marketplace.json"
        original = self.data(name)
        for plugins in ([], [None], [{"name": "prd", "source": "./"}],
                        [{"name": "ultimate-sdd", "source": "https://example.com"}],
                        [{"name": "ultimate-sdd", "source": "./", "version": "2.0.0"}]):
            with self.subTest(plugins=plugins):
                self.write_json(name, {**original, "plugins": plugins})
                self.assert_invalid(".claude-plugin/marketplace.json")

    def test_supported_display_names(self) -> None:
        name = ".codex-plugin/plugin.json"
        original = self.data(name)
        for patch in ({"displayName": "Ultimate SDD"}, {"interface": []}, {"interface": {"displayName": "Other"}}):
            with self.subTest(patch=patch):
                self.write_json(name, {**original, **patch})
                self.assert_invalid(name)

    def test_missing_required_agent(self) -> None:
        (self.root / "agents/quality-reviewer.md").unlink()
        self.assert_invalid("agents/quality-reviewer.md")

    def test_skill_and_agent_frontmatter(self) -> None:
        for name in ("skills/orchestrator/SKILL.md", "agents/planner.md"):
            original = (self.root / name).read_text(encoding="utf-8")
            for text in ("No frontmatter\n", "---\nname: thing\n", "---\nname: wrong\ndescription: Good\n---\n",
                         "---\nname: orchestrator\ndescription: []\n---\n",
                         "---\nname: orchestrator\ndescription: 42\n---\n",
                         "---\nname: orchestrator\ndescription: ''\n---\n",
                         "---\nname: orchestrator\nname: duplicate\ndescription: Good\n---\n"):
                with self.subTest(name=name, text=text):
                    self.write(name, text)
                    self.assert_invalid(name)
            self.write(name, original)

    def test_skill_folder_requires_entry_point(self) -> None:
        self.write("skills/unused/notes.md", "Notes\n")
        self.assert_invalid("skills/unused/SKILL.md")

    def test_command_and_codex_parity(self) -> None:
        self.assertEqual(len(validate_plugin.COMMANDS), 34)
        (self.root / "commands/verify.md").unlink()
        (self.root / "codex/prompts/ultimate-sdd-setup.md").unlink()
        self.write("commands/extra.md", "---\ndescription: Extra\n---\n")
        self.write("codex/prompts/prd-apply.md", "---\ndescription: Old namespace\n---\n")
        errors = "\n".join(self.assert_invalid("commands: missing commands/verify.md")["errors"])
        self.assertIn("Codex wrappers: missing codex/prompts/ultimate-sdd-setup.md", errors)
        self.assertIn("commands: unexpected commands/extra.md", errors)
        self.assertIn("Codex wrappers: unexpected codex/prompts/prd-apply.md", errors)

    def test_wrapper_description_required(self) -> None:
        for name in ("commands/apply.md", "codex/prompts/ultimate-sdd-apply.md"):
            self.write(name, "---\nargument-hint: [target]\n---\nUse **orchestrator** skill.\n")
            self.assert_invalid(f"{name}: frontmatter description")

    def test_command_namespace_and_unknown_target(self) -> None:
        for text, expected in (("Run `/prd:apply`.", "obsolete /prd"),
                               ("Run `/prd-apply`.", "obsolete /prd"),
                               ("Run `/ultimate-sdd:missing`.", "unknown command target"),
                               ("Run `/ultimate-sdd-missing`.", "unknown command target")):
            with self.subTest(text=text):
                self.write("references/model.md", text)
                self.assert_invalid(expected)

    def test_marked_skill_target(self) -> None:
        for text in ("Use the **missing** skill.", "Load `plan-missing`."):
            with self.subTest(text=text):
                self.write("commands/apply.md", "---\ndescription: Apply\n---\n" + text)
                self.assert_invalid("unknown skill target")

    def test_explicit_missing_local_targets(self) -> None:
        for path in ("references/missing.md", "templates/missing.json", "skills/missing/SKILL.md",
                     "agents/missing.md", "scripts/missing.py", "hooks/missing.py"):
            with self.subTest(path=path):
                self.write("references/model.md", f"Read `{path}`.\n")
                self.assert_invalid(f"missing packaged target: {path}")

    def test_dynamic_target_repo_and_attribution_references_are_not_dependencies(self) -> None:
        self.write("references/model.md", "\n".join([
            "Read `templates/prd-template.md` and `<plugin>/scripts/sdd.py`.",
            "Use `${CLAUDE_PLUGIN_ROOT}/scripts/plan.py`.",
            "Target paths: `docs/plan/references/example.md`, `docs/prd/new.md`, `src/tests.py`.",
            "Dynamic: `references/*.md`, `templates/<kind>.md`, `skills/{name}/SKILL.md`.",
            "Source ideas: `OpenSpec-main/docs/concepts.md`, `rasen/README.md`.",
            "Never run `rasen apply` or `npx openspec init`.",
        ]))
        self.assertEqual(validate_plugin.validate(self.root), {"ok": True, "errors": []})

    def test_private_paths_and_donor_executables(self) -> None:
        for text, expected in (("Run python " + "C:" + "/private/plugin.py", "private absolute"),
                               ("Run `python rasen/scripts/run.py`.", "donor dependency"),
                               ("Run `npx openspec init`.", "donor dependency")):
            with self.subTest(text=text):
                self.write("references/model.md", text)
                self.assert_invalid(expected)

    def test_hook_validation_and_duplicate_default_registration(self) -> None:
        manifest = ".claude-plugin/plugin.json"
        original = self.data(manifest)
        for hooks in ("./hooks/hooks.json", self.data("hooks/hooks.json")):
            with self.subTest(hooks=hooks):
                self.write_json(manifest, {**original, "hooks": hooks})
                self.assert_invalid("default hooks")
        self.write_json(manifest, original)
        original = self.data("hooks/hooks.json")
        for value in ({}, {"hooks": []}, {"hooks": {"SessionStart": []}}):
            with self.subTest(value=value):
                self.write_json("hooks/hooks.json", value)
                self.assert_invalid("hooks/hooks.json")
        self.write_json("hooks/hooks.json", original)
        (self.root / "hooks/session.py").unlink()
        self.assert_invalid("missing packaged target: hooks/session.py")

    def test_malformed_hook_commands(self) -> None:
        original = self.data("hooks/hooks.json")
        for hook in ({"type": "prompt", "command": "python script.py"}, {"type": "command", "command": []},
                     {"type": "command", "command": "python missing.py"}):
            with self.subTest(hook=hook):
                data = json.loads(json.dumps(original))
                data["hooks"]["SessionStart"][0]["hooks"] = [hook]
                self.write_json("hooks/hooks.json", data)
                self.assert_invalid("hooks/hooks.json:SessionStart")

    def test_pipeline_targets_requirements_and_cycles(self) -> None:
        name = "pipelines/fixture.json"
        original = self.data(name)
        cases = [
            ([{"id": "one", "skill": "missing", "requires": []}], "unknown skill target"),
            ([{"id": "one", "skill": "orchestrator", "requires": ["missing"]}], "requires unknown stage"),
            ([{"id": "one", "skill": "orchestrator", "requires": ["one"]}], "dependency cycle"),
            ([{"id": "one", "skill": "orchestrator", "requires": []}] * 2, "duplicate stage id"),
            ([{"id": "one", "skill": "orchestrator", "requires": "first"}], "requires must be"),
            ([{"id": "one", "skill": "orchestrator", "requires": [42]}], "requires must be"),
            ([{"id": [], "skill": "orchestrator", "requires": []}], "stage id must be"),
            ([None], "stage id must be"),
            ([], "nonempty list"),
        ]
        for stages, expected in cases:
            with self.subTest(stages=stages):
                self.write_json(name, {**original, "stages": stages})
                self.assert_invalid(expected)
        self.write_json(name, {**original, "stages": [
            {"id": "one", "skill": "orchestrator", "requires": ["two"]},
            {"id": "two", "skill": "orchestrator", "requires": ["one"]},
        ]})
        self.assert_invalid("dependency cycle")

    def test_child_pipeline_missing_and_recursive(self) -> None:
        name = "pipelines/fixture.json"
        data = self.data(name)
        data["stages"][0]["childPipeline"] = "missing"
        self.write_json(name, data)
        self.assert_invalid("unknown childPipeline")
        data["stages"][0]["childPipeline"] = "fixture"
        self.write_json(name, data)
        self.assert_invalid("childPipeline dependency cycle")

    def test_json_cli_contract(self) -> None:
        for args, expected in ((["--root", str(self.root), "--json"], 0),
                               (["--unsupported", "--json"], 1)):
            with self.subTest(args=args):
                stdout, stderr = io.StringIO(), io.StringIO()
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    code = validate_plugin.main(args)
                self.assertEqual(code, expected)
                self.assertEqual(stderr.getvalue(), "")
                self.assertEqual(json.loads(stdout.getvalue())["ok"], expected == 0)


class PackageTests(Fixture):
    def test_reproducible_archive_ignores_mtimes_and_modes(self) -> None:
        first = package_plugin.package(self.root, self.output)
        self.assertTrue(first["ok"], first)
        before = self.output.read_bytes()
        for path in self.root.rglob("*"):
            if path.is_file():
                os.utime(path, (1730000000, 1730000000))
        other = self.workspace / "other.plugin"
        second = package_plugin.package(self.root, other)
        self.assertTrue(second["ok"], second)
        self.assertEqual(before, other.read_bytes())
        self.assertEqual(first["sha256"], second["sha256"])
        self.assertEqual(first["sha256"], hashlib.sha256(before).hexdigest())
        with zipfile.ZipFile(self.output) as archive:
            self.assertEqual(archive.namelist(), sorted(first["files"]))
            for info in archive.infolist():
                self.assertEqual(info.date_time, package_plugin.TIMESTAMP)
                self.assertEqual(info.external_attr, package_plugin.FILE_MODE)
                self.assertEqual(info.create_system, 3)
            extracted = self.workspace / "extracted"
            archive.extractall(extracted)
        self.assertEqual(validate_plugin.validate(extracted), {"ok": True, "errors": []})

    def test_excludes_junk_sensitive_paths_and_nested_repositories(self) -> None:
        excluded = [
            ".git/config", "OpenSpec-main/README.md", "rasen/scripts/run.py", "unlisted.md",
            "scripts/__pycache__/x.pyc", "scripts/.cache/state.json", "tests/.test-other/temp.md",
            "references/scratch/debug.md", "references/validation/report.md", "references/.validation-old/report.md",
            "scripts/nested/.git", "scripts/nested/executable.py", "references/donor/README.md",
            "examples/.env", "examples/.env.production", "examples/credentials.json", "examples/private.pem",
            "examples/id_ed25519", "references/old.plugin", "examples/source.zip", "scripts/editor.py~",
        ]
        for name in excluded:
            self.write(name, "Ignored fixture content\n")
        self.write("examples/.env.example", "EXAMPLE_KEY=\n")
        self.write("examples/.env.template", "EXAMPLE_KEY=\n")
        result = package_plugin.package(self.root, self.output)
        self.assertTrue(result["ok"], result)
        self.assertTrue(set(excluded).isdisjoint(result["files"]))
        self.assertIn("examples/.env.example", result["files"])
        self.assertIn("examples/.env.template", result["files"])
        with zipfile.ZipFile(self.output) as archive:
            self.assertEqual(archive.namelist(), result["files"])

    def test_reference_to_excluded_file_fails(self) -> None:
        self.write("scripts/nested/.git", "Fixture worktree marker, not a real repository\n")
        self.write("scripts/nested/run.py", "pass\n")
        self.write("references/model.md", "Run `scripts/nested/run.py`.\n")
        self.assert_invalid("missing packaged target")
        self.assertFalse(package_plugin.package(self.root, self.output)["ok"])
        self.assertFalse(self.output.exists())

    def test_failed_validation_preserves_output_and_does_not_create_directories(self) -> None:
        self.output.write_bytes(b"previous archive")
        previous_mtime = self.output.stat().st_mtime_ns
        (self.root / "hooks/session.py").unlink()
        result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertEqual(result["files"], [])
        self.assertEqual(self.output.read_bytes(), b"previous archive")
        self.assertEqual(self.output.stat().st_mtime_ns, previous_mtime)
        missing = self.workspace / "not-created" / "output.plugin"
        self.assertFalse(package_plugin.package(self.root, missing)["ok"])
        self.assertFalse(missing.parent.exists())

    def test_atomic_replace_failure_preserves_output_and_cleans_temporary(self) -> None:
        self.output.write_bytes(b"previous archive")
        with mock.patch.object(package_plugin.os, "replace", side_effect=OSError("replacement failed")):
            result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertIn("replacement failed", result["errors"][0])
        self.assertEqual(self.output.read_bytes(), b"previous archive")
        self.assertEqual(list(self.workspace.glob(".ultimate-sdd-*.tmp")), [])

    def test_output_must_not_alias_source(self) -> None:
        source = self.root / "README.md"
        before = source.read_bytes()
        result = package_plugin.package(self.root, source)
        self.assertFalse(result["ok"])
        self.assertIn("alias", result["errors"][0])
        self.assertEqual(source.read_bytes(), before)
        try:
            os.link(source, self.output)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"Hard links unavailable: {exc}")
        result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertIn("alias", result["errors"][0])
        self.assertEqual(source.read_bytes(), before)

    def test_inside_root_archive_is_excluded_on_repeat(self) -> None:
        output = self.root / "archive.plugin"
        first = package_plugin.package(self.root, output)
        self.assertTrue(first["ok"], first)
        original = output.read_bytes()
        second = package_plugin.package(self.root, output)
        self.assertTrue(second["ok"], second)
        self.assertEqual(output.read_bytes(), original)
        self.assertNotIn("archive.plugin", second["files"])

    def test_packaged_symlinks_are_rejected_even_inside_root(self) -> None:
        source = self.root / "README.md"
        self.symlink(self.root / "references/link.md", source)
        self.assert_invalid("symlinks/junctions")
        result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertFalse(self.output.exists())

    def test_symlink_escape_directory_is_not_followed(self) -> None:
        outside = self.workspace / "outside"
        outside.mkdir()
        (outside / "hidden.md").write_text("Not part of plugin\n", encoding="utf-8")
        self.symlink(self.root / "references/external", outside, directory=True)
        result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertIn("symlinks/junctions", "\n".join(result["errors"]))
        self.assertFalse(self.output.exists())

    def test_output_symlink_is_rejected(self) -> None:
        original = self.workspace / "outside.plugin"
        original.write_bytes(b"untouched")
        self.symlink(self.output, original)
        result = package_plugin.package(self.root, self.output)
        self.assertFalse(result["ok"])
        self.assertEqual(original.read_bytes(), b"untouched")

    def test_package_cli_json_and_failure_exit(self) -> None:
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", PYTHONUTF8="1")
        completed = subprocess.run(
            [sys.executable, str(SCRIPTS / "package_plugin.py"), "--root", str(self.root), "--output", str(self.output), "--json"],
            cwd=self.workspace, env=env, text=True, capture_output=True, timeout=30,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr + completed.stdout)
        self.assertEqual(completed.stderr, "")
        self.assertTrue(json.loads(completed.stdout)["ok"])
        before = self.output.read_bytes()
        (self.root / "plugin.json").unlink()
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = package_plugin.main(["--root", str(self.root), "--output", str(self.output), "--json"])
        self.assertEqual(code, 1)
        self.assertFalse(json.loads(stdout.getvalue())["ok"])
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(self.output.read_bytes(), before)


class IntegratedTreeTests(unittest.TestCase):
    def test_repository_tree_validates(self) -> None:
        result = validate_plugin.validate(ROOT)
        self.assertTrue(result["ok"], "\n".join(result["errors"]))

    def test_default_validator_root_is_script_location(self) -> None:
        with tempfile.TemporaryDirectory(prefix=".test-plugin-", dir=temp_base()) as cwd:
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", PYTHONUTF8="1")
            result = subprocess.run(
                [sys.executable, str(SCRIPTS / "validate_plugin.py"), "--json"],
                cwd=cwd, env=env, text=True, capture_output=True, timeout=30,
            )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(json.loads(result.stdout), {"ok": True, "errors": []})


if __name__ == "__main__":
    unittest.main()
