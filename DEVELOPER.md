# Developer notes

The [Makefile](./Makefile) is written for a linux environment.

To build libhdf5, you must have [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) installed and activated, so that the ```emcmake``` and ```emmake``` and ```emcc``` commands are available.

Then just type 
```
make
```

libhdf5.a and libhdf5_hl.a are built in ```./wasm_build/hdf5/lib/``` 

and are used to compile ```./src/hdf5_util.cc``` to ```./dist/esm/hdf5_util.js``` and ```./dist/esm/hdf5_util.wasm``` 

which are then used by ```./dist/esm/hdf5_hl.js``` (ESM)

(and also ```./dist/node/hdf5_util.wasm``` which is used by ```./dist/node/hdf5_hl.js```, the nodejs entry point)

## distributable files
The main library entrypoints are generated from ```./src/hdf5_hl.ts``` with the Typescript compiler by running ```npm run build```.  This also generates the Typescript typings file ```./src/hdf5_hl.d.ts```