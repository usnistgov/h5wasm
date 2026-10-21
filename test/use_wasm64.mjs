// Preload for `npm run test:wasm64`: redirects the tests' `h5wasm/node`
// imports to the wasm64 (MEMORY64) build so the same suite runs on both.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'h5wasm/node') {
      specifier = 'h5wasm/wasm64/node';
    }
    return nextResolve(specifier, context);
  },
});
