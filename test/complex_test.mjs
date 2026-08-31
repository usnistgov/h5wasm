#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

// Native HDF5 complex numbers (H5T_COMPLEX, class 11, introduced in HDF5 2.0)
// are stored as interleaved real/imaginary components of a base float type.
// h5wasm surfaces that layout directly as a typed array of components; the
// [real, imag] pairing appears as the innermost axis of `to_array()`.
const H5T_COMPLEX = 11;

function tmpdir() {
  const PATH = join(".", "test", "tmp");
  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  return PATH;
}

async function complex64_rounds_to_float32() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex64_round.h5");

  const write_file = new h5wasm.File(FILEPATH, "w");
  // None of these are representable in float32, so each component must come
  // back as exactly its float32 rounding -- and no worse.
  const data = [0.1, 1 / 3, Math.PI, -Math.E];
  write_file.create_dataset({ name: "z", data: data, shape: [2], dtype: "<c8" });
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const got = read_file.get("z").value;
  const expected = data.map(Math.fround);

  assert.ok(got instanceof Float32Array);
  assert.equal(got.length, expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    assert.ok(Object.is(got[i], expected[i]),
      `component ${i}: got ${got[i]}, expected float32 ${expected[i]}`);
  }

  read_file.close();
  unlinkSync(FILEPATH);
}

async function roundtrip_from_typed_array() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex_typed.h5");

  // The flat interleaved form that reading produces must also be writable,
  // so a read -> write round-trip needs no reshaping by the caller.
  const flat = new Float64Array([1, 2, 3, -4, 5.5, 6.25]);

  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_dataset({ name: "z", data: flat, shape: [3], dtype: "<c16" });
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const dset = read_file.get("z");

  assert.deepEqual(dset.metadata.shape, [3]);
  assert.deepEqual([...dset.value], [...flat]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function scalar_complex() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex_scalar.h5");

  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_dataset({ name: "z", data: [7, -8], shape: [], dtype: "<c16" });
  write_file.create_attribute("z_attr", [9, -10], [], "<c16");
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");

  // A scalar complex is two components, not one: unwrapping a shape-[] value to
  // its first element -- as every other scalar type wants -- would silently
  // return the real part alone and discard the imaginary one.
  for (const [what, obj] of [["dataset", read_file.get("z")], ["attribute", read_file.attrs["z_attr"]]]) {
    const expected = (what === "dataset") ? [7, -8] : [9, -10];

    assert.deepEqual(obj.metadata.shape, [], `${what}: shape stays scalar`);
    assert.ok(obj.value instanceof Float64Array, `${what}: components typed array`);
    assert.deepEqual([...obj.value], expected, `${what}: both components survive`);

    // `to_array` pairs the trailing axis of 2 here as it does for any shape
    assert.deepEqual(obj.to_array(), expected, `${what}: to_array pairs`);
  }

  read_file.close();
  unlinkSync(FILEPATH);
}

async function reshape_2d_complex() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex_2d.h5");

  const write_file = new h5wasm.File(FILEPATH, "w");

  const data = [0, 1, 2, 3, 4, 5, 6, 7];
  write_file.create_dataset({ name: "z", data: data, shape: [2, 2], dtype: "<c16" });
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const dset = read_file.get("z");

  assert.deepEqual(dset.metadata.shape, [2, 2]);
  // Flat value is 2 components per element; to_array nests by shape and then
  // splits the trailing [real, imag] pair, giving a 2 x 2 x 2 result.
  assert.deepEqual([...dset.value], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(dset.to_array(), [
    [[0, 1], [2, 3]],
    [[4, 5], [6, 7]],
  ]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function complex_attribute() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex_attr.h5");

  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_attribute("z", [1, -1, 2, -2], [2], "<c16");
  write_file.flush();
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const attr = read_file.attrs["z"];

  assert.equal(attr.metadata.type, H5T_COMPLEX);
  assert.ok(attr.value instanceof Float64Array);
  assert.deepEqual([...attr.value], [1, -1, 2, -2]);
  assert.deepEqual(attr.to_array(), [[1, -1], [2, -2]]);

  read_file.close();
  unlinkSync(FILEPATH);
}

async function read_reference_written_fixture() {
  await h5wasm.ready;

  // test/complex.h5 is written by the reference HDF5 library via h5py (see
  // make_test_files.py), not by h5wasm. Reading it is what proves h5wasm agrees
  // with real HDF5 on the H5T_COMPLEX byte layout -- a round-trip through
  // h5wasm alone would pass even if its read and write paths were wrong in
  // the same way. Both byte orders are covered because reads normalise
  // endianness via the memory type, which has to reach the base float.
  const f = new h5wasm.File("./test/complex.h5", "r");

  const expected_f64 = [1, 2, 3, -4, 5.5, 6.25];
  const expected_f32 = [1.5, -2.5, 0.25, 4, -8, 0.125];
  const cases = [
    { name: "z_f64le", dtype: "<c16", size: 16, accessor: Float64Array, expected: expected_f64 },
    { name: "z_f64be", dtype: ">c16", size: 16, accessor: Float64Array, expected: expected_f64 },
    { name: "z_f32le", dtype: "<c8", size: 8, accessor: Float32Array, expected: expected_f32 },
    { name: "z_f32be", dtype: ">c8", size: 8, accessor: Float32Array, expected: expected_f32 },
  ];

  for (const { name, dtype, size, accessor, expected } of cases) {
    const dset = f.get(name);
    assert.equal(dset.metadata.type, H5T_COMPLEX, `${name}: class`);
    assert.equal(dset.metadata.size, size, `${name}: itemsize`);
    assert.equal(dset.dtype, dtype, `${name}: dtype`);
    assert.ok(dset.value instanceof accessor, `${name}: should read as ${accessor.name}`);
    assert.deepEqual([...dset.value], expected, `${name}: components`);
    assert.deepEqual(dset.to_array(), [
      [expected[0], expected[1]],
      [expected[2], expected[3]],
      [expected[4], expected[5]],
    ], `${name}: to_array pairs`);
  }

  f.close();
}

async function rejects_invalid_complex_input() {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), "complex_invalid.h5");

  const f = new h5wasm.File(FILEPATH, "w");

  // Only the two IEEE base floats HDF5 has a native complex type for exist, so
  // the typecode parser must reject the rest at the API boundary rather than
  // letting an unrepresentable component size reach the accessor or C++.
  for (const dtype of ["<c4", "<c12", "<c32"]) {
    assert.throws(() => f.create_dataset({ name: "bad", data: [1, 2], dtype: dtype }),
      /complex must be c8 or c16/, `${dtype} should be rejected`);
  }

  // Big-endian complex is refused up front, exactly as big-endian float and
  // integer are -- writing is little-endian only, so a `>c16` request must not
  // quietly produce a little-endian dataset mislabelled as big-endian.
  for (const dtype of [">c8", ">c16"]) {
    assert.throws(() => f.create_dataset({ name: "be", data: [1, 2], dtype: dtype }),
      /big-endian dtype is not supported/, `${dtype} should be rejected`);
    assert.throws(() => f.create_attribute("be", [1, 2], [], dtype),
      /big-endian dtype is not supported/, `${dtype} attribute should be rejected`);
  }

  f.close();
  unlinkSync(FILEPATH);
}

export const tests = [
  {
    description: "Native complex64 components round to exactly float32",
    test: complex64_rounds_to_float32
  },
  {
    description: "Write native complex from flat interleaved typed array",
    test: roundtrip_from_typed_array
  },
  {
    description: "Reshape 2D native complex dataset via to_array",
    test: reshape_2d_complex
  },
  {
    description: "Read scalar native complex dataset and attribute",
    test: scalar_complex
  },
  {
    description: "Round-trip native complex attribute",
    test: complex_attribute
  },
  {
    description: "Read reference-HDF5-written native complex fixture (LE/BE, f32/f64)",
    test: read_reference_written_fixture
  },
  {
    description: "Reject unsupported complex sizes and big-endian complex writes",
    test: rejects_invalid_complex_input
  }
];

export default tests;
