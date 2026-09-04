// Shared helpers for the watch Swift-source suites. Not a `*.test.ts` file, so Jest
// treats it as a module rather than a suite.
//
// The watch targets ship Swift that CI compiles but never *runs*: there is no test
// action for `watch-ios/Tests/`. Two suites therefore lift declarations out of the
// shipped source and run them as a standalone program — the symbology contract
// (Story 16.28) for the encoders, and the layout contract (Story 16.27) for the
// barcode geometry. The slicing and the `xcrun swift` plumbing live here rather than
// being copied into each file.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Slice a Swift declaration out of `source`, brace/bracket-matched.
 *
 * Anchors on the signature's OWN trailing delimiter: `[String] = [` contains an
 * earlier `[` belonging to the type annotation, not to the array literal.
 *
 * `label` names the file in failures — extraction throwing is the point, because it
 * fails loudly and names the declaration it could not find rather than silently
 * testing less than it claims.
 */
export const swiftDeclaration = (source: string, signature: string, label: string) => {
  const start = source.indexOf(signature);

  if (start === -1) {
    throw new Error(`Unable to find "${signature}" in ${label}`);
  }

  const open = signature.trimEnd().endsWith('[') ? '[' : '{';
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;

  for (let i = start + signature.length - 1; i < source.length; i += 1) {
    const character = source[i];

    if (character === '"' && source[i - 1] !== '\\') {
      inString = !inString;
    }

    if (inString) {
      continue;
    }

    // Skip comments: a brace or bracket written in prose must not move the depth.
    if (character === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);

      if (newline === -1) {
        break;
      }

      i = newline;
      continue;
    }

    if (character === '/' && source[i + 1] === '*') {
      const commentEnd = source.indexOf('*/', i + 2);

      if (commentEnd === -1) {
        break;
      }

      i = commentEnd + 1;
      continue;
    }

    if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error(`Unbalanced delimiters while slicing "${signature}"`);
};

/** Body of a `switch <subject> { ... }` inside the named function. */
export const switchBody = (
  source: string,
  funcSignature: string,
  label: string,
  subject = 'format'
) => {
  const start = source.indexOf(funcSignature);

  if (start === -1) {
    throw new Error(`Unable to find ${funcSignature} in ${label}`);
  }

  const open = source.indexOf(`switch ${subject} {`, start);
  const close = source.indexOf('\n    }', open);

  return source.slice(open, close);
};

/**
 * Compile and run `program` as a standalone Swift file, feeding it `input` on stdin
 * and returning its stdout.
 *
 * `label` names the source the program was lifted from, and `hint` explains what a
 * failure means for that suite — a trap here is a crash on real card data, not a
 * cosmetic test failure, and the raw output buries that under ~40 lines of LLVM
 * stack dump.
 */
export const runSwiftProgram = ({
  program,
  input,
  label,
  hint
}: {
  program: string;
  input: string;
  label: string;
  hint: string;
}) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-swift-'));
  const file = path.join(directory, 'Harness.swift');

  try {
    fs.writeFileSync(file, program);

    try {
      return execFileSync('xcrun', ['--sdk', 'macosx', 'swift', file], {
        input,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024
      });
    } catch (error) {
      const output = String(
        (error as { stderr?: Buffer | string }).stderr ?? (error as Error).message
      );
      const diagnosis = output
        .split('\n')
        .filter((line) => /Fatal error|error:|warning:/.test(line))
        .slice(0, 8)
        .join('\n');

      // Swift's line number refers to the assembled harness, which is deleted below
      // and does not share the real file's numbering. Quote the line itself, so the
      // offending code is greppable in the real source.
      const harnessLine = Number(output.match(/Harness\.swift:(\d+)/)?.[1]);
      const culprit = Number.isFinite(harnessLine)
        ? `\n\nThat line, lifted verbatim from ${label} (grep for it there — the number ` +
          `above is harness-relative):\n    ${program.split('\n')[harnessLine - 1]?.trim()}`
        : '';

      throw new Error(
        `The declarations lifted from ${label} failed to run. ${hint}\n\n` +
          `${diagnosis || output.slice(0, 600)}${culprit}`
      );
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

/** `describe` on macOS, `describe.skip` elsewhere — `xcrun` is macOS-only. */
export const describeOnMac = process.platform === 'darwin' ? describe : describe.skip;
