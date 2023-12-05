#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function overwrite_datasets() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "overwrite_dataset.h5");
  const DSET_NAME = "overwrite";
  const DTYPE = "<f4";
  const VALUES = [1,2,3,4,5,6,7,8,9];
  const SHAPE = [3,3];
  const COLUMN_OVERWRITE_VALUES = [20,21,22];
  const ROW_OVERWRITE_VALUES = [30,31,32];


  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  const dset = write_file.create_dataset({name: DSET_NAME, data: VALUES, shape: SHAPE, dtype: DTYPE});
  // select the first column (elements 0:1 of all rows)
  dset.write_slice([[null,null],[0,1]], COLUMN_OVERWRITE_VALUES);
  assert.deepEqual([...dset.value].map(Number), [20,2,3,21,5,6,22,8,9]);

  // select the middle row
  dset.write_slice([[1,2]], ROW_OVERWRITE_VALUES);
  assert.deepEqual([...dset.value].map(Number), [20,2,3,30,31,32,22,8,9]);

  write_file.flush();
  write_file.close();

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

async function overwrite_datasets_strides() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "overwrite_dataset_strides.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  const dset1D = write_file.create_dataset({
    name: "overwrite-1d", 
    data: [0,1,2,3,4,5,6,7,8,9], 
    shape: [10], 
    dtype: "<f4"
  });

  // read slices 1D
  assert.deepEqual([...dset1D.slice([[null, null, 2]])], [0,2,4,6,8]);
  assert.deepEqual([...dset1D.slice([[1, null, 2]])], [1,3,5,7,9]);
  assert.deepEqual([...dset1D.slice([[3, 7, 2]])], [3,5]);
  assert.deepEqual([...dset1D.slice([[null, null, 3]])], [0,3,6,9]);
  assert.deepEqual([...dset1D.slice([[1, null, 3]])], [1,4,7]);
  assert.deepEqual([...dset1D.slice([[3, 9, 3]])], [3,6]);
  assert.deepEqual([...dset1D.slice([[null, null, 100]])], [0]);

  // write slices 1D
  dset1D.write_slice([[3, 9, 3]], [-1,-2])
  assert.deepEqual([...dset1D.value].map(Number), [0,1,2,-1,4,5,-2,7,8,9]);
  dset1D.write_slice([[null, 5, 2]], [-3,-4,-5])
  assert.deepEqual([...dset1D.value].map(Number), [-3,1,-4,-1,-5,5,-2,7,8,9]);

  const dset2D = write_file.create_dataset({
    name: "overwrite-2d", 
    data: [1,2,3,4,5,6,7,8,9], 
    shape: [3,3], 
    dtype: "<f4"
  });

  // read slices 2D
  assert.deepEqual([...dset2D.slice([[null, null, 2], [null, null, null]])], [1,2,3,7,8,9]);
  assert.deepEqual([...dset2D.slice([[null, null, 2], [null, null, 2]])], [1,3,7,9]);
  assert.deepEqual([...dset2D.slice([[null, null, 3], [null, null, 2]])], [1,3]);
  assert.deepEqual([...dset2D.slice([[1, null, 2], [null, null, null]])], [4,5,6]);
  assert.deepEqual([...dset2D.slice([[1, null, 2], [null, null, 2]])], [4,6]);
  assert.deepEqual([...dset2D.slice([[1, null, 2], [1, null, 2]])], [5]);
  assert.deepEqual([...dset2D.slice([[null, null, 100], [null, null, 100]])], [1]);

  // write slices 2D
  dset2D.write_slice([[1, null, 2], [1, null, 2]], [-1])
  assert.deepEqual([...dset2D.value].map(Number), [1,2,3,4,-1,6,7,8,9]);
  dset2D.write_slice([[null, null, 2], [null, null, 2]], [-2,-3,-4,-5])
  assert.deepEqual([...dset2D.value].map(Number), [-2,2,-3,4,-1,6,-4,8,-5]);
  
  write_file.flush();
  write_file.close();

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Overwrite slices of existing dataset",
    test: overwrite_datasets
  },
  {
    description: "Overwrite slices of existing using strides",
    test: overwrite_datasets_strides
  }
]
export default tests;
