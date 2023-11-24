#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_dimension_scales() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "dimension_labels.h5");
  const VALUES = [6,5,4,3,2,1];
  const DATA = new Float32Array(VALUES);
  const DIMSCALE_DATA = [10, 12, 14];
  const SHAPE = [2,3];
  const DATASET_NAME = "data";
  const DIMSCALE_NAME = "y";
  const DIMSCALE_DATASET_NAME = "dimscale";
  const DIM_INDEX = 1;
  
  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  // write
  { 
    const write_file = new h5wasm.File(FILEPATH, "w");

    const dataset = write_file.create_dataset({name: DATASET_NAME, data: DATA, shape: SHAPE});
    const dimscale_dataset = write_file.create_dataset({name: DIMSCALE_DATASET_NAME, data: DIMSCALE_DATA});

    dimscale_dataset.make_scale(DIMSCALE_NAME);
    dataset.attach_scale(DIM_INDEX, DIMSCALE_DATASET_NAME);

    write_file.flush();
    write_file.close();
  }

  // read
  {
    const read_file = new h5wasm.File(FILEPATH, "r");

    const dataset = read_file.get(DATASET_NAME);
    assert(dataset instanceof h5wasm.Dataset);

    // dataset is not a dimension scale:
    const not_scale_name = dataset.get_scale_name();
    assert.strictEqual(not_scale_name, null);

    // no scales attached to dimension 0:
    assert.deepEqual(dataset.get_attached_scales(0), []);

    const attached_scales = dataset.get_attached_scales(DIM_INDEX);
    // returns full path, including leading slash
    assert.deepEqual(attached_scales, [`/${DIMSCALE_DATASET_NAME}`]);

    const dimscale_dataset = read_file.get(attached_scales[0]);
    assert(dimscale_dataset instanceof h5wasm.Dataset);

    const scale_name = dimscale_dataset.get_scale_name();
    assert.strictEqual(scale_name, DIMSCALE_NAME);

    read_file.close()
  }

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read dimension scales",
    test: test_dimension_scales
  },
];

export default tests;
