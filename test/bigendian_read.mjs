#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from '../dist/node/hdf5_hl.js';

async function bigendian_read() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  const dset = f.get('bigendian');
  console.log(dset.metadata);
  assert.deepEqual([...dset.value].map(Number), [3,2,1]);
}

export const tests = [
  {
    description: 'Read big-endian dataset',
    test: bigendian_read,
  },
];
export default tests;
