#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from 'h5wasm/node';

const PATH = join(".", "test", "tmp");

// The values in test/float16.h5, which are all exactly representable in
// float16 (see test/make_test_files.py).
const HALVES = [1.0, -2.5, 0.5, 65504.0, 2 ** -14, 2 ** -24];

// Run `body` as if on a runtime that predates Float16Array. Restores the global
// afterwards even if `body` throws, so one failure can't corrupt later tests.
async function without_float16array(body) {
  const saved = globalThis.Float16Array;
  delete globalThis.Float16Array;
  try {
    return await body();
  }
  finally {
    if (saved !== undefined) {
      globalThis.Float16Array = saved;
    }
  }
}

function tmpfile(name) {
  if (!existsSync(PATH)) {
    mkdirSync(PATH);
  }
  return join(PATH, name);
}

// Run `body`, returning what it produced alongside anything it wrote to
// console.warn. The warning is the only signal that a fallback happened, so it
// has to be asserted on rather than left to scroll past in the test output.
function capturing_warnings(body) {
  const saved = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    return { result: body(), warnings };
  }
  finally {
    console.warn = saved;
  }
}

async function read_float16() {
  await h5wasm.ready;
  const f = new h5wasm.File('./test/float16.h5', 'r');

  const half = f.get('half');
  assert.equal(half.dtype, '<e');
  assert.deepEqual(half.metadata, {
    chunks: null,
    ieee_float16: true,
    littleEndian: true,
    maxshape: [2, 3],
    shape: [2, 3],
    signed: false,
    size: 2,
    total_size: 6,
    type: 1,
    vlen: false,
  });

  assert.ok(half.value instanceof Float16Array);
  assert.deepEqual([...half.value], HALVES);
  assert.deepEqual(half.json_value, HALVES);
  assert.deepEqual(half.to_array(), [HALVES.slice(0, 3), HALVES.slice(3)]);

  // A scalar unwraps to a plain number, as for any other float size.
  assert.equal(f.get('half_scalar').value, 0.125);

  // Slicing goes through the same accessor, on a hyperslab of the file.
  assert.deepEqual([...half.slice([[1, 2]])], HALVES.slice(3));

  const attr = half.attrs['half_attr'];
  assert.ok(attr.value instanceof Float16Array);
  assert.deepEqual([...attr.value], [1.5, -0.25]);

  f.close();
}

// A 2-byte float is not necessarily an IEEE half. bfloat16 has the same width
// with an 8-bit exponent, so reading it through Float16Array would return
// plausible but wrong numbers (bfloat16 1.0 is 0x3F80, which is 1.875 as a
// half). JavaScript has no bfloat16 container, so the raw bytes come back
// instead, as they do for any other datatype h5wasm cannot represent.
async function bfloat16_falls_back_to_bytes() {
  await h5wasm.ready;
  const f = new h5wasm.File('./test/float16.h5', 'r');
  const dset = f.get('bfloat16');

  // The class and width are indistinguishable from an IEEE half; only the
  // exponent/mantissa layout separates them.
  assert.equal(dset.metadata.type, 1);
  assert.equal(dset.metadata.size, 2);
  assert.equal(dset.metadata.ieee_float16, false);
  assert.equal(f.get('half').metadata.ieee_float16, true);

  const { result, warnings } = capturing_warnings(() => dset.value);
  assert.ok(result instanceof Uint8Array,
    'reading bfloat16 should hand back bytes rather than reinterpret them');
  // 1.0, 2.0 and -1.0 as little-endian bfloat16: 0x3F80, 0x4000, 0xBF80.
  assert.deepEqual([...result], [0x80, 0x3f, 0x00, 0x40, 0x80, 0xbf]);
  assert.deepEqual(warnings.map((w) => /not IEEE binary16/.test(w)), [true]);

  f.close();
}

async function read_bigendian_float16() {
  await h5wasm.ready;
  const f = new h5wasm.File('./test/float16.h5', 'r');
  const dset = f.get('bigendian_half');

  assert.equal(dset.dtype, '>e');
  assert.equal(dset.metadata.littleEndian, false);
  // Byte order is normalized during the read, so the values come out right
  // even though the file stores them big-endian.
  assert.deepEqual([...dset.value], [3, 2, 1]);

  f.close();
}

async function write_float16_typedarray() {
  await h5wasm.ready;
  const FILEPATH = tmpfile('float16_typedarray.h5');

  const write_file = new h5wasm.File(FILEPATH, 'w');
  // No explicit dtype: the type is guessed from the Float16Array itself.
  write_file.create_dataset({ name: 'half', data: new Float16Array(HALVES) });
  write_file.get('half').create_attribute('half_attr', new Float16Array([1.5, -0.25]));
  // An explicit shape and chunking: HDF5 sizes a chunk from the datatype, so
  // this checks the 2-byte itemsize reaches the dataset creation path.
  write_file.create_dataset({
    name: 'chunked_half', data: new Float16Array(HALVES), shape: [2, 3],
    chunks: [1, 3],
  });
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, 'r');
  const dset = read_file.get('half');
  assert.equal(dset.dtype, '<e');
  assert.equal(dset.metadata.size, 2);
  assert.deepEqual([...dset.value], HALVES);
  assert.deepEqual([...dset.attrs['half_attr'].value], [1.5, -0.25]);

  const chunked = read_file.get('chunked_half');
  assert.equal(chunked.dtype, '<e');
  assert.deepEqual(chunked.shape, [2, 3]);
  assert.deepEqual(chunked.metadata.chunks, [1, 3]);
  assert.deepEqual([...chunked.value], HALVES);
  read_file.close();

  unlinkSync(FILEPATH);
}

async function write_float16_from_numbers() {
  await h5wasm.ready;
  const FILEPATH = tmpfile('float16_numbers.h5');

  // Plain numbers with an explicit '<e' dtype: values too precise for a half
  // are rounded to the nearest representable one on the way in.
  const VALUES = [0.1, 1 / 3, 65505, 1e-9, -0];
  const EXPECTED = [0.0999755859375, 0.333251953125, 65504, 0, -0];

  const write_file = new h5wasm.File(FILEPATH, 'w');
  write_file.create_dataset({ name: 'rounded', data: VALUES, dtype: '<e' });
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, 'r');
  assert.deepEqual([...read_file.get('rounded').value], EXPECTED);
  read_file.close();

  unlinkSync(FILEPATH);
}

// Storage round-trip is the identity on values a float16 can hold: whatever the
// runtime's own Float16Array rounding produces must survive the trip through
// HDF5 unchanged. Catches buffer sizing, byte order and datatype mistakes that
// fixed values can miss.
async function float16_roundtrip_property() {
  await h5wasm.ready;
  const FILEPATH = tmpfile('float16_property.h5');

  // Deterministic LCG (Numerical Recipes) so a failure is reproducible.
  let seed = 20250219;
  const next = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);

  const inputs = [
    // exactly representable: exponent walk across normals and subnormals
    ...Array.from({ length: 40 }, (_, i) => (i % 2 ? -1 : 1) * 2 ** (i - 24)),
    // needing rounding, spanning subnormal, normal and overflow ranges
    ...Array.from({ length: 200 }, () => (next() - 0.5) * 10 ** (next() * 12 - 8)),
    0, -0, Infinity, -Infinity,
  ];
  const expected = [...new Float16Array(inputs)];

  const write_file = new h5wasm.File(FILEPATH, 'w');
  write_file.create_dataset({ name: 'halves', data: inputs, dtype: '<e' });
  write_file.close();

  const read_file = new h5wasm.File(FILEPATH, 'r');
  const readback = read_file.get('halves').value;
  read_file.close();

  assert.ok(readback instanceof Float16Array);
  for (let i = 0; i < inputs.length; i++) {
    // `assert.strict.equal` compares with SameValue, so this also holds -0
    // apart from 0 and treats NaN as equal to itself.
    assert.equal(readback[i], expected[i],
      `element ${i}: wrote ${inputs[i]}, expected ${expected[i]}, read ${readback[i]}`);
  }

  unlinkSync(FILEPATH);
}

// On runtimes without Float16Array there is no container to hand the values
// back in, so reads fall back to the raw 2-byte patterns and warn. Writing has
// no such fallback -- without the constructor there is nothing to round the
// numbers with -- so it still fails loudly and says what is missing.
async function float16_without_runtime_support() {
  await h5wasm.ready;
  const FILEPATH = tmpfile('float16_unsupported.h5');

  // HALVES as little-endian IEEE halves: 0x3C00, 0xC100, 0x3800, 0x7BFF,
  // 0x0400 (smallest normal) and 0x0001 (smallest subnormal).
  const HALF_BYTES = [0x00, 0x3c, 0x00, 0xc1, 0x00, 0x38, 0xff, 0x7b, 0x00, 0x04, 0x01, 0x00];

  await without_float16array(() => {
    const f = new h5wasm.File('./test/float16.h5', 'r');
    const dset = f.get('half');

    // Metadata does not need the container, so it still describes the type,
    // leaving a caller free to decode the bytes itself.
    assert.equal(dset.dtype, '<e');
    assert.equal(dset.metadata.size, 2);

    const read = capturing_warnings(() => dset.value);
    assert.ok(read.result instanceof Uint8Array);
    assert.deepEqual([...read.result], HALF_BYTES);
    assert.deepEqual(read.warnings.map((w) => /Float16Array/.test(w)), [true],
      'reading float16 data should name the missing global');

    const attr = capturing_warnings(() => dset.attrs['half_attr'].value);
    assert.ok(attr.result instanceof Uint8Array);
    // 1.5 and -0.25 as little-endian halves: 0x3E00 and 0xB400.
    assert.deepEqual([...attr.result], [0x00, 0x3e, 0x00, 0xb4]);
    assert.deepEqual(attr.warnings.map((w) => /Float16Array/.test(w)), [true]);
    f.close();

    const write_file = new h5wasm.File(FILEPATH, 'w');
    assert.throws(() => write_file.create_dataset({ name: 'half', data: [1.5], dtype: '<e' }),
      /Float16Array/, 'writing float16 data should name the missing global');
    write_file.close();
  });

  unlinkSync(FILEPATH);
}

// The tests that need a real Float16Array only run where the runtime has one;
// the fallback path is asserted on every runtime, including this one.
const supported = typeof globalThis.Float16Array === 'function';
export const tests = [
  ...(supported ? [
    {
      description: 'Read float16 datasets and attributes',
      test: read_float16,
    },
    {
      description: 'Read big-endian float16 dataset',
      test: read_bigendian_float16,
    },
    {
      description: 'Read bfloat16 as raw bytes rather than as an IEEE half',
      test: bfloat16_falls_back_to_bytes,
    },
    {
      description: 'Create float16 dataset and attribute from Float16Array',
      test: write_float16_typedarray,
    },
    {
      description: 'Create float16 dataset from numbers with explicit dtype',
      test: write_float16_from_numbers,
    },
    {
      description: 'Float16 storage round-trip preserves every representable value',
      test: float16_roundtrip_property,
    },
  ] : []),
  {
    description: 'Float16 without runtime Float16Array reads bytes and refuses to write',
    test: float16_without_runtime_support,
  },
];
export default tests;
