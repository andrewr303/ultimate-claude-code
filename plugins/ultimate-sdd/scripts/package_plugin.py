#!/usr/bin/env python3
"""Create a reproducible .plugin ZIP; prefer an output path outside the plugin."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import sys
import tempfile
import zipfile
from pathlib import Path

from validate_plugin import ArgumentParser, collect_files, is_link, validate

TIMESTAMP = (1980, 1, 1, 0, 0, 0)
FILE_MODE = (stat.S_IFREG | 0o644) << 16


def _unlinked(path: Path) -> None:
    for candidate in (path, *path.parents):
        if candidate.exists() or candidate.is_symlink():
            if is_link(candidate):
                raise ValueError(f"symlink/junction is not allowed: {candidate}")


def package(root: str | Path, output: str | Path) -> dict:
    """Validate before any output write; replace an existing archive only on success."""
    names: list[str] = []
    temporary: Path | None = None
    try:
        root = Path(root).absolute()
        output = Path(output).absolute()
        result = validate(root)
        if not result["ok"]:
            return {**result, "files": []}
        files, errors = collect_files(root)
        if errors:
            return {"ok": False, "errors": errors, "files": []}
        _unlinked(root)
        _unlinked(output)
        if output.is_dir():
            raise ValueError("output must be a file, not a directory")
        for source in files:
            if output.resolve() == source.resolve() or (output.exists() and output.samefile(source)):
                raise ValueError("output must not alias a plugin source file")
        if output.resolve().is_relative_to(root.resolve()) and output.suffix.casefold() not in {".plugin", ".zip"}:
            raise ValueError("output inside the plugin must be an excluded .plugin/.zip archive; prefer outside the root")
        names = [path.relative_to(root).as_posix() for path in files]
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=".ultimate-sdd-", suffix=".tmp", dir=output.parent, delete=False) as stream:
            temporary = Path(stream.name)
            with zipfile.ZipFile(stream, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
                for source, name in zip(files, names):
                    _unlinked(source)
                    if not source.resolve().is_relative_to(root.resolve()):
                        raise ValueError(f"source escapes plugin root: {name}")
                    info = zipfile.ZipInfo(name, date_time=TIMESTAMP)
                    info.create_system = 3
                    info.external_attr = FILE_MODE
                    info.compress_type = zipfile.ZIP_DEFLATED
                    archive.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
            stream.flush()
            os.fsync(stream.fileno())
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        _unlinked(output)
        os.replace(temporary, output)
        temporary = None
        return {"ok": True, "errors": [], "files": names, "sha256": digest, "output": str(output)}
    except (OSError, ValueError, RecursionError, zipfile.BadZipFile, zipfile.LargeZipFile) as exc:
        return {"ok": False, "errors": [str(exc)], "files": names}
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    try:
        parser = ArgumentParser(description=__doc__, allow_abbrev=False)
        parser.add_argument("--root", type=Path, required=True)
        parser.add_argument("--output", type=Path, required=True,
                            help="Destination .plugin ZIP (prefer outside --root)")
        parser.add_argument("--json", action="store_true")
        args = parser.parse_args(argv)
        result = package(args.root, args.output)
    except (ValueError, OSError, RecursionError) as exc:
        result = {"ok": False, "errors": [str(exc)], "files": []}
    if "--json" in argv:
        print(json.dumps(result, ensure_ascii=True, sort_keys=True))
    elif result["ok"]:
        print(f"Packaged {len(result['files'])} files: {result['output']}")
        print(f"SHA256: {result['sha256']}")
    else:
        for error in result["errors"]:
            print(f"error: {error}", file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
