#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_swmr_write_read() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "swmr_test.h5");
  const INITIAL_DATA = new Float32Array([1.0, 2.0, 3.0]);
  const APPEND_DATA = new Float32Array([4.0, 5.0, 6.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with SWMR-compatible format (v110 minimum)
  const f_create = new h5wasm.File(FILEPATH, "w", { libver: "v110" });
  
  // Create an extensible chunked dataset (required for SWMR)
  f_create.create_dataset({
    name: "data",
    data: INITIAL_DATA,
    maxshape: [null],
    chunks: [10]
  });
  f_create.flush();
  f_create.close();

  // Open for SWMR write
  const f_write = new h5wasm.File(FILEPATH, "Sw");
  
  // Open for SWMR read
  const f_read = new h5wasm.File(FILEPATH, "Sr");
  
  // Verify initial data in both handles
  const dset_write = f_write.get("data");
  const dset_read = f_read.get("data");
  
  assert.deepEqual([...dset_write.value], [...INITIAL_DATA]);
  assert.deepEqual([...dset_read.value], [...INITIAL_DATA]);
  
  // Append data using write handle
  const new_size = INITIAL_DATA.length + APPEND_DATA.length;
  dset_write.resize([new_size]);
  dset_write.write_slice([[INITIAL_DATA.length, new_size]], APPEND_DATA);
  f_write.flush();
  
  // Before refresh, read handle should still see old data
  assert.equal(dset_read.shape[0], INITIAL_DATA.length);
  
  // Refresh the dataset in read handle
  dset_read.refresh();
  
  // After refresh, should see appended data
  assert.equal(dset_read.shape[0], new_size);
  const all_data = dset_read.value;
  const expected = new Float32Array([...INITIAL_DATA, ...APPEND_DATA]);
  assert.deepEqual([...all_data], [...expected]);
  
  // Clean up
  f_write.close();
  f_read.close();
}

export const tests = [
  {
    description: "SWMR: Write and read with refresh",
    test: test_swmr_write_read
  }
];

export default tests;
