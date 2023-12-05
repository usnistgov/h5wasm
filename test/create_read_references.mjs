#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_refs() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "refs.h5");
  const VALUES = [12,11,10,9,8,7,6,5,4,3,2,1];
  const DATA = new Float32Array(VALUES);
  const SHAPE = [4,3];
  const DATASET_GROUP = "entry";
  const DATASET_NAME = "data";
  const REFS_GROUP = "refs";
  const OBJECT_REF_DATASET_NAME = "object_refs";
  const REGION_REF_DATASET_NAME = "dset_region_refs";
  const REGION_REF_DATA_0 = [[11.], [ 8.], [ 5.]];
  const REGION_REF_DATA_1 = [[12., 11., 10.]];

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  // write
  { 
    const write_file = new h5wasm.File(FILEPATH, "w");

    write_file.create_group(DATASET_GROUP);
    const dataset_group = write_file.get(DATASET_GROUP);
    dataset_group.create_dataset({name: DATASET_NAME, data: DATA, shape: SHAPE});
    
    const object_refs = [
      dataset_group.create_reference(),
      dataset_group.get(DATASET_NAME).create_reference(),
    ];

    write_file.create_group(REFS_GROUP);
    const refs_group = write_file.get(REFS_GROUP);
    refs_group.create_dataset({name: OBJECT_REF_DATASET_NAME, data: object_refs});

    const dataset = dataset_group.get(DATASET_NAME);
    const region_refs = [
      dataset.create_region_reference([[0,3], [1,2]]),
      dataset.create_region_reference([[0,1], []]),
    ]
    refs_group.create_dataset({name: REGION_REF_DATASET_NAME, data: region_refs})

    write_file.flush();
    write_file.close();
  }

  // read
  {
    const read_file = new h5wasm.File(FILEPATH, "r");

    const dataset_group = read_file.get(DATASET_GROUP);
    assert(dataset_group instanceof h5wasm.Group);

    const refs_group = read_file.get(REFS_GROUP);
    assert(refs_group instanceof h5wasm.Group);

    const object_refs = refs_group.get(OBJECT_REF_DATASET_NAME).value;
    const [obj_0, obj_1] = object_refs.map((ref) => read_file.dereference(ref));
    assert(obj_0 instanceof h5wasm.Group);
    assert.strictEqual(obj_0.path, `/${DATASET_GROUP}`);
    assert(obj_1 instanceof h5wasm.Dataset);
    assert.strictEqual(obj_1.path, `/${DATASET_GROUP}/${DATASET_NAME}`);
    
    const region_refs = refs_group.get(REGION_REF_DATASET_NAME).value;
    const [region_0, region_1] = region_refs.map((ref) => read_file.dereference(ref));
    assert(region_0 instanceof h5wasm.DatasetRegion);
    assert.deepEqual(region_0.value, new Float32Array(REGION_REF_DATA_0.flat()));
    assert(region_1 instanceof h5wasm.DatasetRegion);
    assert.deepEqual(region_1.value, new Float32Array(REGION_REF_DATA_1.flat()));
    // assert.deepEqual(hard_link_dataset.value, DATA);

    read_file.close()
  }

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read object and region references",
    test: test_refs
  },
];

export default tests;
