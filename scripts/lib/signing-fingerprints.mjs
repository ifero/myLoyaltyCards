/**
 * Pure helpers behind `scripts/check-android-signing-parity.mjs` (Story 16.35):
 * parsing and comparing Android signing-certificate SHA-256 fingerprints, plus
 * ordering SDK build-tools versions.
 *
 * The Wear OS APK and the phone AAB must be signed with the SAME key: the Wearable
 * Data Layer refuses to connect two artifacts signed differently, and Play rejects
 * the form-factor association. That failure is **silent** — no crash, no log, and
 * Sentry has effectively no Android coverage — so it has to be caught in CI.
 *
 * The comparison is not a `grep`, and this file exists because of three traps:
 *
 *   1. **Two tools.** `apksigner` reads an APK; it cannot read an AAB. An AAB is a
 *      jar, so `keytool -printcert -jarfile` reads that one. Different output shapes.
 *   2. **`apksigner` prints TWO SHA-256 digests per signer** — the *certificate*
 *      digest and the *public key* digest, in that order. Matching the first
 *      "SHA-256" line happens to work today and would break silently if the order
 *      ever changed; matching the wrong one compares a real value that is simply
 *      not the identity Play uses.
 *   3. **`apksigner`'s own line prefix is not stable across build-tools.** Measured
 *      against one identical, validly-signed APK:
 *        build-tools 35.0.0 / 36.0.0 / 36.1.0 -> `Signer #1 certificate SHA-256 digest: ...`
 *        build-tools 37.0.0                   -> `V3.0 Signer: certificate SHA-256 digest: ...`
 *      A regex anchored on `Signer #N` therefore reports a perfectly signed APK as
 *      unsigned the moment a runner image ships build-tools 37. The prefix is matched
 *      loosely and the anchor is the word `certificate` instead. A multi-scheme APK can
 *      also print the SAME certificate under both a `V2 Signer:` and a `V3.0 Signer:`
 *      label, so identical repeats are normal and only DISTINCT values are an error.
 *   4. **Different formats.** `apksigner` prints bare lowercase hex; `keytool`
 *      prints uppercase hex in colon-separated byte pairs.
 *
 * A signing check that compares the wrong digest is worse than no check: it turns an
 * open question into a confident wrong answer.
 */

/** A SHA-256 fingerprint is 32 bytes → 64 hex characters. */
const SHA256_HEX_LENGTH = 64;

/**
 * Normalise a fingerprint to bare uppercase hex, so `apksigner`'s
 * `a1b2…` and `keytool`'s `A1:B2:…` compare equal.
 *
 * @param {string} raw
 * @returns {string} normalised fingerprint
 * @throws {Error} when the value is not exactly 64 hex characters after stripping
 *   separators — a partial or truncated capture must never silently compare equal.
 */
export function normalizeFingerprint(raw) {
  if (typeof raw !== 'string') {
    throw new Error(`Fingerprint must be a string, got ${typeof raw}.`);
  }
  const stripped = raw.trim().replace(/[\s:]/g, '').toUpperCase();
  if (!/^[0-9A-F]+$/.test(stripped) || stripped.length !== SHA256_HEX_LENGTH) {
    throw new Error(
      `Not a SHA-256 fingerprint: "${raw.trim()}" normalised to ${stripped.length} ` +
        `character(s); expected ${SHA256_HEX_LENGTH} hex characters.`
    );
  }
  return stripped;
}

/**
 * Extract the signing **certificate** SHA-256 digest from `apksigner verify
 * --print-certs` output.
 *
 * Deliberately anchored on the literal word `certificate`, so the *public key*
 * digest `apksigner` prints for the same signer can never be picked up by accident.
 *
 * @param {string} stdout raw `apksigner verify --print-certs` output
 * @returns {string} normalised fingerprint
 * @throws {Error} when no certificate digest is present, or more than one signer is.
 */
export function parseApksignerCertificateFingerprint(stdout) {
  // The prefix before `certificate` is deliberately loose (`Signer #1 `, `V3.0 Signer: `,
  // whatever a future build-tools invents); the anchor that carries the meaning is the literal
  // word `certificate` immediately before `SHA-256 digest`, which is exactly what keeps the
  // sibling `... public key SHA-256 digest:` line from ever matching.
  const matches = [
    ...String(stdout).matchAll(/^.*?\bcertificate\s+SHA-?256\s+digest:\s*([0-9A-Fa-f]+)\s*$/gim)
  ].map((m) => m[1]);

  if (matches.length === 0) {
    throw new Error(
      'apksigner printed no "certificate SHA-256 digest" line. The APK is probably ' +
        'unsigned, or apksigner failed — check the command output above.'
    );
  }

  // One APK signed under several signature schemes prints the same certificate once per
  // scheme, so repeats are expected. Genuinely different certificates are not: this project
  // signs with exactly one upload key, and picking one of two would defeat the whole check.
  const distinct = [...new Set(matches.map(normalizeFingerprint))];
  if (distinct.length > 1) {
    throw new Error(
      `apksigner reported ${distinct.length} distinct signing certificates ` +
        `(${distinct.join(', ')}); expected exactly 1. A multi-signer APK cannot be ` +
        'compared against a single upload key.'
    );
  }
  return distinct[0];
}

/**
 * Extract the certificate SHA-256 fingerprint from `keytool -printcert -jarfile`
 * output (used for the phone AAB, which `apksigner` cannot read).
 *
 * `keytool` prints a `Certificate fingerprints:` block containing `SHA1:` and
 * `SHA256:` lines; only the latter is taken. Localised JDKs translate surrounding
 * prose but not the algorithm labels, so the label is the safe anchor.
 *
 * @param {string} stdout raw `keytool -printcert -jarfile <aab>` output
 * @returns {string} normalised fingerprint
 * @throws {Error} when no SHA-256 line is present, or the signers disagree.
 */
export function parseKeytoolCertificateFingerprint(stdout) {
  const matches = [...String(stdout).matchAll(/^\s*SHA-?256:\s*([0-9A-Fa-f:]+)\s*$/gm)].map(
    (m) => m[1]
  );

  if (matches.length === 0) {
    throw new Error(
      'keytool printed no "SHA256:" fingerprint line. The AAB is probably unsigned ' +
        '(no v1/jar signature), or keytool failed — check the command output above.'
    );
  }

  const normalised = matches.map(normalizeFingerprint);
  // keytool repeats the block per signer entry; identical repeats are expected and
  // fine, genuinely different certificates are not.
  const distinct = [...new Set(normalised)];
  if (distinct.length > 1) {
    throw new Error(
      `keytool reported ${distinct.length} distinct signing certificates ` +
        `(${distinct.join(', ')}); expected exactly 1.`
    );
  }
  return distinct[0];
}

/**
 * Compare two fingerprints for signing parity.
 *
 * @param {{ label: string, fingerprint: string }} a
 * @param {{ label: string, fingerprint: string }} b
 * @returns {{ match: boolean, fingerprint: string|null, message: string }}
 */
export function compareSigningFingerprints(a, b) {
  const left = normalizeFingerprint(a.fingerprint);
  const right = normalizeFingerprint(b.fingerprint);

  if (left === right) {
    return {
      match: true,
      fingerprint: left,
      message: `${a.label} and ${b.label} share signing certificate SHA-256 ${left}.`
    };
  }

  return {
    match: false,
    fingerprint: null,
    message:
      `Signing certificate MISMATCH — the Wearable Data Layer will not connect and ` +
      `Play will reject the form-factor association.\n` +
      `  ${a.label}: ${left}\n` +
      `  ${b.label}: ${right}`
  };
}

/**
 * Compare two Android SDK `build-tools` directory names newest-first, by numeric
 * version components.
 *
 * A plain lexicographic sort is wrong here and not academically so: `'36.0.0'`
 * sorts BELOW `'9.0.0'` as a string, so an SDK carrying both would hand back
 * build-tools 9's `apksigner` — old enough that its `--print-certs` output no
 * longer matches {@link parseApksignerCertificateFingerprint}, failing a release
 * on a perfectly well-signed APK.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} negative when `a` is newer (sorts first)
 */
export function compareBuildToolsVersionsDesc(a, b) {
  const parse = (name) => name.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const [left, right] = [parse(a), parse(b)];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0);
    if (diff !== 0) return diff;
  }
  // Numerically equal (e.g. a `-rc` suffix parsed to the same numbers): fall back
  // to a stable, deterministic string order so the resolver never flip-flops.
  return a < b ? 1 : a > b ? -1 : 0;
}
