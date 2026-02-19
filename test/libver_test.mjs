#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { h5wasm, convertToLibverString } from "h5wasm/node";

async function test_libver_v110() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_v110.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with libver="v110"
  const f = new h5wasm.File(FILEPATH, "w", { libver: "v110" });
  f.create_dataset({name: "data", data: DATA});
  f.flush();
  f.close();

  // Verify we can read it back
  const f_read = new h5wasm.File(FILEPATH, "r");
  const dset = f_read.get("data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_read.close();
}

async function test_libver_latest() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_latest.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with libver="latest"
  const f = new h5wasm.File(FILEPATH, "w", { libver: "latest" });
  f.create_dataset({name: "data", data: DATA});
  f.flush();
  f.close();

  // Verify we can read it back
  const f_read = new h5wasm.File(FILEPATH, "r");
  const dset = f_read.get("data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_read.close();
}

async function test_libver_v108() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_v18.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with libver="v108"
  const f = new h5wasm.File(FILEPATH, "w", { libver: "v108" });
  f.create_dataset({name: "data", data: DATA});
  f.flush();
  f.close();

  // Verify we can read it back
  const f_read = new h5wasm.File(FILEPATH, "r");
  const dset = f_read.get("data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_read.close();
}

async function test_libver_asymmetric() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_asymmetric.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with asymmetric libver bounds
  const f = new h5wasm.File(FILEPATH, "w", { libver: ["v110", "latest"] });
  f.create_dataset({name: "data", data: DATA});
  f.flush();
  f.close();

  // Verify we can read it back
  const f_read = new h5wasm.File(FILEPATH, "r");
  const dset = f_read.get("data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_read.close();
}

async function test_libver_swmr() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_swmr.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with superblock v3 (required for SWMR)
  const f = new h5wasm.File(FILEPATH, "w", { libver: "v110" });
  // Create an extensible chunked dataset (required for SWMR)
  f.create_dataset({
    name: "swmr_data",
    data: DATA,
    maxshape: [null],
    chunks: [10]
  });
  f.flush();
  f.close();

  // Verify we can open in SWMR append mode
  const f_swmr = new h5wasm.File(FILEPATH, "Sa");
  const dset = f_swmr.get("swmr_data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_swmr.close();
}

async function test_libver_with_track_order() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_track_order.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with track_order and explicit libver
  const f = new h5wasm.File(FILEPATH, "w", { track_order: true, libver: "latest" });

  // Create attributes in reverse alphabetical order
  f.create_attribute("c", "first");
  f.create_attribute("b", "second");
  f.create_attribute("a", "third");

  f.flush();
  f.close();

  // Verify order is preserved
  const f_read = new h5wasm.File(FILEPATH, "r");
  assert.deepEqual(Object.keys(f_read.attrs), ["c", "b", "a"]);
  f_read.close();
}

async function test_libver_auto_with_track_order() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_auto.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Create file with track_order but no explicit libver (should auto-set v18)
  const f = new h5wasm.File(FILEPATH, "w", { track_order: true });

  // Create attributes in reverse alphabetical order
  f.create_attribute("c", "first");
  f.create_attribute("b", "second");
  f.create_attribute("a", "third");

  f.flush();
  f.close();

  // Verify order is preserved (auto-set libver should work)
  const f_read = new h5wasm.File(FILEPATH, "r");
  assert.deepEqual(Object.keys(f_read.attrs), ["c", "b", "a"]);
  f_read.close();
}

async function test_libver_case_insensitive() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_case.h5");
  const DATA = new Float32Array([1.0, 2.0, 3.0]);

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // Test case-insensitive libver strings (uppercase/mixed case)
  const f = new h5wasm.File(FILEPATH, "w", { libver: "LATEST" });
  f.create_dataset({name: "data", data: DATA});
  f.flush();
  f.close();

  const f_read = new h5wasm.File(FILEPATH, "r");
  const dset = f_read.get("data");
  assert.deepEqual([...dset.value], [...DATA]);
  f_read.close();
}

async function test_libver_constants() {
  const Module = await h5wasm.ready;

  // Verify H5F_LIBVER constants are exported
  assert.ok(typeof Module.H5F_LIBVER_EARLIEST === 'number');
  assert.ok(typeof Module.H5F_LIBVER_V18 === 'number');
  assert.ok(typeof Module.H5F_LIBVER_V110 === 'number');
  assert.ok(typeof Module.H5F_LIBVER_V112 === 'number');
  assert.ok(typeof Module.H5F_LIBVER_V114 === 'number');
  assert.ok(typeof Module.H5F_LIBVER_V200 === 'number');
  assert.ok(typeof Module.H5F_LIBVER_LATEST === 'number');
}

async function test_libver_getter() {
  const Module = await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "libver_getter.h5");

  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }

  // look up latest as real version, e.g. "v200"
  const latest = convertToLibverString(Module.H5F_LIBVER_LATEST);

  // Test single libver value
  const f1 = new h5wasm.File(FILEPATH, "w", { libver: "v108" });
  assert.deepEqual(f1.libver, ["v108", "v108"]);
  f1.close();

  // Test asymmetric libver bounds
  const f2 = new h5wasm.File(FILEPATH, "w", { libver: ["v110", "latest"] });
  assert.deepEqual(f2.libver, ["v110", latest]);
  // On close, because we didn't use any features that require v110,
  // it falls back to "v108" for the low bound
  f2.close();

  // Test reading libver from existing file..
  const f3 = new h5wasm.File(FILEPATH, "r");
  assert.deepEqual(f3.libver, ["v108", latest]);
  f3.close();

  // Re-open a file in SWMR append mode:
  const f4 = new h5wasm.File(FILEPATH, "Sa");
  // If no libver is specified, hdf5 library will set lower bound
  // to "v110" for SWMR compatibility
  assert.deepEqual(f4.libver, ["v110", latest]);
  f4.close();

  // Open a file with track_order enabled:
  const f5 = new h5wasm.File(FILEPATH, "w", { track_order: true });
  // If no libver is specified, and track_order is used,
  // a minimum version "v108" is set by hdf5 library
  assert.deepEqual(f5.libver, ["v108", latest]);
  f5.close();
}

export const tests = [
  {
    description: "Create file with libver='v110'",
    test: test_libver_v110
  },
  {
    description: "Create file with libver='latest'",
    test: test_libver_latest
  },
  {
    description: "Create file with libver='v108'",
    test: test_libver_v108
  },
  {
    description: "Create file with asymmetric libver bounds",
    test: test_libver_asymmetric
  },
  {
    description: "Create SWMR-compatible file and open in SWMR mode",
    test: test_libver_swmr
  },
  {
    description: "Create file with track_order and explicit libver",
    test: test_libver_with_track_order
  },
  {
    description: "Create file with track_order, auto-set libver",
    test: test_libver_auto_with_track_order
  },
  {
    description: "Test case-insensitive libver parsing",
    test: test_libver_case_insensitive
  },
  {
    description: "Verify H5F_LIBVER constants are exported",
    test: test_libver_constants
  },
  {
    description: "Test libver property getter",
    test: test_libver_getter
  }
];

export default tests;
