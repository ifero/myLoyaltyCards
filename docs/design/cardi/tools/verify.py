#!/usr/bin/env python3
"""Check that every generator in this folder still rebuilds its frame exactly.

    python3 docs/design/cardi/tools/verify.py     # or: yarn frames:check

Exit status is 0 when every generator reproduces its committed frame byte for
byte, 1 otherwise. Nothing here writes into ../frames/ — each generator runs
against a temporary directory, and the last thing this script does is PROVE that.

WHY THIS EXISTS

A stale generator is worse than no generator. It looks authoritative, and the
moment someone runs it, it silently reverts whatever was fixed by hand in the
HTML. That has already happened once in this project: an older lockup generator
still emitted acute accents, and running it wrote `Cardí` back over a corrected
`Cardì`. Only the order the scripts happened to run in saved that file.

HOW THE OUTPUT IS REDIRECTED, AND WHY IT LOOKS ODD

The first attempt at this check redirected output by string-replacing the frames
path inside each generator's source. It matched nothing, because the generators
build their paths from expressions rather than one contiguous literal — so the
"sandboxed" run wrote to the real frames directory, then compared the untouched
copy against itself. Every generator passed, including two that cannot start.

So the redirect happens at the filesystem layer, which cannot be fooled by how a
path is spelled. Reads are deliberately left alone, because some generators
legitimately READ a sibling frame to lift the shared token layer out of it.

Enumerating write APIs is a losing game — `write_text` was patched first, and a
generator using `open()` or `write_bytes` would have escaped it. So the shim
covers the four common ones AND the run is bracketed by a digest of the real
frames directory. The digest is the actual guarantee: a generator that finds a
fifth way to write is caught by the invariant rather than by this file having
predicted it.

IF THIS REPORTS `STALE`

Either the generator drifted, or someone hand-edited the HTML. Decide which is
the source of truth, fix that one, and re-run. Do NOT just regenerate — that is
how hand fixes get lost.
"""
import hashlib
import pathlib
import subprocess
import sys
import tempfile

TOOLS = pathlib.Path(__file__).resolve().parent
FRAMES = TOOLS.parent / "frames"

# Runs inside the child process: redirect writes that land in frames/ into a
# sandbox, leave every other write (and every read) untouched, then execute the
# generator as if it were __main__.
SHIM = '''
import builtins, io, pathlib, runpy, sys
REAL, SAND = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])

def _redirect(path):
    """Sandbox path if `path` is inside the real frames dir, else None."""
    try:
        rel = pathlib.Path(str(path)).resolve().relative_to(REAL)
    except (ValueError, OSError):
        return None
    target = SAND / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    return target

_WRITE = ("w", "a", "x", "+")

_wt, _wb, _po, _bo = (
    pathlib.Path.write_text, pathlib.Path.write_bytes, pathlib.Path.open, builtins.open
)

def _p_write_text(self, *a, **k):
    return _wt(_redirect(self) or self, *a, **k)

def _p_write_bytes(self, *a, **k):
    return _wb(_redirect(self) or self, *a, **k)

def _p_open(self, mode="r", *a, **k):
    if any(m in mode for m in _WRITE):
        return _po(_redirect(self) or self, mode, *a, **k)
    return _po(self, mode, *a, **k)

def _open(file, mode="r", *a, **k):
    if any(m in mode for m in _WRITE) and not isinstance(file, int):
        return _bo(_redirect(file) or file, mode, *a, **k)
    return _bo(file, mode, *a, **k)

pathlib.Path.write_text = _p_write_text
pathlib.Path.write_bytes = _p_write_bytes
pathlib.Path.open = _p_open
builtins.open = _open

# `runpy.run_path` does NOT put the script's own directory on sys.path, unlike
# running `python3 tools/x.py`. Without this a generator that imports a sibling
# module works standalone and fails only here -- which would block every push
# and PR, from a gate whose whole job is to be trustworthy.
script = pathlib.Path(sys.argv[3]).resolve()
sys.path.insert(0, str(script.parent))

sys.argv = [str(script)]
runpy.run_path(sys.argv[0], run_name="__main__")
'''


def digest_frames():
    """One digest over every frame's name and bytes."""
    h = hashlib.sha256()
    for path in sorted(FRAMES.rglob("*")):
        if path.is_file():
            h.update(path.relative_to(FRAMES).as_posix().encode())
            h.update(hashlib.sha256(path.read_bytes()).digest())
    return h.hexdigest()


def main() -> int:
    # Leading underscore = a helper module, not a generator. Without this rule a
    # shared module is run as a script, writes nothing, and is reported NO-OUTPUT
    # -- a red gate caused entirely by adding a file that does its job correctly.
    gens = sorted(
        p for p in TOOLS.glob("*.py")
        if p.name != "verify.py" and not p.name.startswith("_")
    )
    if not gens:
        print("no generators found in", TOOLS)
        return 1

    before = digest_frames()
    committed = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in FRAMES.glob("*.html")}
    results = []

    with tempfile.TemporaryDirectory() as td:
        shim = pathlib.Path(td) / "_shim.py"
        shim.write_text(SHIM)
        for gen in gens:
            sand = pathlib.Path(td) / gen.stem
            sand.mkdir()
            proc = subprocess.run(
                [sys.executable, str(shim), str(FRAMES), str(sand), str(gen)],
                capture_output=True, text=True, cwd=td)
            produced = list(sand.rglob("*.html"))
            if proc.returncode != 0:
                tail = (proc.stderr.strip().splitlines() or ["?"])[-1]
                results.append((gen.name, "ERROR", tail[:64]))
            elif not produced:
                results.append((gen.name, "NO-OUTPUT", "wrote nothing into frames/"))
            else:
                for out in produced:
                    got = hashlib.sha256(out.read_bytes()).hexdigest()
                    if out.name not in committed:
                        results.append((gen.name, "UNTRACKED", out.name))
                    elif got == committed[out.name]:
                        results.append((gen.name, "OK", out.name))
                    else:
                        results.append((gen.name, "STALE", out.name))

    width = max(len(name) for name, _, _ in results)
    for name, verdict, note in results:
        print(f"{name:{width}}  {verdict:9}  {note}")
    print()

    # The invariant, checked rather than assumed: a "read-only" check that wrote
    # to the real directory is the exact accident this tool exists to prevent, and
    # an earlier version of it did precisely that.
    if digest_frames() != before:
        print("FAIL — a generator WROTE INTO ../frames/ during the check. The sandbox "
              "was bypassed; treat the working tree as dirty and `git diff` it.")
        return 1

    bad = [name for name, verdict, _ in results if verdict != "OK"]
    if bad:
        print(f"FAIL — {len(bad)} generator(s) do not reproduce their frame: "
              f"{sorted(set(bad))}")
        return 1
    print(f"OK — all {len(results)} generator(s) reproduce their frames exactly, "
          f"and ../frames/ is untouched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
