#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()

MOVES = {
    # Route/page-level files
    "src/AuthPage.jsx": "src/pages/AuthPage.jsx",
    "src/ErrorPage.jsx": "src/pages/ErrorPage.jsx",
    "src/GovernancePage.jsx": "src/pages/GovernancePage.jsx",
    "src/LandingPage.jsx": "src/pages/LandingPage.jsx",
    "src/LoadingPage.jsx": "src/pages/LoadingPage.jsx",
    "src/ProposalPage.jsx": "src/pages/ProposalPage.jsx",
    "src/SettingsPage.jsx": "src/pages/SettingsPage.jsx",
    "src/TopicBreakdownPage.jsx": "src/pages/TopicBreakdownPage.jsx",
    "src/TopicSubmissionPage.jsx": "src/pages/TopicSubmissionPage.jsx",
    "src/WaitingListPage.jsx": "src/pages/WaitingListPage.jsx",
    "src/WelcomePage.jsx": "src/pages/WelcomePage.jsx",
    "src/LandingPage.test.jsx": "src/pages/__tests__/LandingPage.test.jsx",

    # App shell/layout
    "src/Header.jsx": "src/components/layout/Header.jsx",
    "src/components/NavBar.jsx": "src/components/layout/NavBar.jsx",
    "src/components/NavigationSidebar.jsx": "src/components/layout/NavigationSidebar.jsx",

    # Helpers
    "src/helpers/resizeImage.js": "src/utils/resizeImage.js",
}

TEXT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".css", ".mjs", ".json"}
SKIP_PARTS = {".git", "node_modules", "dist", "build", "coverage"}
RESOLVE_EXTS = ["", ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".svg", ".png"]
INDEX_FILES = ["index.js", "index.jsx", "index.ts", "index.tsx"]

IMPORT_RE = re.compile(
    r'(?P<prefix>\bfrom\s*[\'"]|import\s*\(\s*[\'"]|^\s*import\s*[\'"]|^\s*export\s+.*?\s+from\s*[\'"])'
    r'(?P<spec>\.{1,2}/[^\'"]+)'
    r'(?P<suffix>[\'"])',
    re.MULTILINE,
)

def posix(path: Path | str) -> str:
    return Path(path).as_posix()

def should_skip(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.parts)

def text_files() -> list[Path]:
    out = []
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT)
        if path.is_file() and not should_skip(rel) and path.suffix in TEXT_EXTS:
            out.append(rel)
    return out

def candidates(importer_old: Path, spec: str) -> list[Path]:
    raw = Path(os.path.normpath((importer_old.parent / spec).as_posix()))
    out = []
    for ext in RESOLVE_EXTS:
        out.append(Path(str(raw) + ext))
    for index in INDEX_FILES:
        out.append(raw / index)
    return out

def new_relative_spec(importer_new: Path, target_new: Path, original_spec: str) -> str:
    rel = os.path.relpath(target_new, importer_new.parent).replace(os.sep, "/")
    if not rel.startswith("."):
        rel = "./" + rel

    original_had_ext = Path(original_spec).suffix != ""
    suffix = Path(rel).suffix
    if not original_had_ext and suffix in {".js", ".jsx", ".ts", ".tsx"}:
        rel = rel[: -len(suffix)]

    return rel

def rewrite_imports(new_file: Path, old_file: Path, old_files: set[Path]) -> None:
    path = ROOT / new_file
    text = path.read_text()
    changed = False

    def replace(match: re.Match[str]) -> str:
        nonlocal changed

        spec = match.group("spec")
        resolved_old = None

        for candidate in candidates(old_file, spec):
            if candidate in old_files:
                resolved_old = candidate
                break

        if resolved_old is None:
            return match.group(0)

        resolved_new = Path(MOVES.get(posix(resolved_old), posix(resolved_old)))
        rewritten = new_relative_spec(new_file, resolved_new, spec)

        if rewritten != spec:
            changed = True

        return f"{match.group('prefix')}{rewritten}{match.group('suffix')}"

    new_text = IMPORT_RE.sub(replace, text)

    if changed:
        path.write_text(new_text)
        print(f"rewrote imports: {new_file}")

def main() -> int:
    old_files = set(text_files())

    for src, dst in MOVES.items():
        src_path = ROOT / src
        dst_path = ROOT / dst

        if not src_path.exists():
            raise SystemExit(f"Missing expected source: {src}")

        if dst_path.exists():
            raise SystemExit(f"Refusing to overwrite existing target: {dst}")

    for src, dst in MOVES.items():
        (ROOT / dst).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["git", "mv", src, dst], check=True)
        print(f"moved: {src} -> {dst}")

    inverse = {Path(dst): Path(src) for src, dst in MOVES.items()}

    for new_file in text_files():
        old_file = inverse.get(new_file, new_file)
        rewrite_imports(new_file, old_file, old_files)

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
