#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from '../dist/node/hdf5_hl.js';

async function compound_array_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  assert.deepEqual(
    f.get('float_arr').value,
    [
      [
        [0,1],
        [2,3]
      ],
      [
        [4,5],
        [6,7]
      ]
    ]
  );

  assert.deepEqual(
    f.get('string_arr').value,
    [
      [
        ["hello","there"],
        ["hello","there"]
      ],
      [
        ["hello","there"],
        ["hello","there"]
      ]
    ]
  );

  assert.deepEqual(
    f.get('compound').value,
    [
      [
        [
          [0,1],
          [2,3]
        ],
        [
          ["hello","there"],
          ["hello","there"]
        ]
      ],
      [
        [
          [4,5],
          [6,7]
        ],
        [
          ["hello","there"],
          ["hello","there"]
        ]
      ]
    ]
  );

  assert.deepEqual(f.get('compound').metadata, {
    compound_type: {
      members: [
        {
          array_type: {
            cset: -1,
            shape: [2, 2],
            littleEndian: true,
            signed: false,
            size: 8,
            total_size: 4,
            type: 1,
            vlen: false,
          },
          cset: -1,
          littleEndian: true,
          name: 'floaty',
          offset: 0,
          shape: [],
          signed: false,
          size: 32,
          type: 10,
          vlen: false,
        },
        {
          array_type: {
            cset: 0,
            shape: [2, 2],
            littleEndian: false,
            signed: false,
            size: 5,
            total_size: 4,
            type: 3,
            vlen: false,
          },
          cset: -1,
          littleEndian: false,
          name: 'stringy',
          offset: 32,
          shape: [],
          signed: false,
          size: 20,
          type: 10,
          vlen: false,
        },
      ],
      nmembers: 2
    },
    cset: -1,
    littleEndian: true,
    shape: [2],
    signed: false,
    size: 52,
    total_size: 2,
    type: 6,
    vlen: false,
  });
}

export const tests = [
  {
    description: 'Read and process Array and Compound datatypes',
    test: compound_array_test,
  },
];
export default tests;
