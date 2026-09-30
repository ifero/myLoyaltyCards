/**
 * @jest-environment node
 */
// Unit tests for scripts/lib/story-status.mjs — how scripts/mark-story-done.mjs reads a story's
// status, decides whether a merged PR completes it, and writes `done` back.
//
// WHY A SUBPROCESS: story-status.mjs is a plain Node ESM module. Jest compiles through
// babel.config.test.js, which targets Hermes/React Native and emits CommonJS, so the module is
// evaluated in one real `node --input-type=module` child instead — the same ESM semantics CI runs it
// under, with no transform in between (the reason story-refs.test.js does the same). Every case shares
// a single spawn, resolved in beforeAll.
//
// WHY THESE FIXTURES: two file shapes have to coexist. Older stories carry a `Status:` body line,
// some of them under a frontmatter block that holds only `baseline_commit:`; a `bmad-build` spec
// carries a frontmatter `status:` key and no such line. Each shape is paired below with the trap that
// would break the other, so a reader that simply learned the new shape (or kept only the old one)
// fails here.

const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./story-status.mjs')).href;

const TEXTS = {
  'legacy body line': '# Story 5.9: Edit card\n\nStatus: review\n\nEpic: 5\n',
  'legacy bold label': '# Story 5.9\n\n**Status:** review — awaiting QA\n',
  'legacy under a baseline-only frontmatter':
    '---\nbaseline_commit: 2ff3e23\n---\n\n# Story 22.1: Components\n\nStatus: review\n',
  'spec, single quoted':
    "---\ntitle: 'Wallet'\nstatus: 'in-review'\nroute: 'dispatch'\n---\n\n## Intent\n",
  'spec, bare with a comment': '---\nstatus: in-review # awaiting merge\n---\n',
  'spec, double quoted': '---\nstatus: "ready-for-dev"\n---\n',
  'spec whose body quotes a Status: line':
    "---\nstatus: 'in-review'\n---\n\nStatus: quoted from another story\n",
  'spec with a nested status key': '---\ncontext:\n  status: review\nstatus: in-progress\n---\n',
  'spec already done': "---\nstatus: 'done'\n---\n",
  'frontmatter without a status key': '---\ntitle: x\n---\n\nStatus: review\n',
  'no status anywhere': '# A story with no status\n'
};

// [story file status, tracker status] — does a merge advance the story?
const PAIRS = [
  ['review', 'in-progress'],
  ['review', 'review'],
  ['in-review', 'review'],
  ['done', 'review'],
  ['done', 'done'],
  ['done', 'in-progress'],
  ['done', null],
  ['in-progress', 'review'],
  ['ready-for-dev', 'ready-for-dev'],
  ['draft', 'backlog'],
  [null, 'review']
];

const runCases = () => {
  const harness = `
    import { readStoryStatus, markStoryDone, isWaitingForMerge } from ${JSON.stringify(MODULE_URL)};
    const texts = JSON.parse(process.env.TEXTS_JSON);
    const pairs = JSON.parse(process.env.PAIRS_JSON);
    process.stdout.write(
      JSON.stringify({
        texts: Object.fromEntries(
          Object.entries(texts).map(([name, text]) => [
            name,
            { status: readStoryStatus(text), done: markStoryDone(text) }
          ])
        ),
        waiting: pairs.map(([file, tracker]) => isWaitingForMerge(file, tracker))
      })
    );
  `;

  let stdout;
  try {
    stdout = execFileSync(process.execPath, ['--input-type=module', '-e', harness], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TEXTS_JSON: JSON.stringify(TEXTS),
        PAIRS_JSON: JSON.stringify(PAIRS)
      }
    });
  } catch (err) {
    throw new Error(`story-status harness failed:\n${err.stderr || err.message}`);
  }

  const { texts, waiting } = JSON.parse(stdout);
  return {
    texts,
    waiting: Object.fromEntries(PAIRS.map((pair, i) => [JSON.stringify(pair), waiting[i]]))
  };
};

describe('story status', () => {
  let texts;
  let waiting;

  beforeAll(() => {
    ({ texts, waiting } = runCases());
  });

  describe('legacy story files (a Status: body line)', () => {
    it('reads a plain Status: line and writes done in place', () => {
      expect(texts['legacy body line'].status).toBe('review');
      expect(texts['legacy body line'].done).toBe(
        '# Story 5.9: Edit card\n\nStatus: done\n\nEpic: 5\n'
      );
    });

    it('reads the bold label and keeps what follows the status token', () => {
      expect(texts['legacy bold label'].status).toBe('review');
      expect(texts['legacy bold label'].done).toBe(
        '# Story 5.9\n\n**Status:** done — awaiting QA\n'
      );
    });

    it('is not fooled by the baseline_commit frontmatter every legacy story carries', () => {
      expect(texts['legacy under a baseline-only frontmatter'].status).toBe('review');
      expect(texts['legacy under a baseline-only frontmatter'].done).toBe(
        '---\nbaseline_commit: 2ff3e23\n---\n\n# Story 22.1: Components\n\nStatus: done\n'
      );
    });

    it('falls back to the body line when the frontmatter has no status key', () => {
      expect(texts['frontmatter without a status key'].status).toBe('review');
      expect(texts['frontmatter without a status key'].done).toBe(
        '---\ntitle: x\n---\n\nStatus: done\n'
      );
    });
  });

  describe('bmad-build specs (a frontmatter status: key)', () => {
    it('reads a quoted status and keeps the quotes when writing done', () => {
      expect(texts['spec, single quoted'].status).toBe('in-review');
      expect(texts['spec, single quoted'].done).toBe(
        "---\ntitle: 'Wallet'\nstatus: 'done'\nroute: 'dispatch'\n---\n\n## Intent\n"
      );
    });

    it('keeps a trailing comment on a bare value', () => {
      expect(texts['spec, bare with a comment'].status).toBe('in-review');
      expect(texts['spec, bare with a comment'].done).toBe(
        '---\nstatus: done # awaiting merge\n---\n'
      );
    });

    it('reads a double-quoted hyphenated status', () => {
      expect(texts['spec, double quoted'].status).toBe('ready-for-dev');
      expect(texts['spec, double quoted'].done).toBe('---\nstatus: "done"\n---\n');
    });

    it('lets the frontmatter win over a Status: line quoted in the body, and leaves the body alone', () => {
      expect(texts['spec whose body quotes a Status: line'].status).toBe('in-review');
      expect(texts['spec whose body quotes a Status: line'].done).toBe(
        "---\nstatus: 'done'\n---\n\nStatus: quoted from another story\n"
      );
    });

    it('reads only the top-level key, not an indented one nested under another', () => {
      expect(texts['spec with a nested status key'].status).toBe('in-progress');
      expect(texts['spec with a nested status key'].done).toBe(
        '---\ncontext:\n  status: review\nstatus: done\n---\n'
      );
    });

    it('leaves a spec that is already done exactly as it is', () => {
      expect(texts['spec already done'].status).toBe('done');
      expect(texts['spec already done'].done).toBe("---\nstatus: 'done'\n---\n");
    });
  });

  describe('a file with no status at all', () => {
    it('reads null and is returned unchanged', () => {
      expect(texts['no status anywhere'].status).toBeNull();
      expect(texts['no status anywhere'].done).toBe('# A story with no status\n');
    });
  });

  describe('which stories a merge advances', () => {
    it.each([
      [['review', 'in-progress'], 'a legacy story at review, whatever the tracker says'],
      [['review', 'review'], 'a legacy story at review in both places'],
      [['in-review', 'review'], 'a spec at in-review'],
      [['done', 'review'], 'a spec bmad-build finished, tracker still at review']
    ])('advances %j — %s', (pair) => {
      expect(waiting[JSON.stringify(pair)]).toBe(true);
    });

    it.each([
      [['done', 'done'], 'already complete'],
      [['done', 'in-progress'], 'done in the file but never put into review'],
      [['done', null], 'done with no tracker entry'],
      [['in-progress', 'review'], 'still being worked, whatever the tracker says'],
      [['ready-for-dev', 'ready-for-dev'], 'not started'],
      [['draft', 'backlog'], 'not started'],
      [[null, 'review'], 'no story file status to go on']
    ])('leaves %j alone — %s', (pair) => {
      expect(waiting[JSON.stringify(pair)]).toBe(false);
    });
  });
});
