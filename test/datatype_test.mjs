#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from 'h5wasm/node';

async function datatype_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  const datatype = f.get('datatype/value');
  assert(datatype instanceof h5wasm.Datatype);
  assert.deepEqual(datatype.metadata, {
    signed: false,
    type: 3,
    cset: 0,
    strpad: 1,
    vlen: false,
    littleEndian: false,
    size: 10
  });

  assert.deepEqual(Object.keys(datatype.attrs), ['named_dtype_attr']);
  assert.deepEqual(datatype.attrs['named_dtype_attr'].value,
    'An attribute of a named datatype');
}

export const tests = [
  {
    description: 'Read datatypes',
    test: datatype_test,
  },
];
export default tests;
