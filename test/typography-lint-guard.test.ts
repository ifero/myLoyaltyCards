/**
 * @jest-environment node
 */
// The type-scale lint guard (Story 21.6): `local/no-literal-font`, defined and wired in
// eslint.config.mjs.
//
// WHY A SUBPROCESS: eslint.config.mjs is a native ES module, and Jest compiles through
// babel.config.test.js to CommonJS, so the config cannot be imported here. One
// `node --input-type=module` child loads it the way `yarn lint` does — through ESLint itself —
// and runs every case below (the pattern scripts/lib/story-refs.test.js established). The rule
// is taken from the configuration ESLint resolved, so the cases exercise the rule that ships.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

// React Native's `Platform.select` keys (`PlatformOSType` plus `default`): any one marks a select.
const PLATFORM_KEYS = ['ios', 'android', 'macos', 'windows', 'web', 'native', 'default'];

// [what the case is, one line of source, the literals the rule must flag, in source order]
const FLAGGED: [string, string, string[]][] = [
  [
    'a literal size, weight and family',
    "const s = { fontSize: 16, fontWeight: '700', fontFamily: 'Menlo' };",
    ['16', "'700'", "'Menlo'"]
  ],
  [
    'both branches of a conditional',
    "const s = { fontSize: size === 'grid' ? 18 : 26 };",
    ['18', '26']
  ],
  [
    'every branch of a nested conditional',
    "const s = { fontWeight: a ? '400' : b ? '600' : '700' };",
    ["'400'", "'600'", "'700'"]
  ],
  [
    'a ?? fallback, the shape AC9 removed from GuestModeBanner',
    'const s = { fontSize: typography?.subheadline?.fontSize ?? 16 };',
    ['16']
  ],
  [
    'either side of || and &&',
    "const s = { fontWeight: (bold && '700') || '400', fontSize: large && 20 };",
    ["'700'", "'400'", '20']
  ],
  ['a literal behind as const', "const s = { fontWeight: '700' as const };", ["'700'"]],
  [
    'a literal behind satisfies',
    "const s = { fontFamily: 'Inter' satisfies string };",
    ["'Inter'"]
  ],
  [
    'every entry of a Platform.select, behind a non-null assertion',
    "const s = { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' })! };",
    ["'Menlo'", "'monospace'"]
  ],
  [
    'a Platform.select under another name',
    "const s = { fontFamily: P.select({ ios: 'Menlo', default: 'monospace' }) };",
    ["'Menlo'", "'monospace'"]
  ],
  ...PLATFORM_KEYS.map((key): [string, string, string[]] => [
    `a Platform.select keyed by ${key} alone`,
    `const s = { fontFamily: Platform.select({ ${key}: 'Menlo' }) };`,
    ["'Menlo'"]
  ]),
  [
    'every entry of a Platform.select, a mistyped key beside a real one included',
    "const s = { fontFamily: Platform.select({ ios: 'Menlo', deafult: 'Courier' }) };",
    ["'Menlo'", "'Courier'"]
  ],
  [
    'an entry spread into a Platform.select',
    "const s = { fontFamily: Platform.select({ ...{ ios: 'Menlo' }, default: FONT_FAMILY.mono }) };",
    ["'Menlo'"]
  ],
  [
    'a Platform.OS ternary, the shape the monospace sites had',
    "const s = { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'Courier' };",
    ["'Menlo'", "'Courier'"]
  ],
  [
    'literals several wrappers deep',
    "const s = { fontWeight: (bold ? '700' : (fallback ?? '400')) as TextStyle['fontWeight'] };",
    ["'700'", "'400'"]
  ],
  ['a template with no substitutions', 'const s = { fontFamily: `Inter` };', ['`Inter`']],
  ['arithmetic on literals', 'const s = { fontSize: 16 * 1.25 };', ['16 * 1.25']],
  ['an inline style in JSX', 'const t = <Text style={{ color, fontSize: 12 }} />;', ['12']],
  ['a quoted key', "const s = { 'fontSize': 16 };", ['16']],
  ['a class field', 'class Theme { fontSize = 16; }', ['16']]
];

// As above, for a shape only a `.ts` file can hold: in a `.tsx` file `<Type>value` is JSX.
const FLAGGED_IN_TS: [string, string, string[]][] = [
  [
    'a literal behind a <Type> assertion, in a .ts file',
    "const s = { fontWeight: <TextStyle['fontWeight']>'700' };",
    ["'700'"]
  ]
];

// [what the case is, one line of source] — each must flag nothing.
const ALLOWED: [string, string][] = [
  [
    'whole tokens, and fields read off them',
    'const s = { ...TYPOGRAPHY.bodyMd, fontWeight: TYPOGRAPHY.bodyMdStrong.fontWeight };'
  ],
  [
    'a size computed from geometry',
    'const s = { fontSize: initials.length === 1 ? size * 0.4 : size * 0.3 };'
  ],
  ['arithmetic that scales a name, literal first', 'const s = { fontSize: 16 * scale };'],
  [
    "a comparison in a conditional's test",
    "const s = { fontSize: variant === 'hero' ? hero.fontSize : body.fontSize };"
  ],
  [
    "a literal in a conditional's test, which is never the value",
    'const s = { fontSize: (count ?? 0) ? hero.fontSize : body.fontSize };'
  ],
  ['a template that substitutes a name', 'const s = { fontFamily: `${FONT_FAMILY.text}` };'],
  [
    'a Platform.select of tokens',
    'const s = { fontFamily: Platform.select({ ios: FONT_FAMILY.text, default: FONT_FAMILY.mono }) };'
  ],
  [
    'a select call not keyed by platform, which is a call like any other',
    'const s = { fontSize: sizes.select({ compact: 12, regular: 16 }) };'
  ],
  [
    'a platform-keyed call that is not select, which is a call like any other',
    "const s = { fontFamily: Platform.pick({ ios: 'Menlo', android: 'Roboto' }) };"
  ],
  ['a getter, which computes its value', 'const s = { get fontSize() { return 16; } };'],
  ['a named value, which the rule does not follow', 'const s = { fontSize: HERO_SIZE };'],
  [
    "a binding's default, such as a monogram's size",
    'const Mark = ({ fontSize = 18 }) => <Text style={monogram(fontSize)} />;'
  ],
  [
    'properties the scale does not guard',
    "const s = { color: '#181824', letterSpacing: 0, lineHeight: 22 };"
  ],
  ['a type, which is not a value', "type Weight = { fontWeight: '700' };"]
];

// [on or off, a file, why] — the resolved configuration for each file must agree. A path need
// not exist to resolve, so layouts the repo does not use today are checked too: specs,
// `__tests__` folders and a story with no JSX, which Storybook's `*.stories.@(ts|tsx)` would load.
const WIRING: ['on' | 'off', string, string][] = [
  ['on', 'app/_layout.tsx', 'the routing layer'],
  ['on', 'features/cards/components/CardTile.tsx', 'a feature'],
  ['on', 'shared/components/ui/Button.tsx', 'a shared component'],
  ['off', 'shared/theme/typography.ts', 'the scale itself'],
  ['off', 'features/cards/components/CardTile.test.tsx', 'a test'],
  ['off', 'features/cards/components/CardTile.spec.tsx', 'a spec'],
  ['off', 'features/cards/__tests__/CardTile.tsx', 'a __tests__ folder'],
  ['off', 'shared/components/ui/Button.stories.tsx', 'a story'],
  ['off', 'shared/components/ui/Button.stories.ts', 'a story with no JSX']
];

// Each case's source and the file name it is parsed as, in the order the harness reports them.
const PROBES = [
  ...FLAGGED.map(([, source]) => ({ source, filename: 'probe.tsx' })),
  ...FLAGGED_IN_TS.map(([, source]) => ({ source, filename: 'probe.ts' })),
  ...ALLOWED.map(([, source]) => ({ source, filename: 'probe.tsx' }))
];

const HARNESS = `
  import { ESLint, Linter } from 'eslint';
  import tsParser from '@typescript-eslint/parser';

  const { probes, files } = JSON.parse(process.env.GUARD_JSON);
  const eslint = new ESLint();
  const configs = await Promise.all(files.map((file) => eslint.calculateConfigForFile(file)));
  const rule = configs[0].plugins.local.rules['no-literal-font'];
  const probeConfig = [
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: { parser: tsParser },
      plugins: { local: { rules: { 'no-literal-font': rule } } },
      rules: { 'local/no-literal-font': 'error' }
    }
  ];
  const linter = new Linter();
  const flagged = probes.map(({ source, filename }) =>
    linter
      .verify(source, probeConfig, { filename })
      .map((message) =>
        message.fatal
          ? 'PARSE ERROR: ' + message.message
          : source.slice(message.column - 1, message.endColumn - 1)
      )
  );
  const severities = configs.map((config) => config?.rules?.['local/no-literal-font']?.[0] ?? 0);
  process.stdout.write(JSON.stringify({ flagged, severities }));
`;

type GuardResult = { flagged: string[][]; severities: number[] };

const runGuard = (): GuardResult => {
  const files = WIRING.map(([, file]) => file);
  try {
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', HARNESS], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GUARD_JSON: JSON.stringify({ probes: PROBES, files }) },
      // A synchronous spawn blocks the event loop, so no Jest timeout can fire while it runs;
      // kill a stalled child instead. Loading every plugin takes seconds on a busy runner.
      timeout: 30_000
    });
    return JSON.parse(stdout) as GuardResult;
  } catch (error) {
    const { stderr, message } = error as { stderr?: string; message: string };
    throw new Error(`lint guard harness failed:\n${stderr || message}`);
  }
};

describe('local/no-literal-font', () => {
  let flaggedBySource: Map<string, string[]>;
  let severityByFile: Map<string, number>;

  beforeAll(() => {
    const { flagged, severities } = runGuard();
    flaggedBySource = new Map(PROBES.map(({ source }, index) => [source, flagged[index] ?? []]));
    severityByFile = new Map(WIRING.map(([, file], index) => [file, severities[index] ?? 0]));
  });

  describe('flags', () => {
    it.each([...FLAGGED, ...FLAGGED_IN_TS])('%s', (_case, source, literals) => {
      expect(flaggedBySource.get(source)).toEqual(literals);
    });
  });

  describe('allows', () => {
    it.each(ALLOWED)('%s', (_case, source) => {
      expect(flaggedBySource.get(source)).toEqual([]);
    });
  });

  describe('runs where the type scale applies', () => {
    it.each(WIRING)('is %s for %s (%s)', (state, file) => {
      expect(severityByFile.get(file)).toBe(state === 'on' ? 2 : 0);
    });
  });
});
