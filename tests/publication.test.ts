import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const scanner = resolve(import.meta.dirname, '../scripts/check-publication.mjs');
function fixture(run: (directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'sidequest-publication-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: directory });
    run(directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
function check(directory: string) {
  return spawnSync(process.execPath, [scanner], { cwd: directory, encoding: 'utf8' });
}

test('publication gate accepts a clean staged source file', () => fixture(directory => {
  writeFileSync(join(directory, 'app.ts'), 'export const name = "Sidequest";\n');
  execFileSync('git', ['add', '.'], { cwd: directory });
  const result = check(directory);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Publication scan passed/);
}));

test('publication gate checks staged content even after the working file is cleaned', () => fixture(directory => {
  const syntheticWallet = '0x' + 'ab'.repeat(20);
  writeFileSync(join(directory, 'app.ts'), `export const wallet = '${syntheticWallet}';\n`);
  execFileSync('git', ['add', '.'], { cwd: directory });
  writeFileSync(join(directory, 'app.ts'), 'export const name = "Sidequest";\n');
  const result = check(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /wallet\/address literal/);
  assert.ok(!result.stderr.includes(syntheticWallet), 'Scanner diagnostics must redact values.');
}));

test('publication gate rejects environment files regardless of their contents', () => fixture(directory => {
  writeFileSync(join(directory, '.env.local'), 'EXAMPLE=not-a-secret\n');
  execFileSync('git', ['add', '.env.local'], { cwd: directory });
  const result = check(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /forbidden publication artifact/);
}));
