#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm, { dtype_to_metadata } from "h5wasm/node";

async function ascii_string_attribute() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "cset_attr.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_attribute("ascii_attr", "hello", null, "A5");
  write_file.create_attribute("utf8_attr", "world", null, "S5");
  write_file.create_attribute("default_attr", "test");
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");

  const ascii_meta = read_file.attrs["ascii_attr"].metadata;
  assert.equal(ascii_meta.cset, 0, "ASCII attr cset should be 0");
  assert.equal(read_file.attrs["ascii_attr"].value, "hello");

  const utf8_meta = read_file.attrs["utf8_attr"].metadata;
  assert.equal(utf8_meta.cset, 1, "UTF-8 attr cset should be 1");
  assert.equal(read_file.attrs["utf8_attr"].value, "world");

  const default_meta = read_file.attrs["default_attr"].metadata;
  assert.equal(default_meta.cset, 1, "Default attr cset should be 1 (UTF-8)");
  assert.equal(read_file.attrs["default_attr"].value, "test");

  read_file.close();
  unlinkSync(FILEPATH);
}

async function ascii_string_dataset() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "cset_dset.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_dataset({ name: "ascii_fixed", data: ["abc", "def"], dtype: "A3" });
  write_file.create_dataset({ name: "utf8_fixed", data: ["abc", "def"], dtype: "S3" });
  write_file.create_dataset({ name: "default_vlen", data: ["abc", "def"] });
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");

  const ascii_dset = read_file.get("ascii_fixed");
  assert.equal(ascii_dset.dtype, "A3", "ASCII dataset dtype should be A3");
  assert.equal(ascii_dset.metadata.cset, 0, "ASCII dataset cset should be 0");

  const utf8_dset = read_file.get("utf8_fixed");
  assert.equal(utf8_dset.dtype, "S3", "UTF-8 dataset dtype should be S3");
  assert.equal(utf8_dset.metadata.cset, 1, "UTF-8 dataset cset should be 1");

  const default_dset = read_file.get("default_vlen");
  assert.equal(default_dset.metadata.cset, 1, "Default dataset cset should be 1 (UTF-8)");
  assert.deepEqual(default_dset.value, ["abc", "def"]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function ascii_dtype_roundtrip() {
  await h5wasm.ready;

  const a_meta = dtype_to_metadata("A16");
  assert.equal(a_meta.type, 3, "A16 type should be H5T_STRING (3)");
  assert.equal(a_meta.size, 16);
  assert.equal(a_meta.cset, 0, "A16 cset should be 0 (ASCII)");
  assert.equal(a_meta.vlen, false);

  const s_meta = dtype_to_metadata("S16");
  assert.equal(s_meta.type, 3);
  assert.equal(s_meta.size, 16);
  assert.equal(s_meta.cset, 1, "S16 cset should be 1 (UTF-8)");
  assert.equal(s_meta.vlen, false);

  const vlen_meta = dtype_to_metadata("S");
  assert.equal(vlen_meta.vlen, true, "S without length should be vlen");
  assert.equal(vlen_meta.cset, 1);
}

export const tests = [
  {
    description: "Create ASCII and UTF-8 string attributes with cset parameter",
    test: ascii_string_attribute
  },
  {
    description: "Create ASCII and UTF-8 string datasets with cset parameter",
    test: ascii_string_dataset
  },
  {
    description: "dtype_to_metadata roundtrip for A and S prefixes",
    test: ascii_dtype_roundtrip
  }
];
export default tests;
