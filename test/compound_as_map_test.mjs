#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from 'h5wasm/node';

const position = (x, y, z) => new Map([['x', new Float32Array(x)], ['y', new Float32Array(y)], ['z', new Float32Array(z)]]);

async function compound_as_map() {
  await h5wasm.ready;
  const f = new h5wasm.File('./test/compound.h5', 'r');
  const dset = f.get('mixed');
  // default is unchanged (array-of-structs)
  assert.deepEqual(dset.value[1], [10, 1.5, 1, '1', [1, -1], [1, 2, 3]]);

  assert.deepEqual(dset.value_as_map, new Map([
    ['id', new Int32Array([0, 10, 20, 30])],
    ['temperature', new Float64Array([0.5, 1.5, 2.5, 3.5])], // unaligned member
    ['color', new Uint8Array([0, 1, 2, 0])], // enum: integer values
    ['name', ['0', '1', '2', '3']], // non-numeric members fall back to Arrays
    ['pair', [[0, 0], [1, -1], [2, -2], [3, -3]]],
    ['position', position([0, 1, 2, 3], [0, 2, 4, 6], [0, 3, 6, 9])], // nested compound
  ]));
  // reading as a Map leaves the cached metadata (and so dtype) untouched
  assert.deepEqual(dset.dtype[4], ['pair', '<h', [2]]);

  const sliced = dset.slice([[1, 4, 2]], { compound_as_map: true });
  assert.deepEqual(sliced.get('id'), new Int32Array([10, 30]));
  assert.deepEqual(sliced.get('name'), ['1', '3']);
  assert.deepEqual(sliced.get('position'), position([1, 3], [2, 6], [3, 9]));
  assert.deepEqual(dset.slice([[1, 2]]), [dset.value[1]]);

  assert.deepEqual(f.get('scalar').value_as_map.get('position'), position([1], [2], [3]));
  assert.deepEqual(dset.attrs['position_attr'].value_as_map, position([0, 1], [0, 2], [0, 3]));
  f.close();
}

export const tests = [
  {
    description: 'Read COMPOUND datasets, slices and attributes as a Map of columns',
    test: compound_as_map,
  },
];
export default tests;
