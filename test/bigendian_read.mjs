#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from 'h5wasm/node';

async function bigendian_read() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  const dset = f.get('bigendian');
  assert.equal(dset.metadata.littleEndian, false);
  assert.deepEqual([...dset.value].map(Number), [3,2,1]);

  const attr = dset.attrs['bigendian_attr'];
  assert.equal(attr.metadata.littleEndian, false);
  assert.deepEqual([...attr.value].map(Number), [3,2,1]);
}

export const tests = [
  {
    description: 'Read big-endian dataset',
    test: bigendian_read,
  },
];
export default tests;
