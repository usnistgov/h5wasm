#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

async function create_delete_string_attr() {

  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "attributes.h5");
  const ATTR_NAME = "hello";
  const STRING_VALUE = "there";
  const NEW_STRING_VALUE = "goodbye";

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  
  let write_file = new h5wasm.File(FILEPATH, "w");

  // create attribute:
  write_file.create_attribute(ATTR_NAME, STRING_VALUE);

  assert.equal(write_file.attrs[ATTR_NAME].value, STRING_VALUE);

  const delete_success = write_file.delete_attribute(ATTR_NAME);
  assert.equal(delete_success, 0);
  assert.equal(write_file.attrs[ATTR_NAME], undefined);

  write_file.create_attribute(ATTR_NAME, NEW_STRING_VALUE);
  assert.equal(write_file.attrs[ATTR_NAME].value, NEW_STRING_VALUE);

  write_file.flush();
  write_file.close();

  let read_file = new h5wasm.File(FILEPATH, "r");
  assert.equal(read_file.attrs[ATTR_NAME].value, NEW_STRING_VALUE);

  read_file.close()

  // cleanup file when finished:
  unlinkSync(FILEPATH);

}

export const tests = [
  {
    description: "Create string attribute, delete and overwrite",
    test: create_delete_string_attr
  }
]
export default tests;
