#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

// H5T_COMPLEX (class 11, added in HDF5 2.0) stores interleaved real and
// imaginary components of a base float. h5wasm exposes that layout directly, as
// a flat typed array of components; `to_array` pairs the trailing [real, imag].
const H5T_COMPLEX = 11;
function tmpdir() {
  const PATH = join(".", "test", "tmp");
  if (!(existsSync(PATH))) {
    mkdirSync(PATH);
  }
  return PATH;
}

// None of these are representable in float32, so a complex64 must return
// exactly their float32 roundings -- and nothing worse.
const rounded = [0.1, 1 / 3, Math.PI, -Math.E].map(Math.fround);

const cases = [
  {
    description: "complex128 vector",
    dtype: "<c16",
    shape: [3],
    // written from the same flat typed array a read returns, so a round-trip
    // needs no reshaping by the caller
    data: new Float64Array([1, 2, 3, -4, 5.5, 6.25]),
    components: Float64Array,
    nested: [[1, 2], [3, -4], [5.5, 6.25]],
  },
  {
    description: "complex128 scalar",
    dtype: "<c16",
    shape: [],
    data: [7, -8],
    components: Float64Array,
    // both components together are the one value, so unwrapping a scalar to its
    // first element -- as every other type wants -- would drop the imaginary part
    nested: [7, -8],
  },
  {
    description: "complex128 2x2",
    dtype: "<c16",
    shape: [2, 2],
    data: [0, 1, 2, 3, 4, 5, 6, 7],
    components: Float64Array,
    nested: [[[0, 1], [2, 3]], [[4, 5], [6, 7]]],
  },
  {
    description: "complex64",
    dtype: "<c8",
    shape: [2],
    data: [0.1, 1 / 3, Math.PI, -Math.E],
    components: Float32Array,
    expected: rounded,
    nested: [rounded.slice(0, 2), rounded.slice(2)],
  },
  {
    // H5T_COMPLEX_IEEE_F16LE is a legal 4-byte type, so the components are halves
    description: "complex32",
    dtype: "<c4",
    shape: [2],
    data: [0.5, -1.5, 2, 3],
    components: Float16Array,
    nested: [[0.5, -1.5], [2, 3]],
  },
];

async function roundtrip(kind, { dtype, shape, data, components, nested, expected = data }) {
  await h5wasm.ready;
  const FILEPATH = join(tmpdir(), `complex_${kind}_${dtype.slice(1)}_${shape.length}d.h5`);

  const write_file = new h5wasm.File(FILEPATH, "w");
  if (kind === "dataset") {
    write_file.create_dataset({ name: "z", data, shape, dtype });
  }
  else {
    write_file.create_attribute("z", data, shape, dtype);
  }
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, "r");
  const obj = (kind === "dataset") ? read_file.get("z") : read_file.attrs["z"];

  assert.equal(obj.metadata.type, H5T_COMPLEX, "class");
  assert.equal(obj.dtype, dtype, "dtype");
  assert.deepEqual(obj.metadata.shape, shape, "shape");
  assert.ok(obj.value instanceof components, `components should be ${components.name}`);
  assert.deepEqual([...obj.value], [...expected], "components");
  assert.deepEqual(obj.to_array(), nested, "to_array pairs");

  read_file.close();
  unlinkSync(FILEPATH);
}

async function read_reference_written_fixture() {
  await h5wasm.ready;

  // test/complex.h5 is written by the reference HDF5 library via h5py (see
  // make_test_files.py), not by h5wasm. Reading it is what proves h5wasm agrees
  // with real HDF5 on the H5T_COMPLEX byte layout -- a round-trip through
  // h5wasm alone would pass even if its read and write paths were wrong in the
  // same way. Both byte orders are covered because reads normalise endianness
  // via the memory type, which has to reach the base float.
  const f = new h5wasm.File("./test/complex.h5", "r");

  const expected_f64 = [1, 2, 3, -4, 5.5, 6.25];
  const expected_f32 = [1.5, -2.5, 0.25, 4, -8, 0.125];
  const fixtures = [
    { name: "z_f64le", dtype: "<c16", size: 16, components: Float64Array, expected: expected_f64 },
    { name: "z_f64be", dtype: ">c16", size: 16, components: Float64Array, expected: expected_f64 },
    { name: "z_f32le", dtype: "<c8", size: 8, components: Float32Array, expected: expected_f32 },
    { name: "z_f32be", dtype: ">c8", size: 8, components: Float32Array, expected: expected_f32 },
    { name: "z_f16le", dtype: "<c4", size: 4, components: Float16Array, expected: expected_f32 },
    { name: "z_f16be", dtype: ">c4", size: 4, components: Float16Array, expected: expected_f32 },
  ];

  for (const { name, dtype, size, components, expected } of fixtures) {
    const dset = f.get(name);
    assert.equal(dset.metadata.type, H5T_COMPLEX, `${name}: class`);
    assert.equal(dset.metadata.size, size, `${name}: itemsize`);
    assert.equal(dset.dtype, dtype, `${name}: dtype`);
    assert.ok(dset.value instanceof components, `${name}: should read as ${components.name}`);
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

  // Reading a complex means reading its two components with a TypedArray, and
  // JavaScript has none wider than Float64Array, so the sizes stop at c16.
  for (const dtype of ["<c2", "<c12", "<c32"]) {
    assert.throws(() => f.create_dataset({ name: "bad", data: [1, 2], dtype: dtype }),
      /complex must be c4, c8 or c16/, `${dtype} should be rejected`);
  }

  // Big-endian complex is refused up front, exactly as big-endian float and
  // integer are -- writing is little-endian only, so a `>c16` request must not
  // quietly produce a little-endian dataset mislabelled as big-endian.
  for (const dtype of [">c4", ">c8", ">c16"]) {
    assert.throws(() => f.create_dataset({ name: "be", data: [1, 2], dtype: dtype }),
      /big-endian dtype is not supported/, `${dtype} should be rejected`);
    assert.throws(() => f.create_attribute("be", [1, 2], [], dtype),
      /big-endian dtype is not supported/, `${dtype} attribute should be rejected`);
  }

  f.close();
  unlinkSync(FILEPATH);
}

export const tests = [
  ...["dataset", "attribute"].flatMap((kind) => cases.map((testcase) => ({
    description: `Round-trip native ${testcase.description} ${kind}`,
    test: () => roundtrip(kind, testcase)
  }))),
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
