#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "../dist/node/hdf5_hl.js";

async function create_typedarray_datasets() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "dataset.h5");
  const VALUES = [3,2,1];

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

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  for (let typed_arrayname of TypedArray_to_dtype.keys()) {
    let write_values = (/^Big/.test(typed_arrayname)) ? VALUES.map(BigInt) : VALUES;
    let data = new globalThis[typed_arrayname](write_values);
    write_file.create_dataset(typed_arrayname, data);
  }
  write_file.flush();
  write_file.close();

  let read_file = new h5wasm.File(FILEPATH, "r");
  for (let [name, dtype] of TypedArray_to_dtype.entries()) {
    let dset = read_file.get(name);
    assert.equal(dset.dtype, dtype);
    assert.deepEqual([...dset.value].map(Number), VALUES);
  }
  read_file.close()

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

async function create_vlen_string_dataset() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "vlen_string_dataset.h5");
  const VALUES = ["this", "this other thing"];
  const NAME = "strings";

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_dataset(NAME, VALUES);
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const output = read_file.get(NAME).value;
  assert.deepEqual(output, VALUES);
  read_file.close();
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create datasets of all TypedArray types",
    test: create_typedarray_datasets
  },
  {
    description: "Create VLEN string dataset",
    test: create_vlen_string_dataset
  }
]
export default tests;
