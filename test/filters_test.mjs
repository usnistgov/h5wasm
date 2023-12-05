#!/usr/bin/env node

import { strict as assert } from "assert";
import h5wasm from "h5wasm/node";

async function filters_test() {
  await h5wasm.ready;
  const f = new h5wasm.File("./test/compressed.h5", "r");

  assert.deepEqual(f.get("gzip").filters, [{ id: 1, name: "deflate", cd_values: [4] }]);

  assert.deepEqual(f.get("gzip_shuffle").filters, [
    { id: 2, name: "shuffle", cd_values: [8] },
    { id: 1, name: "deflate", cd_values: [4] },
  ]);

  assert.deepEqual(f.get("scaleoffset").filters, [
    {
      id: 6,
      name: "scaleoffset",
      cd_values: [0, 4, 1250, 1, 8, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
  ]);
}

export const tests = [
  {
    description: "Read dataset compression filters",
    test: filters_test,
  },
];
export default tests;
