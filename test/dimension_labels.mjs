#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_dimension_labels() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "dimension_labels.h5");
  const VALUES = [6,5,4,3,2,1];
  const DATA = new Float32Array(VALUES);
  const SHAPE = [2,3];
  const DATASET_NAME = "data";
  const DIM_INDEX = 1;
  const DIM_LABEL = "y";

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  // write
  { 
    const write_file = new h5wasm.File(FILEPATH, "w");

    const dataset = write_file.create_dataset({name: DATASET_NAME, data: DATA, shape: SHAPE});
    dataset.set_dimension_label(DIM_INDEX, DIM_LABEL);

    write_file.flush();
    write_file.close();
  }

  // read
  {
    const read_file = new h5wasm.File(FILEPATH, "r");

    const dataset = read_file.get(DATASET_NAME);
    assert(dataset instanceof h5wasm.Dataset);

    const labels = dataset.get_dimension_labels();
    assert.deepEqual(labels, [null, DIM_LABEL]);

    read_file.close()
  }

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read dimension labels",
    test: test_dimension_labels
  },
];

export default tests;
