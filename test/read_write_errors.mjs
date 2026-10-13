#!/usr/bin/env node

import { strict as assert } from 'assert';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from 'h5wasm/node';

const PATH = join(".", "test", "tmp");

async function failed_read_write_throws() {
  const Module = await h5wasm.ready;
  // an earlier test may have left the throwing error handler active
  Module.deactivate_throwing_error_handler();

  if (!existsSync(PATH)) {
    mkdirSync(PATH);
  }
  const FILEPATH = join(PATH, 'unavailable_filter.h5');
  copyFileSync('./test/unavailable_filter.h5', FILEPATH);

  const f = new h5wasm.File(FILEPATH, 'a');
  try {
    const dset = f.get('lzf');
    assert.throws(() => dset.value, /error reading dataset "\/lzf"[^]*'lzf' is not registered/);
    assert.throws(() => dset.slice([[0, 2]]), /error reading dataset "\/lzf"/);
    assert.throws(() => dset.write_slice([[0, 1], [0, 1]], [100]), /error writing dataset "\/lzf"/);
    // the vlen buffer is still reclaimed after the failed read: it must not free garbage
    assert.throws(() => f.get('lzf_vlen_str').value, /error reading dataset "\/lzf_vlen_str"/);
  }
  finally {
    f.close();
    unlinkSync(FILEPATH);
  }

  const vlen_file = new h5wasm.File('./test/vlen.h5', 'r');
  assert.deepEqual([...vlen_file.get('int8_scalar').value], [0, 1]);
  vlen_file.close();
}

export const tests = [
  {
    description: 'Failed dataset reads and writes throw',
    test: failed_read_write_throws,
  },
];
export default tests;
