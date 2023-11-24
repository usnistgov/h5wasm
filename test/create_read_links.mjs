#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_links() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "links.h5");
  const VALUES = [3,2,1];
  const DATA = new Float32Array(VALUES);
  const DATASET_GROUP = "entry";
  const DATASET_NAME = "data";
  const LINKS_GROUP = "links";
  const LINK_TARGET = "/entry/data";
  const SOFT_LINK_NAME = "soft";
  const ABSOLUTE_SOFT_LINK_NAME = "/links/absolute_soft";
  const HARD_LINK_NAME = "hard";
  const EXTERNAL_LINK_NAME = "external";
  const EXTERNAL_FILENAME = "other_file.h5";
  const EXTERNAL_DATASET = "other_data"

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  // write
  { 
    const write_file = new h5wasm.File(FILEPATH, "w");

    write_file.create_group(DATASET_GROUP);
    const dataset_group = write_file.get(DATASET_GROUP);
    dataset_group.create_dataset({name: DATASET_NAME, data: DATA});
    
    write_file.create_group(LINKS_GROUP);
    const links_group = write_file.get(LINKS_GROUP);
    links_group.create_soft_link(LINK_TARGET, SOFT_LINK_NAME);
    links_group.create_hard_link(LINK_TARGET, HARD_LINK_NAME);
    links_group.create_external_link(EXTERNAL_FILENAME, EXTERNAL_DATASET, EXTERNAL_LINK_NAME);

    // write a soft link from root:
    write_file.create_soft_link(LINK_TARGET, ABSOLUTE_SOFT_LINK_NAME);

    write_file.flush();
    write_file.close();
  }

  // read
  {
    const read_file = new h5wasm.File(FILEPATH, "r");

    const dataset_group = read_file.get(DATASET_GROUP);
    assert(dataset_group instanceof h5wasm.Group);

    const links_group = read_file.get(LINKS_GROUP);
    assert(links_group instanceof h5wasm.Group);

    const soft_link = read_file.get_link(`${LINKS_GROUP}/${SOFT_LINK_NAME}`);
    assert.strictEqual(soft_link, LINK_TARGET);

    const absolute_soft_link = read_file.get_link(ABSOLUTE_SOFT_LINK_NAME);
    assert.strictEqual(absolute_soft_link, LINK_TARGET);

    const external_link = read_file.get_external_link(`${LINKS_GROUP}/${EXTERNAL_LINK_NAME}`);
    assert.deepEqual(external_link, {filename: EXTERNAL_FILENAME, obj_path: EXTERNAL_DATASET});

    const soft_link_dataset = links_group.get(SOFT_LINK_NAME);
    assert(soft_link_dataset instanceof h5wasm.Dataset);
    assert.deepEqual(soft_link_dataset.value, DATA);

    const absolute_soft_link_dataset = read_file.get(ABSOLUTE_SOFT_LINK_NAME);
    assert(absolute_soft_link_dataset instanceof h5wasm.Dataset);
    assert.deepEqual(absolute_soft_link_dataset.value, DATA);

    const hard_link_dataset = links_group.get(HARD_LINK_NAME);
    assert(hard_link_dataset instanceof h5wasm.Dataset);
    assert.deepEqual(hard_link_dataset.value, DATA);

    read_file.close()
  }

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create and read soft, hard and external links",
    test: test_links
  },
];

export default tests;
