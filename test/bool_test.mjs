#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from '../dist/node/hdf5_hl.js';

async function bool_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  assert.deepEqual(
    f.get('bool').value,
    [ false, true, true, false ]
  );

  assert.deepEqual(f.get('bool').metadata, {
    cset: -1,
    enum_type: {
      type: 0,
      nmembers: 2,
      members: {
        'FALSE': 0,
        'TRUE': 1
      }
    },
    littleEndian: true,
    shape: [2, 2],
    signed: true,
    size: 1,
    total_size: 4,
    type: 8,
    vlen: false,
  });
}

export const tests = [
  {
    description: 'Read boolean datasets',
    test: bool_test,
  },
];
export default tests;
