#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm";

async function create_chunked() {

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

  const dset = write_file.create_dataset(DSET_NAME, VALUES, SHAPE, DTYPE, MAXSHAPE, CHUNKS);

  write_file.flush();
  write_file.close();

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create chunked dataset",
    test: create_chunked
  },
]
export default tests;
