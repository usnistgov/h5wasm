#!/usr/bin/env node

import { strict as assert } from 'assert';

// Electron preload: Node APIs plus a Chromium navigator (issue #132).
async function electron_preload_test() {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 Chrome/146.0.0.0' },
    configurable: true,
  });
  try {
    // query string forces a fresh module instance, initialized with this navigator
    const { default: h5wasm } = await import(import.meta.resolve('h5wasm/node') + '?preload');
    await h5wasm.ready;
    const f = new h5wasm.File('./test/array.h5', 'r');
    try {
      assert.deepEqual(f.get('bool').json_value, [ false, true, true, false ]);
    }
    finally {
      f.close();
    }
  }
  finally {
    if (saved) Object.defineProperty(globalThis, 'navigator', saved);
    else delete globalThis.navigator;
  }
}

export const tests = [
  {
    description: "Load node build with a browser navigator defined (Electron preload)",
    test: electron_preload_test
  },
];

export default tests;
