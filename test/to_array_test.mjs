#!/usr/bin/env node

import { strict as assert } from 'assert';
import h5wasm from '../dist/node/hdf5_hl.js';

async function to_array_test() {
  await h5wasm.ready;
  var f = new h5wasm.File('./test/array.h5', 'r');

  assert.deepEqual(
    f.get('bigint').to_array(),
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
    f.get('bool').to_array(),
    [
      [false, true], 
      [true, false] 
    ]
  );

  assert.deepEqual(
    f.get('compound').to_array(),
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
  
}

export const tests = [
  {
    description: 'Read datasets into nested arrays of plain JS types',
    test: to_array_test,
  },
];
export default tests;
