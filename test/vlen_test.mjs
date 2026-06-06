#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm, { Module } from 'h5wasm/node';

async function vlen_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/vlen.h5', 'r');

  assert.deepEqual(f.get('int8_scalar').metadata, {
    type: 9,
    shape: [],
    maxshape: [],
    chunks: null,
    size: 8,
    total_size: 1,
    signed: true,
    littleEndian: true,
    vlen: false,
    vlen_type: {
      type: 0,
      size: 1,
      signed: true,
      littleEndian: true,
      vlen: false,
    },
  });

  assert.deepEqual(f.get('float32_oneD').metadata, {
    type: 9,
    shape: [3],
    maxshape: [3],
    chunks: null,
    size: 8,
    total_size: 3,
    signed: false,
    littleEndian: true,
    vlen: false,
    vlen_type: {
      type: 1,
      size: 4,
      signed: false,
      littleEndian: true,
      vlen: false,
    },
  });

  assert.deepEqual(f.get('int8_scalar').value, new Int8Array([0, 1]));
  assert.deepEqual(
    f.get('float32_oneD').value,
    [
      new Float32Array([0]),
      new Float32Array([0, 1]),
      new Float32Array([0, 1, 2])
    ]
  );
  f.close();
}

// element i of the `uint8_blobs` fixture is the blob [i, i+1, ..., 2i] (length i+1)
const blob = (i) => Uint8Array.from({ length: i + 1 }, (_, k) => i + k);

async function vlen_slice_test() {
  // Slicing a variable-length dataset reads a hyperslab into a buffer sized for
  // only the selected `count` elements. The reclaim of that buffer must use a
  // matching count-sized dataspace; previously it used the dataset's full
  // N-element dataspace, freeing pointers past the buffer end and aborting the
  // runtime ("memory access out of bounds") for any N > 1 dataset.
  await h5wasm.ready;
  const f = new h5wasm.File('./test/vlen.h5', 'r');
  const ds = f.get('uint8_blobs');
  const N = ds.shape[0];

  // Single-element slices: count = 1 while the dataset has N elements -- the
  // case that aborted before the fix. Check every element reads back correctly.
  for (let i = 0; i < N; i++) {
    assert.deepEqual(ds.slice([[i, i + 1]]), [blob(i)], `single-element slice [${i}]`);
  }

  // Multi-element slice (count = 4 < N).
  assert.deepEqual(ds.slice([[3, 7]]), [blob(3), blob(4), blob(5), blob(6)]);

  // Strided slice (every other element).
  assert.deepEqual(ds.slice([[0, N, 2]]), [0, 2, 4, 6, 8, 10, 12, 14].map(blob));

  // A vlen-of-float32 dataset, sliced.
  const g = f.get('float32_oneD');
  assert.deepEqual(g.slice([[0, 1]]), [new Float32Array([0])]);
  assert.deepEqual(g.slice([[1, 3]]), [new Float32Array([0, 1]), new Float32Array([0, 1, 2])]);

  // The whole-dataset read (count-omitted reclaim path) is unchanged.
  assert.deepEqual(ds.value, Array.from({ length: N }, (_, i) => blob(i)));

  f.close();
}

async function vlen_slice_steady_heap_test() {
  // Repeated slicing must not abort and must reach a steady heap: each slice
  // allocates a count-sized buffer, reads the inner blobs, and the count-sized
  // reclaim frees exactly those blobs again. This is a no-abort / steady-state
  // smoke check over many single-element slices (the case that aborted before
  // the fix); it is not sized to detect sub-page (slow) leaks.
  await h5wasm.ready;
  const f = new h5wasm.File('./test/vlen.h5', 'r');
  const ds = f.get('uint8_blobs');
  const N = ds.shape[0];

  // Warm up so the heap reaches steady state, then assert it stays put while we
  // cycle single-element slices across every element.
  for (let k = 0; k < 2 * N; k++) ds.slice([[k % N, (k % N) + 1]]);
  const baseline = Module.HEAPU8.byteLength;
  for (let k = 0; k < 256; k++) ds.slice([[k % N, (k % N) + 1]]);
  assert.equal(Module.HEAPU8.byteLength, baseline, 'wasm heap grew during repeated vlen slicing');

  f.close();
}

export const tests = [
  {
    description: 'Read variable-length datasets',
    test: vlen_test,
  },
  {
    description: 'Read slices of variable-length datasets',
    test: vlen_slice_test,
  },
  {
    description: 'Repeated vlen slicing does not abort and keeps a steady heap',
    test: vlen_slice_steady_heap_test,
  },
];
export default tests;
