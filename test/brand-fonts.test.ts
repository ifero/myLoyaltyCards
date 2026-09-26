import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { TYPOGRAPHY, monogram } from '@/shared/theme/typography';

import appJson from '../app.json';

/**
 * The brand faces, across the three places that must agree about them (Story 21.6).
 *
 * The typography tokens NAME a family and a weight; `app.json`'s `expo-font` plugin entry
 * REGISTERS faces under a family name for each platform; and the files under `assets/fonts/`
 * DECLARE their own family and weight in their `name` and `OS/2` tables. Nothing else ties the
 * three together, and every way they can disagree fails silently on a device while the suite
 * stays green:
 *
 * - **iOS resolves `fontFamily` against the family name inside the file**, not against anything
 *   this repository declares. A face whose name table spells its family differently is simply
 *   not in family `Inter`, so `fontWeight` picks the nearest face that is — a heading renders at
 *   the wrong weight and nothing reports it.
 * - **iOS infers each face's weight from its PostScript-name suffix** (`RCTGetFontWeight` in
 *   RCTFont.mm matches `…SemiBold`, `…Bold` and friends), so a face named off-convention competes
 *   for the wrong weight.
 * - **Android resolves only what `app.json` registers**, and a weight no face covers is synthesised
 *   (faux bold) or snapped to a neighbour.
 *
 * So these tests read the committed bytes, the way the platforms will.
 */

const ROOT = join(__dirname, '..');
const FONTS_DIR = join(ROOT, 'assets', 'fonts');

type FontDefinition = { path: string; weight: number; style?: string };
type AndroidFontFamily = { fontFamily: string; fontDefinitions: FontDefinition[] };
type ExpoFontPluginProps = {
  android?: { fonts?: AndroidFontFamily[] };
  ios?: { fonts?: string[] };
};

const expoFontProps = (): ExpoFontPluginProps => {
  // Widened first: the JSON import types `plugins` as a union of every plugin's option shape.
  const plugins: unknown[] = appJson.expo.plugins;
  const entry = plugins.find(
    (plugin): plugin is [string, ExpoFontPluginProps] =>
      Array.isArray(plugin) && plugin[0] === 'expo-font'
  );
  if (!entry) {
    throw new Error('app.json registers no expo-font plugin entry');
  }
  return entry[1];
};

/** The subset of an sfnt file's metadata the platforms resolve faces by. */
type FaceMetadata = {
  family: string;
  postScriptName: string;
  weightClass: number;
  isVariable: boolean;
};

const readNameTable = (font: Buffer, offset: number): Map<number, string> => {
  const count = font.readUInt16BE(offset + 2);
  const stringsOffset = offset + font.readUInt16BE(offset + 4);
  const names = new Map<number, string>();
  for (let i = 0; i < count; i += 1) {
    const record = offset + 6 + i * 12;
    const [platform, encoding, language, nameId, length, start] = [0, 2, 4, 6, 8, 10].map((field) =>
      font.readUInt16BE(record + field)
    ) as [number, number, number, number, number, number];
    // Windows / Unicode BMP / US English — the record every face here carries for each field.
    if (platform === 3 && encoding === 1 && language === 0x409) {
      const utf16be = font.subarray(stringsOffset + start, stringsOffset + start + length);
      names.set(nameId, Buffer.from(utf16be).swap16().toString('utf16le'));
    }
  }
  return names;
};

const readFace = (file: string): FaceMetadata => {
  const font = readFileSync(file);
  const tables = new Map<string, number>();
  for (let i = 0; i < font.readUInt16BE(4); i += 1) {
    const record = 12 + i * 16;
    tables.set(font.toString('latin1', record, record + 4), font.readUInt32BE(record + 8));
  }
  const nameOffset = tables.get('name');
  const os2Offset = tables.get('OS/2');
  if (nameOffset === undefined || os2Offset === undefined) {
    throw new Error(`${file} has no name or OS/2 table`);
  }
  const names = readNameTable(font, nameOffset);
  return {
    // CoreText groups faces by the typographic family (name ID 16) where one exists, falling
    // back to the legacy family (ID 1) — so Inter SemiBold, whose legacy family is
    // "Inter SemiBold", still lands in family "Inter". Verified with CoreText directly.
    family: names.get(16) ?? names.get(1) ?? '',
    postScriptName: names.get(6) ?? '',
    weightClass: font.readUInt16BE(os2Offset + 4),
    isVariable: tables.has('fvar')
  };
};

/** The PostScript suffixes `RCTGetFontWeight` maps to each weight this app can request. */
const RCT_WEIGHT_SUFFIXES: Record<number, RegExp> = {
  400: /-(Regular|Normal)$/i,
  500: /-Medium$/i,
  600: /-(SemiBold|DemiBold)$/i,
  700: /-Bold$/i,
  800: /-(ExtraBold|UltraBold|Heavy)$/i
};

const faceKey = (family: string, weight: number | string): string => `${family} @ ${weight}`;

const listFontFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFontFiles(path);
    return /\.(ttf|otf|woff2?)$/i.test(entry.name) ? [path] : [];
  });

const toRepoPath = (appJsonPath: string): string => join(ROOT, appJsonPath);

describe('brand fonts — tokens, app.json and the committed faces agree', () => {
  const props = expoFontProps();
  const androidFamilies = props.android?.fonts ?? [];
  const iosFonts = props.ios?.fonts ?? [];

  const usedFaces = new Set(
    [...Object.values(TYPOGRAPHY), monogram(1)].map((token) =>
      faceKey(token.fontFamily, token.fontWeight)
    )
  );

  it('registers the faces with the object form on Android and a plain list on iOS', () => {
    expect(androidFamilies.length).toBeGreaterThan(0);
    expect(iosFonts.length).toBeGreaterThan(0);
  });

  it('registers exactly the faces the tokens use on Android — every one, and no others (AC1)', () => {
    const registered = androidFamilies.flatMap(({ fontFamily, fontDefinitions }) =>
      fontDefinitions.map(({ weight }) => faceKey(fontFamily, weight))
    );

    expect(new Set(registered).size).toBe(registered.length);
    expect([...registered].sort()).toEqual([...usedFaces].sort());
  });

  it('bundles exactly the faces the tokens use on iOS, as the files themselves declare them', () => {
    const declared = iosFonts.map((file) => {
      const face = readFace(toRepoPath(file));
      return faceKey(face.family, face.weightClass);
    });

    expect([...declared].sort()).toEqual([...usedFaces].sort());
  });

  it('points both platforms at the same files', () => {
    const android = androidFamilies.flatMap(({ fontDefinitions }) =>
      fontDefinitions.map(({ path }) => path)
    );

    expect([...android].sort()).toEqual([...iosFonts].sort());
  });

  it('registers each Android face under the family and weight its own file declares', () => {
    for (const { fontFamily, fontDefinitions } of androidFamilies) {
      for (const { path, weight, style } of fontDefinitions) {
        const face = readFace(toRepoPath(path));
        expect({ path, family: face.family, weight: face.weightClass }).toEqual({
          path,
          family: fontFamily,
          weight
        });
        expect(style ?? 'normal').toBe('normal');
      }
    }
  });

  it('names every face so RCTFont infers the weight it is registered at', () => {
    for (const file of iosFonts) {
      const { postScriptName, weightClass } = readFace(toRepoPath(file));
      const suffix = RCT_WEIGHT_SUFFIXES[weightClass];

      expect({ file, postScriptName, matches: suffix?.test(postScriptName) }).toEqual({
        file,
        postScriptName,
        matches: true
      });
    }
  });

  it('ships static faces only — SDK 55 cannot select a weight from a variable font', () => {
    for (const file of iosFonts) {
      expect({ file, isVariable: readFace(toRepoPath(file)).isVariable }).toEqual({
        file,
        isVariable: false
      });
    }
  });

  it('commits no font file that app.json does not register', () => {
    const committed = listFontFiles(FONTS_DIR).map((file) => relative(ROOT, file));
    const registered = iosFonts.map((file) => relative(ROOT, toRepoPath(file)));

    expect([...committed].sort()).toEqual([...registered].sort());
  });

  it('registers the same faces for Storybook, whose web bundle never sees app.json', () => {
    const css = readFileSync(join(ROOT, '.storybook', 'brand-fonts.css'), 'utf8');
    const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body = '']) => ({
      family: /font-family:\s*'([^']+)'/.exec(body)?.[1],
      weight: /font-weight:\s*(\d+)/.exec(body)?.[1],
      src: /url\('\.\.\/([^']+)'\)/.exec(body)?.[1]
    }));

    expect(rules.map(({ family, weight }) => faceKey(family ?? '?', weight ?? '?')).sort()).toEqual(
      [...usedFaces].sort()
    );
    for (const { family, weight, src } of rules) {
      const face = readFace(join(ROOT, src ?? ''));
      expect({ src, family: face.family, weight: String(face.weightClass) }).toEqual({
        src,
        family,
        weight
      });
    }
  });

  it('keeps each family’s SIL Open Font License 1.1 text beside its faces', () => {
    const directories = new Set(iosFonts.map((file) => dirname(toRepoPath(file))));

    for (const directory of directories) {
      const licence = ['OFL.txt', 'LICENSE.txt']
        .map((name) => join(directory, name))
        .find((candidate) => existsSync(candidate));

      expect({ directory: relative(ROOT, directory), hasLicence: licence !== undefined }).toEqual({
        directory: relative(ROOT, directory),
        hasLicence: true
      });
      expect(readFileSync(licence as string, 'utf8')).toContain(
        'SIL OPEN FONT LICENSE Version 1.1'
      );
    }
  });
});
