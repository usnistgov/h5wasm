#!/usr/bin/env node

import { strict as assert } from 'assert';
import hdf5 from "../dist/node/hdf5_hl.js";

async function create_dataset() {

  await hdf5.ready;
  var f = new hdf5.File("./test/dataset.h5", "w");

  const TypedArray_to_dtype = new Map([
    ['Uint8Array', '<B'],
    ['Uint16Array', '<H'],
    ['Uint32Array', '<I'],
    ['BigUint64Array', '<Q'],
    ['Int8Array', '<b'],
    ['Int16Array', '<h'],
    ['Int32Array', '<i'],
    ['BigInt64Array', '<q'],
    ['Float64Array', '<d'],
    ['Float32Array', '<f'],
  ])

  for (let typed_arrayname of TypedArray_to_dtype.keys()) {
      let values = (/^Big/.test(typed_arrayname)) ? [3n, 2n, 1n] : [3,2,1];
      let data = new globalThis[typed_arrayname](values);
      f.create_dataset(typed_arrayname, data);
  }
  f.flush();
  f.close();
}

export const tests = [
  {
    description: "Create datasets of all TypedArray types",
    test: create_dataset
  }
]
export default tests;
