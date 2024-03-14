#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_empty() {

  await h5wasm.ready;
  const PATH = join(".", "test");
  const FILEPATH = join(PATH, "empty.h5");
  const DATASET_NAME = "empty_dataset";
  const ATTR_NAME = "empty_attr";

  // read
  {
    const read_file = new h5wasm.File(FILEPATH, "r");

    const dataset = read_file.get(DATASET_NAME);
    assert(dataset instanceof h5wasm.Dataset);
    assert.deepStrictEqual(dataset.shape, null);
    assert.deepStrictEqual(dataset.value, null);

    assert(ATTR_NAME in read_file.attrs);
    assert.deepStrictEqual(read_file.get_attribute(ATTR_NAME), null);

    read_file.close()
  }

}

export const tests = [
  {
    description: "Read empty datasets and attributes",
    test: test_empty
  },
];

export default tests;
