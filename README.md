# h5wasm
a zero-dependency WebAssembly-powered library for [reading](#reading) and [writing](#writing) HDF5 files from javascript

(built on the [HDF5 C API](http://portal.hdfgroup.org/pages/viewpage.action?pageId=50073943))

The built binaries (esm and node) will be attached to the [latest release](https://github.com/usnistgov/h5wasm/releases/latest/) as h5wasm-{version}.tgz
  
The wasm-compiled libraries `libhdf5.a`, `libhdf5_cpp.a` ... and the related `include/` folder are retrieved from [libhdf5-wasm](https://github.com/usnistgov/libhdf5-wasm) during the build.

Instead of importing a namespace "*", it is now possible to import the important h5wasm components in an object, from the default export:
```js
// in hdf5_hl.ts:
export const h5wasm = {
    File,
    Group,
    Dataset,
    ready,
    ACCESS_MODES
}
```

The Emscripten filesystem is important for operations, and it can be accessed after the WASM is loaded as below.

## Browser (no-build)
```js
import h5wasm from "https://cdn.jsdelivr.net/npm/h5wasm@0.4.0/dist/esm/hdf5_hl.js";

// the WASM loads asychronously, and you can get the module like this:
const Module = await h5wasm.ready;

// then you can get the FileSystem object from the Module:
const { FS } = Module;

// Or, you can directly get the FS if you don't care about the rest 
// of the module:
// const { FS } = await h5wasm.ready;

let response = await fetch("https://ncnr.nist.gov/pub/ncnrdata/vsans/202003/24845/data/sans59510.nxs.ngv");
let ab = await response.arrayBuffer();

FS.writeFile("sans59510.nxs.ngv", new Uint8Array(ab));

// use mode "r" for reading.  All modes can be found in h5wasm.ACCESS_MODES
let f = new h5wasm.File("sans59510.nxs.ngv", "r");
// File {path: "/", file_id: 72057594037927936n, filename: "data.h5", mode: "r"}
```

## Browser target (build system)
```npm i h5wasm``` or ```yarn add h5wasm```
then in your file
```js
// index.js
import h5wasm from "h5wasm";
const { FS } = await h5wasm.ready;

let f = new h5wasm.File("test.h5", "w");
f.create_dataset("text_data", ["this", "that"]);
// ...
```
__note__: you must configure your build system to target >= ES2020 (for bigint support)

## nodejs
The host filesystem is made available through Emscripten "NODERAWFS=1".

Enabling BigInt support may be required for nodejs < 16
```bash
npm i h5wasm
node --experimental-wasm-bigint

```

```js
const h5wasm = await import("h5wasm");
await h5wasm.ready;

let f = new h5wasm.File("/home/brian/Downloads/sans59510.nxs.ngv", "r");
/*
File {
  path: '/',
  file_id: 72057594037927936n,
  filename: '/home/brian/Downloads/sans59510.nxs.ngv',
  mode: 'r'
} 
*/
```

## Usage
_(all examples are written in ESM - for Typescript some type casting is probably required, as `get` returns either Group or Dataset)_
### Reading
```js
let f = new h5wasm.File("sans59510.nxs.ngv", "r");

// list keys:
f.keys()
// ["entry"]

f.get("entry/instrument").keys()
// ["attenuator","beam","beam_monitor_low","beam_monitor_norm","beam_stop_C2","beam_stop_C3","collimator","converging_pinholes","detector_B","detector_FB","detector_FL","detector_FR","detector_FT","detector_MB","detector_ML","detector_MR","detector_MT","lenses","local_contact","name","sample_aperture","sample_aperture_2","sample_table","source","source_aperture","type"]

let data = f.get("entry/instrument/detector_MR/data")
// Dataset {path: "/entry/instrument/detector_MR/data", file_id: 72057594037927936n}

data.metadata
/* 
{
    "signed": true,
    "cset": -1,
    "vlen": false,
    "littleEndian": true,
    "type": 0,
    "size": 4,
    "shape": [
        48,
        128
    ],
    "total_size": 6144
}
*/

// for convenience, these are extracted from metadata:
data.dtype
// "<i"
data.shape
// (2) [48, 128]

// data are loaded into a matching TypedArray in javascript if one exists, otherwise raw bytes are returned (there is no Float16Array, for instance).  In this case the matching type is Int32Array
data.value
/*
Int32Array(6144) [0, 0, 0, 2, 2, 2, 3, 1, 1, 7, 3, 5, 7, 8, 9, 21, 43, 38, 47, 8, 8, 7, 3, 6, 1, 7, 3, 7, 47, 94, 91, 99, 76, 81, 86, 112, 98, 103, 85, 100, 83, 122, 111, 123, 136, 129, 134, 164, 130, 164, 176, 191, 200, 211, 237, 260, 304, 198, 32, 9, 5, 2, 6, 5, 8, 6, 25, 219, 341, 275, 69, 11, 4, 5, 5, 45, 151, 154, 141, 146, 108, 107, 105, 113, 99, 101, 96, 84, 86, 77, 78, 107, 73, 80, 105, 65, 75, 79, 62, 31, …]
*/

// take a slice from 0:10 on axis 0, keeping all of axis 1:
// (slicing is done through libhdf5 instead of in the javascript library - should be very efficient)
data.slice([[0,10],[]])
/*
Int32Array(1280) [0, 0, 0, 2, 2, 2, 3, 1, 1, 7, 3, 5, 7, 8, 9, 21, 43, 38, 47, 8, 8, 7, 3, 6, 1, 7, 3, 7, 47, 94, 91, 99, 76, 81, 86, 112, 98, 103, 85, 100, 83, 122, 111, 123, 136, 129, 134, 164, 130, 164, 176, 191, 200, 211, 237, 260, 304, 198, 32, 9, 5, 2, 6, 5, 8, 6, 25, 219, 341, 275, 69, 11, 4, 5, 5, 45, 151, 154, 141, 146, 108, 107, 105, 113, 99, 101, 96, 84, 86, 77, 78, 107, 73, 80, 105, 65, 75, 79, 62, 31, …]
*/

// Convert to nested Array, with JSON-compatible elements:
data.to_array()
/*
[
  [
      0,   0,   0,   2,   2,   2,   3,   1,   1,   7,   3,   5,
      7,   8,   9,  21,  43,  38,  47,   8,   8,   7,   3,   6,
      1,   7,   3,   7,  47,  94,  91,  99,  76,  81,  86, 112,
     98, 103,  85, 100,  83, 122, 111, 123, 136, 129, 134, 164,
    130, 164, 176, 191, 200, 211, 237, 260, 304, 198,  32,   9,
      5,   2,   6,   5,   8,   6,  25, 219, 341, 275,  69,  11,
      4,   5,   5,  45, 151, 154, 141, 146, 108, 107, 105, 113,
     99, 101,  96,  84,  86,  77,  78, 107,  73,  80, 105,  65,
     75,  79,  62,  31,
    ... 28 more items
  ],
  [
      0,   0,   2,   2,   4,   1,   2,   7,   2,   3,   2,   5,
      6,   3,   6,  24,  37,  42,  25,   8,   3,   5,   4,   8,
      2,   6,   7,   9,  61,  81,  81,  89, 104, 110,  82,  82,
    104,  92,  97,  99, 104, 115, 106, 128, 134, 111, 125, 123,
    159, 155, 182, 228, 227, 242, 283, 290, 295, 114,  11,   6,
      5,   6,   8,   4,   4,  10,  59, 401, 401, 168,  10,   6,
      6,   4,  10,  37, 150, 152, 146, 121, 125, 117, 122,  88,
    100,  97,  86,  79,  90,  87,  78,  87,  87,  87,  84,  76,
     76,  66,  51,  11,
    ... 28 more items
  ],
  ... 46 more items
*/
```

### Writing
```js
let new_file = new h5wasm.File("myfile.h5", "w");

new_file.create_group("entry");

// shape and dtype will match input if omitted
new_file.get("entry").create_dataset("auto", [3.1, 4.1, 0.0, -1.0]);
new_file.get("entry/auto").shape
// [4]
new_file.get("entry/auto").dtype
// "<d"
new_file.get("entry/auto").value
// Float64Array(4) [3.1, 4.1, 0, -1]

// make float array instead of double (shape will still match input if it is set to null)
new_file.get("entry").create_dataset("data", [3.1, 4.1, 0.0, -1.0], null, '<f');
new_file.get("entry/data").shape
// [4]
new_file.get("entry/data").value
//Float32Array(4) [3.0999999046325684, 4.099999904632568, 0, -1]

// create a dataset with shape=[2,2]
// The dataset stored in the HDF5 file with the correct shape, 
// but no attempt is made to make a 2x2 array out of it in javascript
new_file.get("entry").create_dataset("square_data", [3.1, 4.1, 0.0, -1.0], [2,2], '<d');
new_file.get("entry/square_data").shape
// (2) [2, 2]
new_file.get("entry/square_data").value
//Float64Array(4) [3.1, 4.1, 0, -1]

// create an attribute (creates a VLEN string by default for a string)
new_file.get("entry").create_attribute("myattr", "a string");
Object.keys(new_file.get("entry").attrs)
// ["myattr"]
new_file.get("entry").attrs["myattr"]
// {value: "a string", shape: Array(0), dtype: "S"}

new_file.get("entry").create_attribute("fixed", ["hello", "you"], null, "S5")
new_file.get("entry").attrs["fixed"]
/*
{
    "value": [
        "hello",
        "you"
    ],
    "shape": [
        2
    ],
    "dtype": "S5"
}
*/

// close the file - reading and writing will no longer work.
// calls H5Fclose on the file_id.
new_file.close()

```

### Edit
One can also open an existing file and write to it:
```js
let f = new h5wasm.File("myfile.h5", "a");

f.create_attribute("new_attr", "something wicked this way comes");
f.close()
```
## Web Helpers
Optional, to support uploads and downloads

```js
import {uploader, download, UPLOADED_FILES} from "https://cdn.jsdelivr.net/npm/h5wasm@latest/dist/esm/file_handlers.js";
// 
// Attach to a file input element:
// will save to Module.FS (memfs) with the name of the uploaded file
document.getElementById("upload_selector").onchange = uploader;
// file can be found with 
let f = new h5wasm.File(UPLOADED_FILES[UPLOADED_FILES.length -1], "r");

let new_file = new h5wasm.File("myfile.h5", "w");

new_file.create_group("entry");

// shape and dtype will match input if omitted
new_file.get("entry").create_dataset("auto", [3.1, 4.1, 0.0, -1.0]);

// this will download a snapshot of the HDF5 in its current state, with the same name
// (in this case, a file named "myfile.h5" would be downloaded)
download(new_file);
```

## Persistent file store (web)
To persist the emscripten virtual filesystem between sessions, use IDBFS (syncs with browser IndexedDB), e.g.
```js
// create a local mount of the IndexedDB filesystem:
FS.mount(FS.filesystems.IDBFS, {}, "/home/web_user")

// to read from the browser IndexedDB into the active filesystem:
FS.syncfs(true, (e) => {console.log(e)});

// to push all current files in /home/web_user to IndexedDB, e.g. when closing your application:
FS.syncfs(false, (e) => {console.log(e)})
```
