#!/usr/bin/env -S"--experimental-modules" node 

import esbuild from 'esbuild';

const esm_header = `
import ModuleFactory from './esm/hdf5_util.js';
const ready = ModuleFactory({ noInitialRun: true }).then((result) => { Module = result; FS = Module.FS });
export { ready };
`;

const node_footer = `
const Module = require("./node/hdf5_util.js");
module.exports = {File, Dataset, Group, ACCESS_MODES};
`;

await esbuild.build({
  entryPoints: ['src/hdf5_hl.ts'],
  bundle: false,
  minify: false,
  sourcemap: true,
  treeShaking: false,
  outdir: 'dist/esm',
  target: 'es2020',
  banner: {
    //js: esm_header
  },
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
  footer: {
    //js: node_footer
  }
}).catch((e) => {console.log('error:', e); process.exit(1)})

console.log('built for node');