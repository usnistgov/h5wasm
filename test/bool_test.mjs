#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from 'h5wasm/node';

async function bool_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  assert.deepEqual(
    f.get('bool').value,
    new Int8Array([ 0, 1, 1, 0 ])
  );

  assert.deepEqual(
    f.get('bool').json_value,
    [ false, true, true, false ]
  );

  assert.deepEqual(f.get('bool').metadata, {
    chunks: null,
    enum_type: {
      type: 0,
      nmembers: 2,
      members: {
        'FALSE': 0,
        'TRUE': 1
      }
    },
    littleEndian: true,
    maxshape: [2, 2],
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
