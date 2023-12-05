#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function readwrite_compressed() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "compressed.h5");
  const DSET_NAME = "compressed";
  const DTYPE = "<f4";
  const VALUES = [1,2,3,4,5,6];
  const SHAPE = [3,2];
  const CHUNKS = [3,1];
  const MAXSHAPE = [3,5];
  const COMPRESSION_STRING = 'gzip';
  const COMPRESSION = 1; // gzip
  const COMPRESSION_OPTS_NUMBER = 4;
  const COMPRESSION_OPTS = [COMPRESSION_OPTS_NUMBER];

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  const dset = write_file.create_dataset({name: DSET_NAME, data: VALUES, shape: SHAPE, dtype: DTYPE, maxshape: MAXSHAPE, chunks: CHUNKS, compression: COMPRESSION, compression_opts: COMPRESSION_OPTS});
  write_file.flush();
  write_file.close();

  let read_file = new h5wasm.File(FILEPATH, "r");
  const read_dset = read_file.get(DSET_NAME);
  assert.deepEqual(read_dset.metadata.chunks, CHUNKS);
  assert.deepEqual([...read_dset.value], VALUES);
  assert.deepEqual(read_dset.filters, [{id: 1, name: 'deflate', cd_values: COMPRESSION_OPTS}]);

  read_file.close()

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

async function readwrite_compressed_string() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "compressed_string.h5");
  const DSET_NAME = "compressed";
  const DTYPE = "S1000000";
  const VALUES = ["hello"];
  const SHAPE = [1];
  const CHUNKS = [1];
  const MAXSHAPE = [1];
  const COMPRESSION = 9; // gzip, compression_opts = [9]

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  const dset = write_file.create_dataset({name: DSET_NAME, data: VALUES, shape: SHAPE, dtype: DTYPE, maxshape: MAXSHAPE, chunks: CHUNKS, compression: COMPRESSION});
  write_file.flush();
  write_file.close();

  let read_file = new h5wasm.File(FILEPATH, "r");
  const read_dset = read_file.get(DSET_NAME);
  assert.deepEqual(read_dset.metadata.chunks, CHUNKS);
  assert.deepEqual([...read_dset.value], VALUES);
  assert.deepEqual(read_dset.filters, [{id: 1, name: 'deflate', cd_values: [COMPRESSION]}]);

  read_file.close()

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read compressed dataset",
    test: readwrite_compressed
  },
  {
    description: "Create and read compressed string dataset",
    test: readwrite_compressed_string
  },
]
export default tests;
