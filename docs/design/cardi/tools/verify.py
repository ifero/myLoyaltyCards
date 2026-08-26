#!/usr/bin/env python3
"""Check that every generator in this folder still rebuilds its frame exactly.

    python3 docs/design/cardi/tools/verify.py

Exit status is 0 when every generator reproduces its committed frame byte for
byte, 1 otherwise. Nothing here writes into ../frames/ — each generator runs
against a temporary directory.

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
copy against itself. Every generator passed, including the broken one.

So the redirect happens at the only layer that cannot be fooled by how a path is
spelled: `pathlib.Path.write_text` itself. Reads are deliberately left alone,
because some generators legitimately READ a sibling frame to lift the shared
token layer out of it.

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
import pathlib, runpy, sys
REAL, SAND = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
_w = pathlib.Path.write_text
def _patched(self, *a, **k):
    try:
        rel = pathlib.Path(str(self)).resolve().relative_to(REAL)
    except ValueError:
        return _w(self, *a, **k)
    t = SAND / rel
    t.parent.mkdir(parents=True, exist_ok=True)
    return _w(t, *a, **k)
pathlib.Path.write_text = _patched
sys.argv = [sys.argv[3]]
runpy.run_path(sys.argv[0], run_name="__main__")
'''


def main() -> int:
    gens = sorted(p for p in TOOLS.glob("*.py") if p.name != "verify.py")
    if not gens:
        print("no generators found in", TOOLS)
        return 1

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
                    digest = hashlib.sha256(out.read_bytes()).hexdigest()
                    if out.name not in committed:
                        results.append((gen.name, "UNTRACKED", out.name))
                    elif digest == committed[out.name]:
                        results.append((gen.name, "OK", out.name))
                    else:
                        results.append((gen.name, "STALE", out.name))

    width = max(len(name) for name, _, _ in results)
    for name, verdict, note in results:
        print(f"{name:{width}}  {verdict:9}  {note}")

    bad = [name for name, verdict, _ in results if verdict != "OK"]
    print()
    if bad:
        print(f"FAIL — {len(bad)} generator(s) do not reproduce their frame: "
              f"{sorted(set(bad))}")
        return 1
    print(f"OK — all {len(results)} generator(s) reproduce their frames exactly")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
