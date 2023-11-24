#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function readwrite_chunked() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "chunked.h5");
  const DSET_NAME = "chunked";
  const DTYPE = "<f4";
  const VALUES = [1,2,3,4,5,6];
  const SHAPE = [3,2];
  const CHUNKS = [3,1];
  const MAXSHAPE = [3,5];

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  const dset = write_file.create_dataset({name: DSET_NAME, data: VALUES, shape: SHAPE, dtype: DTYPE, maxshape: MAXSHAPE, chunks: CHUNKS});

  write_file.flush();
  write_file.close();

  let read_file = new h5wasm.File(FILEPATH, "r");
  const read_dset = read_file.get(DSET_NAME);
  assert.deepEqual(read_dset.metadata.chunks, CHUNKS);
  assert.deepEqual([...read_dset.value], VALUES);

  read_file.close()

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read chunked dataset",
    test: readwrite_chunked
  },
]
export default tests;
