#!/usr/bin/env node
import { strict as assert } from 'assert';
import { join } from 'path';
import h5wasm from "h5wasm/node";

const Module = await h5wasm.ready;
const error_handler_set_result = Module.deactivate_throwing_error_handler();
assert.equal(error_handler_set_result, 0); // success

const PATH = join(".", "test", "tmp");
const FILEPATH = join(PATH, "nonexistant_file.h5");

function open_nonexistant_file() {
  const file = new h5wasm.File(FILEPATH, "r");
  return file;
}

const file = open_nonexistant_file();
