#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function test_track_order() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const TRACKED_FILEPATH = join(PATH, "track_order.h5");
  const UNTRACKED_FILEPATH = join(PATH, "untrack_order.h5");

  const VALUES = [3,2,1];
  const DATA = new Float32Array(VALUES);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  // write with tracking on
  { 
    const write_file = new h5wasm.File(TRACKED_FILEPATH, "w", true);

    // create attributes with names in reverse alphabetical order:
    write_file.create_attribute("c", "first attribute");
    write_file.create_attribute("b", "second attribute");
    write_file.create_attribute("a", "third attribute");

    // create datasets with names in reverse alphabetical order:
    write_file.create_dataset({name: "c_data", data: DATA});
    write_file.create_dataset({name: "b_data", data: DATA});
    const a_data = write_file.create_dataset({name: "a_data", data: DATA, track_order: true});

    // create attributes with names in reverse alphabetical order:
    a_data.create_attribute("c", "first attribute");
    a_data.create_attribute("b", "second attribute");
    a_data.create_attribute("a", "third attribute");

    write_file.flush();
    write_file.close();
  }

  // write with tracking off
  { 
    const write_file = new h5wasm.File(UNTRACKED_FILEPATH, "w", false);

    // create attributes with names in reverse alphabetical order:
    write_file.create_attribute("c", "first attribute");
    write_file.create_attribute("b", "second attribute");
    write_file.create_attribute("a", "third attribute");

    // create datasets with names in reverse alphabetical order:
    write_file.create_dataset({name: "c_data", data: DATA});
    write_file.create_dataset({name: "b_data", data: DATA});
    const a_data = write_file.create_dataset({name: "a_data", data: DATA, track_order: false});

    // create attributes with names in reverse alphabetical order:
    a_data.create_attribute("c", "first attribute");
    a_data.create_attribute("b", "second attribute");
    a_data.create_attribute("a", "third attribute");

    write_file.flush();
    write_file.close();
  }

  // read with tracking on
  {
    const read_file = new h5wasm.File(TRACKED_FILEPATH, "r");

    // check that attrs are in original order:
    assert.deepEqual(Object.keys(read_file.attrs), ["c", "b", "a"]);

    // check that datasets are in original order:
    assert.deepEqual(read_file.keys(), ["c_data", "b_data", "a_data"]);
    
    // check that attrs of dataset are in original order:
    const dataset_attrs = read_file.get("a_data").attrs;
    assert.deepEqual(Object.keys(dataset_attrs), ["c", "b", "a"]);

    read_file.close()
  }

  // read with tracking off
  {
    const read_file = new h5wasm.File(UNTRACKED_FILEPATH, "r");

    // check that attrs are in alphabetical (not original) order:
    assert.deepEqual(Object.keys(read_file.attrs), ["a", "b", "c"]);

    // check that datasets are in alphabetical (not original) order:
    assert.deepEqual(read_file.keys(), ["a_data", "b_data", "c_data"]);
    
    // check that attrs of dataset are in alphabetical (not original) order:
    const dataset_attrs = read_file.get("a_data").attrs;
    assert.deepEqual(Object.keys(dataset_attrs), ["a", "b", "c"]);

    read_file.close()
  }

  // cleanup file when finished:
  unlinkSync(TRACKED_FILEPATH);
  unlinkSync(UNTRACKED_FILEPATH);

}

export const tests = [
  {
    description: "Create and read attrs and datasets with and without track_order",
    test: test_track_order
  },
];

export default tests;
