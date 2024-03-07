import * as esbuild from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';

const extraConfig = {
  target: 'es2020',
  format: 'esm',
};

await esbuild.build({
  entryPoints: ['src/worker_proxy.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/worker/worker_proxy_bundle.js',
  plugins: [inlineWorkerPlugin(extraConfig)],
});
