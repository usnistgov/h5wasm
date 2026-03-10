#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function create_compound_dataset_guessed() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "guessed_compound.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  
  // Structure of Arrays (SoA) Map
  const data = new Map([
    ['id', new Int32Array([10, 20, 30])],
    ['velocity', new Float64Array([1.1, 2.2, 3.3])]
  ]);

  // Create without dtype, forcing `guess_metadata` to unroll the Map
  write_file.create_dataset({name: "particles", data: data});
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const dset = read_file.get("particles");
  
  // Verify metadata (6 is Module.H5T_class_t.H5T_COMPOUND.value)
  assert.equal(dset.metadata.type, 6);
  assert.equal(dset.metadata.compound_type.nmembers, 2);
  assert.equal(dset.metadata.compound_type.members[0].name, "id");
  assert.equal(dset.metadata.compound_type.members[1].name, "velocity");
  
  // Verify contents (process_data returns Array of Structures / row-based output)
  const output = dset.value;
  assert.deepEqual(output, [
    [10, 1.1],
    [20, 2.2],
    [30, 3.3]
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function create_compound_dataset_explicit() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "explicit_compound.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  
  // Structure of Arrays (SoA) Map
  const data = new Map([
    ['id', new Int8Array([1, 2, 3])],
    ['velocity', new Float32Array([1.5, 2.5, 3.5])]
  ]);

  // Provide explicit dtype: Array of [name, dtype_string]
  const explicit_dtype = [
    ["id", "<b"],
    ["velocity", "<f"]
  ];

  write_file.create_dataset({
    name: "particles", 
    data: data, 
    dtype: explicit_dtype
  });
  
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const dset = read_file.get("particles");
  
  // Verify metadata properties match the explicit dtype layout
  assert.equal(dset.metadata.type, 6);
  assert.equal(dset.metadata.compound_type.nmembers, 2);
  assert.equal(dset.metadata.compound_type.members[0].size, 1); // Int8 is 1 byte
  assert.equal(dset.metadata.compound_type.members[1].size, 4); // Float32 is 4 bytes
  assert.equal(dset.metadata.compound_type.members[0].name, "id");
  assert.equal(dset.metadata.compound_type.members[1].name, "velocity");
  
  // Verify contents 
  const output = dset.value;
  assert.deepEqual(output, [
    [1, 1.5],
    [2, 2.5],
    [3, 3.5]
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function create_compound_attribute() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "compound_attr.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  
  // Structure of Arrays (SoA) Map
  const attr_data = new Map([
    ['x', new Int16Array([100, 200])],
    ['y', new Float32Array([1.125, 2.25])]
  ]);

  // Write attribute to the root group
  write_file.create_attribute("my_compound_attr", attr_data);
  
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  
  // Read attribute back
  const attr = read_file.attrs["my_compound_attr"];
  
  // Verify metadata 
  assert.equal(attr.metadata.type, 6);
  assert.equal(attr.metadata.compound_type.nmembers, 2);
  
  // Verify contents
  const output = attr.value;
  assert.deepEqual(output, [
    [100, 1.125],
    [200, 2.25]
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function create_nested_compound_dataset() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "nested_compound.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  
  // Deeply nested Structure of Arrays (SoA) Map
  const data = new Map([
    ['id', new Uint8Array([1, 2])],
    ['velocity', new Float32Array([1.5, 2.5])],
    ['position', new Map([
      ['x', new Float64Array([10.1, 20.1])],
      ['y', new Float64Array([10.2, 20.2])],
      ['z', new Float64Array([10.3, 20.3])]
    ])]
  ]);

  write_file.create_dataset({name: "nested_particles", data: data});
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const dset = read_file.get("nested_particles");
  
  // Verify root metadata
  assert.equal(dset.metadata.type, 6);
  assert.equal(dset.metadata.compound_type.nmembers, 3);
  assert.equal(dset.metadata.compound_type.members[0].name, "id");
  assert.equal(dset.metadata.compound_type.members[1].name, "velocity");
  
  // Verify nested compound metadata
  const pos_meta = dset.metadata.compound_type.members[2];
  assert.equal(pos_meta.name, "position");
  assert.equal(pos_meta.type, 6); // Also a COMPOUND type
  assert.equal(pos_meta.compound_type.nmembers, 3);
  assert.equal(pos_meta.compound_type.members[0].name, "x");
  assert.equal(pos_meta.compound_type.members[1].name, "y");
  assert.equal(pos_meta.compound_type.members[2].name, "z");

  // Verify contents (inner compound unrolls into a nested array)
  const output = dset.value;
  assert.deepEqual(output, [
    [1, 1.5, [10.1, 10.2, 10.3]],
    [2, 2.5, [20.1, 20.2, 20.3]]
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function write_slice_compound_dataset() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "slice_compound.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  const write_file = new h5wasm.File(FILEPATH, "w");
  
  // 1. Create the initial dataset (Length 5)
  const initial_data = new Map([
    ['id', new Int32Array([1, 2, 3, 4, 5])],
    ['velocity', new Float64Array([1.1, 2.2, 3.3, 4.4, 5.5])]
  ]);

  write_file.create_dataset({name: "particles", data: initial_data});
  
  // 2. Prepare the slice data (Length 2)
  const slice_data = new Map([
    ['id', new Int32Array([99, 100])],
    ['velocity', new Float64Array([9.9, 10.0])]
  ]);

  const dset = write_file.get("particles");
  
  // 3. Overwrite indices 2 and 3 (the range [2, 4) )
  dset.write_slice([[2, 4]], slice_data);

  write_file.flush();
  write_file.close();

  // 4. Read back and verify the mutation
  const read_file = new h5wasm.File(FILEPATH, "r");
  const read_dset = read_file.get("particles");
  
  const output = read_dset.value;
  assert.deepEqual(output, [
    [1, 1.1],
    [2, 2.2],
    [99, 9.9],    // <--- Successfully overwritten!
    [100, 10.0],  // <--- Successfully overwritten!
    [5, 5.5]
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

export const tests = [
  {
    description: "Create COMPOUND dataset from Map (guessed types)",
    test: create_compound_dataset_guessed
  },
  {
    description: "Create COMPOUND dataset from Map (explicit dtype)",
    test: create_compound_dataset_explicit
  },
  {
    description: "Create COMPOUND attribute from Map",
    test: create_compound_attribute
  },
  {
    description: "Create deeply nested COMPOUND dataset",
    test: create_nested_compound_dataset
  },
  {
    description: "Write slice to COMPOUND dataset",
    test: write_slice_compound_dataset
  } 
];

export default tests;