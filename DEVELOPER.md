# Developer notes

The [Makefile](./Makefile) is written for a linux environment.

To build libhdf5, you must have [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) installed and activated, so that the ```emcmake``` and ```emmake``` and ```emcc``` commands are available.

Then just type 
```
make
```

libhdf5.a and libhdf5_hl.a are built in ```./wasm_build/hdf5/lib/``` 

and are used to compile ```./src/hdf5_util.cc``` to ```./dist/esm/hdf5_util.js``` and ```./dist/esm/hdf5_util.wasm``` 

which are then used by ```./dist/hdf5_hl.js``` (ESM)

(and also ```./dist/node/hdf5_util.wasm``` which is used by ```./dist/hdf5_hl_node.js```, the nodejs entry point)

## distributable files
The main library entrypoints are generated from ```./src/hdf5_hl_base.js``` because the only difference between the nodejs and browser(ESM) versions is the export statements, so a whole build system seems overkill.
