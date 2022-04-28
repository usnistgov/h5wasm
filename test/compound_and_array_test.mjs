#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from "../dist/node/hdf5_hl.js";

async function compound_array_test() {

  await h5wasm.ready;
  var f = new h5wasm.File("./test/array.h5", "r");

  assert.deepEqual(
    f.get("float_arr").value, 
    new Float64Array([
      0, 1, 2, 3,
      4, 5, 6, 7
    ])
  );

  assert.deepEqual(
    f.get("string_arr").value, 
    [
      'hello', 'there',
      'hello', 'there',
      'hello', 'there',
      'hello', 'there'
    ]
  );

  assert.deepEqual(
    f.get("compound").value,
    [
      [
        new Float64Array([ 0, 1, 2, 3 ]),
        [ 'hello', 'there', 'hello', 'there' ]
      ],
      [
        new Float64Array([ 4, 5, 6, 7 ]),
        [ 'hello', 'there', 'hello', 'there' ]
      ]
    ]
    
  )
}

export const tests = [
  {
    description: "Read and process Array and Compound datatypes",
    test: compound_array_test
  }
]
export default tests;