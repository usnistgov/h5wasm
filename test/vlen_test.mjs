#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from 'h5wasm/node';

async function vlen_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/vlen.h5', 'r');

  assert.deepEqual(f.get('int8_scalar').metadata, {
    type: 9,
    shape: [],
    maxshape: [],
    chunks: null,
    size: 8,
    total_size: 1,
    signed: true,
    littleEndian: true,
    vlen: false,
    vlen_type: {
      type: 0,
      size: 1,
      signed: true,
      littleEndian: true,
      vlen: false,
    },
  });

  assert.deepEqual(f.get('float32_oneD').metadata, {
    type: 9,
    shape: [3],
    maxshape: [3],
    chunks: null,
    size: 8,
    total_size: 3,
    signed: false,
    littleEndian: true,
    vlen: false,
    vlen_type: {
      type: 1,
      size: 4,
      signed: false,
      littleEndian: true,
      vlen: false,
    },
  });

  assert.deepEqual(f.get('int8_scalar').value, new Int8Array([0, 1]));
  assert.deepEqual(
    f.get('float32_oneD').value,
    [
      new Float32Array([0]),
      new Float32Array([0, 1]),
      new Float32Array([0, 1, 2])
    ]
  );
}

export const tests = [
  {
    description: 'Read variable-length datasets',
    test: vlen_test,
  },
];
export default tests;
