#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function subarray_write_test() {
  await h5wasm.ready;
  const PATH = join('.', 'test', 'tmp');
  const FILEPATH = join(PATH, 'subarray_write.h5');
  const DSET_NAME = 'subarray';
  const DTYPE = '<f4';
  const SHAPE = [2, 2];
  const INITIAL = [0, 0, 0, 0];

  if (!existsSync(PATH)) {
    mkdirSync(PATH);
  }

  const write_file = new h5wasm.File(FILEPATH, 'w');
  const dset = write_file.create_dataset({
    name: DSET_NAME,
    data: INITIAL,
    shape: SHAPE,
    dtype: DTYPE,
  });

  const source = new Float32Array([1, 2, 3, 4, 10, 20, 30, 40]);
  const chunk = source.subarray(4, 8); // expected [10,20,30,40]
  dset.write_slice([[0, 2], []], chunk);

  assert.deepEqual([...dset.value].map(Number), [10, 20, 30, 40]);

  write_file.flush();
  write_file.close();

  // cleanup
  unlinkSync(FILEPATH);
}

export const tests = [
  {
    description: "Write slice using TypedArray.subarray",
    test: subarray_write_test,
  },
];

export default tests;
