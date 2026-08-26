/**
 * @jest-environment node
 */
// Unit tests for the fingerprint parsing behind `scripts/check-android-signing-parity.mjs`
// (Story 16.35, AC5) — the gate that stops a Wear OS APK signed with the wrong key
// from reaching Play, where it would break the Wearable Data Layer silently.
//
// WHY A SUBPROCESS: signing-fingerprints.mjs is a plain Node ESM module in scripts/,
// and Jest compiles through babel.config.test.js, which targets Hermes/React Native
// and emits CommonJS; `moduleFileExtensions` also omits `mjs`. Rather than change the
// transform for every app test to reach a build script, every case is evaluated in one
// real `node --input-type=module` child — the same approach story-refs.test.js and
// story-catalogue.test.js take, and the same ESM semantics CI runs.
//
// WHY THESE FIXTURES: the whole point of the module is that the obvious `grep SHA-256`
// picks the WRONG value. `apksigner` prints the *public key* digest right after the
// *certificate* digest for the same signer, so the "public key digest is not mistaken
// for the certificate" case below is the one that actually earns this file — delete the
// `certificate` anchor from the regex and only that case goes red.

const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./signing-fingerprints.mjs')).href;

// Real shapes, trimmed. Note the ORDER: certificate digest, then public key digest.
const APKSIGNER_OK = `Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1
Signer #1 certificate DN: CN=myLoyaltyCards Upload
Signer #1 certificate SHA-256 digest: 8c1e5b0a4f37d2916ba0c4e57d38f9a1b2c3d4e5f60718293a4b5c6d7e8f9012
Signer #1 certificate SHA-1 digest: 0123456789abcdef0123456789abcdef01234567
Signer #1 certificate MD5 digest: 0123456789abcdef0123456789abcdef
Signer #1 public key SHA-256 digest: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
Signer #1 public key SHA-1 digest: ffffffffffffffffffffffffffffffffffffffff`;

// keytool: uppercase, colon-separated — the same certificate as APKSIGNER_OK.
const KEYTOOL_OK = `Owner: CN=myLoyaltyCards Upload
Issuer: CN=myLoyaltyCards Upload
Serial number: 1a2b3c
Certificate fingerprints:
\t SHA1: 01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67
\t SHA256: 8C:1E:5B:0A:4F:37:D2:91:6B:A0:C4:E5:7D:38:F9:A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:12
Signature algorithm name: SHA256withRSA`;

const KEYTOOL_DIFFERENT = KEYTOOL_OK.replace('8C:1E', '7B:0D');

const EXPECTED = '8C1E5B0A4F37D2916BA0C4E57D38F9A1B2C3D4E5F60718293A4B5C6D7E8F9012';

// [name, fn, argsJson] — evaluated in order, in one child.
const CASES = [
  ['apksigner: certificate digest', 'parseApksignerCertificateFingerprint', [APKSIGNER_OK]],
  [
    'apksigner: unsigned output',
    'parseApksignerCertificateFingerprint',
    ['DOES NOT VERIFY\nERROR: No signature found']
  ],
  [
    'apksigner: two signers',
    'parseApksignerCertificateFingerprint',
    [
      APKSIGNER_OK +
        '\nSigner #2 certificate SHA-256 digest: aaaa5b0a4f37d2916ba0c4e57d38f9a1b2c3d4e5f60718293a4b5c6d7e8f9012'
    ]
  ],
  [
    'apksigner: only a public key digest',
    'parseApksignerCertificateFingerprint',
    [
      'Signer #1 public key SHA-256 digest: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    ]
  ],
  ['keytool: sha256 line', 'parseKeytoolCertificateFingerprint', [KEYTOOL_OK]],
  [
    'keytool: repeated identical entries',
    'parseKeytoolCertificateFingerprint',
    [`${KEYTOOL_OK}\n\n${KEYTOOL_OK}`]
  ],
  [
    'keytool: conflicting certificates',
    'parseKeytoolCertificateFingerprint',
    [`${KEYTOOL_OK}\n\n${KEYTOOL_DIFFERENT}`]
  ],
  ['keytool: no fingerprint block', 'parseKeytoolCertificateFingerprint', ['Owner: CN=nobody']],
  ['normalize: truncated hex', 'normalizeFingerprint', ['8C:1E:5B']],
  ['normalize: non-hex', 'normalizeFingerprint', ['z'.repeat(64)]],
  [
    'compare: parity across tool formats',
    'compareSigningFingerprints',
    [
      {
        label: 'Wear APK',
        fingerprint: '8c1e5b0a4f37d2916ba0c4e57d38f9a1b2c3d4e5f60718293a4b5c6d7e8f9012'
      },
      {
        label: 'phone AAB',
        fingerprint:
          '8C:1E:5B:0A:4F:37:D2:91:6B:A0:C4:E5:7D:38:F9:A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:12'
      }
    ]
  ],
  // Lexicographic sort puts '9.0.0' above '36.0.0'; numeric sort must not.
  [
    'buildtools: two-digit beats single-digit',
    'compareBuildToolsVersionsDesc',
    ['36.0.0', '9.0.0']
  ],
  ['buildtools: patch ordering', 'compareBuildToolsVersionsDesc', ['35.0.1', '35.0.10']],
  ['buildtools: equal', 'compareBuildToolsVersionsDesc', ['36.0.0', '36.0.0']],
  ['buildtools: short vs long', 'compareBuildToolsVersionsDesc', ['36.0', '36.0.0']],
  ['buildtools: short vs long reversed', 'compareBuildToolsVersionsDesc', ['36.0.0', '36.0']],
  [
    'compare: mismatch',
    'compareSigningFingerprints',
    [
      {
        label: 'Wear APK',
        fingerprint: '8c1e5b0a4f37d2916ba0c4e57d38f9a1b2c3d4e5f60718293a4b5c6d7e8f9012'
      },
      {
        label: 'phone AAB',
        fingerprint: '7b0d5b0a4f37d2916ba0c4e57d38f9a1b2c3d4e5f60718293a4b5c6d7e8f9012'
      }
    ]
  ]
];

/** Evaluate every case in one child process; return name -> {ok, value} | {ok:false, error}. */
const runCases = () => {
  const harness = `
    import * as mod from ${JSON.stringify(MODULE_URL)};
    const cases = JSON.parse(process.env.CASES_JSON);
    process.stdout.write(
      JSON.stringify(
        cases.map(([, fn, args]) => {
          try {
            return { ok: true, value: mod[fn](...args) };
          } catch (error) {
            return { ok: false, error: error.message };
          }
        })
      )
    );
  `;

  let stdout;
  try {
    stdout = execFileSync(process.execPath, ['--input-type=module', '-e', harness], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CASES_JSON: JSON.stringify(CASES) }
    });
  } catch (err) {
    throw new Error(`signing-fingerprints harness failed:\n${err.stderr || err.message}`);
  }

  const results = JSON.parse(stdout);
  return Object.fromEntries(CASES.map(([name], i) => [name, results[i]]));
};

describe('signing-fingerprints', () => {
  let r;

  beforeAll(() => {
    r = runCases();
  });

  describe('parseApksignerCertificateFingerprint', () => {
    it('returns the certificate digest, normalised to bare uppercase hex', () => {
      expect(r['apksigner: certificate digest']).toEqual({ ok: true, value: EXPECTED });
    });

    // THE case this file exists for: the public key digest sits directly below the
    // certificate digest for the same signer, and both match a naive /SHA-256/ grep.
    it('never mistakes the public key digest for the certificate digest', () => {
      const result = r['apksigner: only a public key digest'];
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/no "Signer #N certificate SHA-256 digest" line/);
    });

    it('fails on an unsigned APK rather than returning nothing', () => {
      expect(r['apksigner: unsigned output'].ok).toBe(false);
    });

    it('refuses to pick a fingerprint when the APK has multiple signers', () => {
      const result = r['apksigner: two signers'];
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/2 signers/);
    });
  });

  describe('parseKeytoolCertificateFingerprint', () => {
    it('reads the SHA256 line and ignores the SHA1 line above it', () => {
      expect(r['keytool: sha256 line']).toEqual({ ok: true, value: EXPECTED });
    });

    it('tolerates the block being repeated for the same certificate', () => {
      expect(r['keytool: repeated identical entries']).toEqual({ ok: true, value: EXPECTED });
    });

    it('fails when two genuinely different certificates are reported', () => {
      const result = r['keytool: conflicting certificates'];
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/2 distinct signing certificates/);
    });

    it('fails on an AAB with no jar signature', () => {
      expect(r['keytool: no fingerprint block'].ok).toBe(false);
    });
  });

  describe('normalizeFingerprint', () => {
    // A truncated capture must never silently compare equal to another truncation.
    it('rejects a fingerprint that is not exactly 64 hex characters', () => {
      const result = r['normalize: truncated hex'];
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/expected 64 hex characters/);
    });

    it('rejects non-hex input', () => {
      expect(r['normalize: non-hex'].ok).toBe(false);
    });
  });

  describe('compareBuildToolsVersionsDesc', () => {
    // The whole point: `['36.0.0','9.0.0'].sort()` yields '9.0.0' first as strings,
    // which would resolve an ancient apksigner whose --print-certs output the parser
    // above no longer recognises — a red release on a correctly signed APK.
    it('orders 36.0.0 above 9.0.0 (a lexicographic sort does not)', () => {
      expect(r['buildtools: two-digit beats single-digit'].value).toBeLessThan(0);
      expect(['36.0.0', '9.0.0'].sort()[0]).toBe('36.0.0'); // lexicographic ascending
      expect(['36.0.0', '9.0.0'].sort().reverse()[0]).toBe('9.0.0'); // the old bug
    });

    it('compares patch components numerically, not as strings', () => {
      // '35.0.10' is newer than '35.0.1' despite sorting earlier as a string.
      expect(r['buildtools: patch ordering'].value).toBeGreaterThan(0);
    });

    it('returns 0 for identical versions', () => {
      expect(r['buildtools: equal'].value).toBe(0);
    });

    // A missing component counts as 0, so '36.0' and '36.0.0' tie numerically and
    // fall to the documented string tiebreak. What matters is that the tiebreak is
    // deterministic and antisymmetric — Array#sort with an inconsistent comparator
    // is free to produce a different winner per engine, which would make which
    // apksigner gets picked unpredictable.
    it('breaks a numeric tie deterministically and antisymmetrically', () => {
      const forward = r['buildtools: short vs long'].value;
      const reverse = r['buildtools: short vs long reversed'].value;
      expect(forward).not.toBe(0);
      expect(Math.sign(forward)).toBe(-Math.sign(reverse));
    });
  });

  describe('compareSigningFingerprints', () => {
    it('matches apksigner bare hex against keytool colon-separated uppercase', () => {
      expect(r['compare: parity across tool formats'].value).toMatchObject({
        match: true,
        fingerprint: EXPECTED
      });
    });

    it('reports a mismatch with both fingerprints in the message', () => {
      const { value } = r['compare: mismatch'];
      expect(value.match).toBe(false);
      expect(value.fingerprint).toBeNull();
      expect(value.message).toContain(EXPECTED);
      expect(value.message).toContain(
        '7B0D5B0A4F37D2916BA0C4E57D38F9A1B2C3D4E5F60718293A4B5C6D7E8F9012'
      );
    });
  });
});
