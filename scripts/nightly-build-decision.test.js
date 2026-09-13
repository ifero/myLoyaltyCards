/**
 * @jest-environment node
 */
// Integration tests for `scripts/nightly-build-decision.mjs` — the nightly's change gate
// (Story 16.36, AC2/AC5).
//
// WHY THIS FILE EXISTS AT ALL: the pure decision logic is covered by
// `scripts/lib/build-path-filters.test.js`, and that is not enough. The one defect found in
// review lived in the part no pure test can reach — the `git diff` invocation. Git's default
// `core.quotePath=true` returns `"core/caf\303\251.ts"` for `core/café.ts`, which matched no
// pattern and produced a green "nothing changed" night for a real source change. A unit test
// over `selectTriggeringFiles` could never have caught it, because the corruption happens
// before the pure code sees the path.
//
// WHY A REAL GIT REPO: for the same reason. Mocking `git diff` would encode the assumption that
// was wrong. Each case builds a throwaway repository in a temp dir, commits real files with
// hostile names, and runs the real script against it.
//
// WHY A SUBPROCESS: the script is a plain Node ESM module in scripts/, and Jest compiles through
// babel.config.test.js, which targets Hermes/React Native and emits CommonJS; moduleFileExtensions
// also omits `mjs`. Same approach as the other scripts/ tests — but here the child is the script
// itself, run exactly as CI runs it.

const { execFileSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, dirname } = require('node:path');

const REPO_ROOT = join(__dirname, '..');
const SCRIPT = 'scripts/nightly-build-decision.mjs';

/**
 * The ambient environment with every git variable stripped.
 *
 * MANDATORY here, not hygiene. Git hooks export `GIT_DIR` (and friends) into every child
 * process, so under `.husky/pre-push` these tests would inherit a pointer to the REAL
 * repository and operate on it instead of on their throwaway one — `git init` in a temp dir,
 * then `git commit` against the developer's actual index. In a linked worktree it fails
 * outright, because a worktree's gitdir is not itself a work tree
 * ("fatal: this operation must be run in a work tree").
 *
 * Scrubbing makes each case hermetic: git discovers the repo from `cwd` and nothing else.
 */
const GIT_FREE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
);

/** Build a throwaway repo containing the script, its lib and the real config. */
const makeRepo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'nightly-decision-'));
  const run = (cmd, args) =>
    execFileSync(cmd, args, { cwd: dir, stdio: 'ignore', env: GIT_FREE_ENV });

  run('git', ['init', '-q', '.']);
  run('git', ['config', 'user.email', 'test@example.com']);
  run('git', ['config', 'user.name', 'Test']);
  // Belt and braces: the bug depends on git's DEFAULT quoting, so pin it on rather than
  // relying on the developer's global config not having disabled it.
  run('git', ['config', 'core.quotePath', 'true']);

  for (const rel of [
    SCRIPT,
    'scripts/lib/build-path-filters.mjs',
    '.github/build-path-filters.json'
  ]) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    cpSync(join(REPO_ROOT, rel), join(dir, rel));
  }

  return { dir, run };
};

const write = (dir, rel, body = 'x') => {
  mkdirSync(join(dir, dirname(rel)), { recursive: true });
  writeFileSync(join(dir, rel), body);
};

/** Run the script; return { stdout, status, outputs } with $GITHUB_OUTPUT parsed. */
const decide = (dir, args = []) => {
  const outputFile = join(dir, 'gh-output.txt');
  writeFileSync(outputFile, '');
  let stdout = '';
  let status = 0;
  try {
    stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...GIT_FREE_ENV, GITHUB_OUTPUT: outputFile }
    });
  } catch (error) {
    stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    status = error.status ?? 1;
  }
  const outputs = Object.fromEntries(
    require('node:fs')
      .readFileSync(outputFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at), line.slice(at + 1)];
      })
  );
  return { stdout, status, outputs };
};

/** A repo with one baseline commit tagged `nightly/ios`. */
const seeded = () => {
  const { dir, run } = makeRepo();
  write(dir, 'core/base.ts');
  run('git', ['add', '-A']);
  run('git', ['commit', '-qm', 'base']);
  run('git', ['tag', 'nightly/ios']);
  return { dir, run };
};

const commitAll = (run, message) => {
  run('git', ['add', '-A']);
  run('git', ['commit', '-qm', message]);
};

describe('nightly-build-decision', () => {
  const dirs = [];
  const fresh = () => {
    const r = seeded();
    dirs.push(r.dir);
    return r;
  };

  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  describe('paths git has to quote — the review finding', () => {
    it('BUILDS for a non-ASCII source filename', () => {
      // `core/café.ts` comes back from `git diff --name-only` as `"core/caf\303\251.ts"`.
      // Before `-z`, that matched no pattern: a green, silent, WRONG skip for a real source
      // change. An accented brand asset is an entirely plausible commit in this repo.
      const { dir, run } = fresh();
      write(dir, 'core/café.ts', 'changed');
      commitAll(run, 'accented filename');

      const { outputs, stdout } = decide(dir, ['--platform', 'ios']);
      expect(outputs.build).toBe('true');
      expect(outputs.reason).toBe('changed');
      expect(stdout).toContain('core/café.ts');
    });

    it('BUILDS for a filename containing a double quote', () => {
      const { dir, run } = fresh();
      write(dir, 'core/quote"file.ts', 'changed');
      commitAll(run, 'quoted filename');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('true');
    });

    it('BUILDS for a filename containing spaces', () => {
      const { dir, run } = fresh();
      write(dir, 'core/two words.ts', 'changed');
      commitAll(run, 'spaced filename');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('true');
    });

    it('still SKIPS a non-ASCII filename outside the path set', () => {
      // The fix must not turn into "build on anything weird".
      const { dir, run } = fresh();
      write(dir, 'docs/résumé.md', 'changed');
      commitAll(run, 'accented doc');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('false');
    });
  });

  describe('the ordinary decisions', () => {
    it('SKIPS a docs-only night', () => {
      // What `mark-story-done.yml` lands on main after nearly every merge.
      const { dir, run } = fresh();
      write(dir, 'docs/sprint-artifacts/sprint-status.yaml', 'changed');
      commitAll(run, 'chore(sprint): mark story done after merge [skip ci]');

      const { outputs } = decide(dir, ['--platform', 'ios']);
      expect(outputs.build).toBe('false');
      expect(outputs.reason).toBe('unchanged');
    });

    it('SKIPS a test-only change but BUILDS when real source rides along', () => {
      const { dir, run } = fresh();
      write(dir, 'core/base.test.ts', 'changed');
      commitAll(run, 'test only');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('false');

      write(dir, 'core/base.ts', 'changed too');
      commitAll(run, 'test plus source');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('true');
    });

    it('FAILS OPEN when the baseline tag does not exist', () => {
      const { dir, run } = fresh();
      run('git', ['tag', '-d', 'nightly/ios']);
      const { outputs } = decide(dir, ['--platform', 'ios']);
      expect(outputs.build).toBe('true');
      expect(outputs.reason).toBe('no-baseline');
    });

    it('BUILDS on --force even when nothing changed', () => {
      const { dir } = fresh();
      const { outputs } = decide(dir, ['--platform', 'ios', '--force']);
      expect(outputs.build).toBe('true');
      expect(outputs.reason).toBe('forced');
    });

    it('exits 0 on a skip — a skip is not a failure', () => {
      const { dir, run } = fresh();
      write(dir, 'docs/x.md', 'changed');
      commitAll(run, 'docs');
      expect(decide(dir, ['--platform', 'ios']).status).toBe(0);
    });
  });

  describe('per-platform path sets', () => {
    it('builds Android but NOT iOS for a watch-android/** change', () => {
      // `watch-android/**` is in the nightly's Android set only: the nightly ships the Wear
      // AAB, while nothing in watch-android/ can reach the iOS binary.
      const { dir, run } = fresh();
      run('git', ['tag', 'nightly/android']);
      write(dir, 'watch-android/app/src/main/Foo.kt', 'changed');
      commitAll(run, 'wear only');

      expect(decide(dir, ['--platform', 'android']).outputs.build).toBe('true');
      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('false');
    });

    it('builds iOS but NOT Android for a targets/** change', () => {
      // The watch companion is iOS-only — the deliberate asymmetry in the config.
      const { dir, run } = fresh();
      run('git', ['tag', 'nightly/android']);
      write(dir, 'targets/watch/BarcodeGenerator.swift', 'changed');
      commitAll(run, 'apple watch only');

      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('true');
      expect(decide(dir, ['--platform', 'android']).outputs.build).toBe('false');
    });

    it('builds BOTH for a modules/** change (AC4 regression)', () => {
      // modules/wear-data-layer is natively Android-only, but core/wear-connectivity.ts
      // requires it, so its TypeScript reaches both bundles. Neither release workflow listed
      // it before this story.
      const { dir, run } = fresh();
      run('git', ['tag', 'nightly/android']);
      write(dir, 'modules/wear-data-layer/src/WearDataLayerModule.ts', 'changed');
      commitAll(run, 'local expo module');

      expect(decide(dir, ['--platform', 'ios']).outputs.build).toBe('true');
      expect(decide(dir, ['--platform', 'android']).outputs.build).toBe('true');
    });
  });

  describe('argument handling', () => {
    it('rejects a missing or unknown --platform', () => {
      const { dir } = fresh();
      expect(decide(dir, []).status).toBe(1);
      expect(decide(dir, ['--platform', 'web']).status).toBe(1);
    });

    it('falls back when a flag is given with no value', () => {
      // `--baseline-ref` as the last token used to yield `undefined`, which was then
      // stringified into a nonsense ref name.
      const { dir } = fresh();
      const { status } = decide(dir, ['--platform', 'ios', '--baseline-ref']);
      expect(status).toBe(0);
    });
  });
});
