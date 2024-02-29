#!/usr/bin/env node
import { strict as assert } from 'assert';
import { join } from 'path';
import { spawnSync } from 'child_process';
import h5wasm from "h5wasm/node";

async function test_throwing_error_handler() {
  const Module = await h5wasm.ready;
  const error_handler_set_result = Module.activate_throwing_error_handler();
  assert.equal(error_handler_set_result, 0); // success

  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "nonexistant_file.h5");

  function open_nonexistant_file() {
    const file = new h5wasm.File(FILEPATH, "r");
    return file;
  }

  let error_message = "no error";
  try {
    const file = open_nonexistant_file();
  }
  catch (e) {
    error_message = e.toString();
  }
  const lines = error_message.split("\n");
  assert(lines.length > 2, "error message should have more than 2 lines");
  const expected_error_message = "H5Fopen(): unable to synchronously open file";
  assert(lines[1].endsWith(expected_error_message), "unexpected error message: " + lines[1]);
}

async function test_default_error_handler() {
  // verify that the default error handler does not throw,
  // and that it prints an error message to stderr
  const child_process = spawnSync("/usr/bin/env", ["node", "test/nonthrowing_error_handler.mjs"]);
  const { stderr, status } = child_process;
  // status should be zero, no error thrown:
  assert.strictEqual(status, 0);
  const error_message = stderr.toString();
  const lines = error_message.split("\n");
  assert(lines.length > 2, "error message should have more than 2 lines");
  const expected_error_message = "H5Fopen(): unable to synchronously open file";
  assert(lines[1].endsWith(expected_error_message), "unexpected error message: " + lines[1]);
}

export const tests = [
  {
    description: "test throwing error handler",
    test: test_throwing_error_handler
  },
  {
    description: "test default error handler",
    test: test_default_error_handler
  }
];

export default tests;