#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, readFileSync } from 'fs';

async function file_handlers_exports_test() {
  // web helpers resolve through the package "exports" map (issue #37)
  assert.ok(import.meta.resolve('h5wasm/file_handlers').endsWith('/dist/esm/file_handlers.js'));

  const pkg_url = new URL('../package.json', import.meta.url);
  const { exports } = JSON.parse(readFileSync(pkg_url, 'utf-8'));
  assert.ok(existsSync(new URL(exports['./file_handlers'].types, pkg_url)));
}

export const tests = [
  {
    description: 'Resolve h5wasm/file_handlers through package exports',
    test: file_handlers_exports_test,
  },
];
export default tests;
