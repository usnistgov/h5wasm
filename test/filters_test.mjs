#!/usr/bin/env node

import { strict as assert } from "assert";
import h5wasm from "../dist/node/hdf5_hl.js";

async function filters_test() {
  await h5wasm.ready;
  const f = new h5wasm.File("./test/compressed.h5", "r");

  assert.deepEqual(f.get("gzip").filters, [{ id: 1, name: "deflate" }]);

  assert.deepEqual(f.get("gzip_shuffle").filters, [
    { id: 2, name: "shuffle" },
    { id: 1, name: "deflate" },
  ]);

  assert.deepEqual(f.get("scaleoffset").filters, [
    { id: 6, name: "scaleoffset" },
  ]);
}

export const tests = [
  {
    description: "Read dataset compression filters",
    test: filters_test,
  },
];
export default tests;
