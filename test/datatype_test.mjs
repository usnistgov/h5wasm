#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from '../dist/node/hdf5_hl.js';

async function datatype_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  assert.deepEqual(f.get('datatype/value'), new h5wasm.Datatype());
}

export const tests = [
  {
    description: 'Read datatypes',
    test: datatype_test,
  },
];
export default tests;
