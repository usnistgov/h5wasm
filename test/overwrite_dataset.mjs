#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "../dist/node/hdf5_hl.js";

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

  const dset = write_file.create_dataset(DSET_NAME, VALUES, SHAPE, DTYPE);
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

export const tests = [
  {
    description: "Overwrite slices of existing dataset",
    test: overwrite_datasets
  },
]
export default tests;
