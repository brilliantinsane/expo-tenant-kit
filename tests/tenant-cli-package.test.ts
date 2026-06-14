/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

test('Tenant CLI package scripts are wired without changing normal Expo start', () => {
  assert.equal(packageJson.scripts.start, 'expo start');
  assert.equal('start:native' in packageJson.scripts, false);
  assert.equal(packageJson.scripts.ios, 'expo run:ios');
  assert.equal(packageJson.scripts.android, 'expo run:android');
  assert.equal(packageJson.scripts['build:prepare'], 'bun scripts/tenant-cli.ts build-prepare');
  assert.equal(packageJson.scripts['build:reset'], 'bun scripts/tenant-cli.ts build-reset');
});

test('Tenant CLI dependencies are development tooling', () => {
  assert.ok(packageJson.devDependencies.commander);
  assert.ok(packageJson.devDependencies['@inquirer/prompts']);
});
