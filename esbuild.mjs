#!/usr/bin/env -S node --experimental-modules

import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/hdf5_hl.ts'],
  bundle: false,
  minify: false,
  sourcemap: true,
  treeShaking: false,
  outdir: 'dist/esm',
  target: 'es2020',
}).catch((e) => {console.log('error:', e); process.exit(1)})

console.log('built for web');

await esbuild.build({
  entryPoints: ['src/hdf5_hl.ts'],
  bundle: false,
  minify: false,
  sourcemap: true,
  treeShaking: false,
  outfile: 'dist/node/hdf5_hl.js',
  platform: 'node',
  format: 'cjs',
}).catch((e) => {console.log('error:', e); process.exit(1)})

console.log('built for node');