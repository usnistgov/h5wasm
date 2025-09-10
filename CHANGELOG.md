# Changelog
## v0.8.5 2025-09-10
### Changed
* adjusted optimization level during build to -O2 from -O3 to preserve exported names
## v0.8.4 2025-09-10
### Added
* add `realloc` symbol needed by `bzip2` filter at runtime
## v0.8.3 2025-07-11
### Added
* add symbols needed by bitshuffle filter at runtime
## v0.8.2 2025-07-11
### Added
* added export symbols needed by blosc filter at runtime
## v0.8.1 2025-04-14
### Fixed
* added remaining export symbols needed by JPEG filter at runtime
## v0.8.0 2025-04-14
### Added
* Add `Uint8ClampedArray` to `TypedArray_to_dtype` mapping by @zengspr in https://github.com/usnistgov/h5wasm/pull/94
* add export symbols needed by JPEG compression filter by @bmaranville in https://github.com/usnistgov/h5wasm/pull/97
### Changed
* Bump esbuild from 0.15.18 to 0.25.0 by @dependabot in https://github.com/usnistgov/h5wasm/pull/93
* update to new build of libhdf5-wasm, built with emscripten 3.1.68 by @bmaranville in https://github.com/usnistgov/h5wasm/pull/96
  * using libhdf5 1.14.6 
## v0.7.9 2025-01-09
### Fixed
- Added `total_size` to metadata for VLEN datasets before further processing, fixes #89
## v0.7.8 2024-09-06
### Added
- Add `close_file` method to Module API: `close_file(file_id: bigint): number;`
### Fixed
- Fix accessing attributes of committed datatype with `my_datafile.attrs`.
- Fix calling `get_attribute_names` method of Module API on committed datatype.
### Changed
- Mark optional parameters as such in the TypeScript declarations of the following `H5Module` methods: `open`, `create_dataset`, `create_group`, `create_vlen_str_dataset` and `get_keys_vector`.
## v0.7.7 2024-08-28
### Added
-  A method to read metadata from committed datatypes in an HDF5 file
    - `Datatype.metadata` is a getter that returns the dtype metadata, in the same format (`Metadata` TypeScript interface) returned from `Dataset.metadata`
-  Enable "track order" mode of HDF5 for attributes of `Dataset`, and (fields and attributes) of `Group`.  When `track_order == true` for a `Group`, both fields and attributes keep their insertion order on read.  For a `Dataset`, the attributes keep their insertion order when the flag is set.

    Note that the flag is not inherited, i.e. if an `h5wasm.Group` object is created with `track_order = true`, its sub-groups and contained `Dataset` objects will not have the flag enabled by default.  The flag is added to the `File` constructor just to track order of immediate children of the root group.

    Changes three signatures in the `h5wasm` API:
    - `h5wasm.File(filename: string, mode: ACCESS_MODESTRING = "r", track_order: boolean = false)`
    - `h5wasm.Group.create_group(name: string, track_order: boolean = false)`
    - ```
      h5wasm.Group.create_dataset(args: {
        name: string,
        data: GuessableDataTypes,
        shape?: number[] | null,
        dtype?: string | null,
        maxshape?: (number | null)[] | null,
        chunks?: number[] | null,
        compression?: (number | 'gzip'),
        compression_opts?: number | number[],
        track_order?: boolean,
      })
      ```

    Also adds one method to the Module API:
    - `open(filename: string, mode?: number, track_order?: boolean): bigint;`
      (the default arguments are `mode = H5F_ACC_RDONLY` and `track_order = false`)

    and modifies the signatures of three existing methods in the Module API:
    - `create_dataset`
    - `create_group`
    - `create_vlen_str_dataset`
## v0.7.6 2024-08-06
### Added
 - Full support for reading VLEN datasets (numeric variable-length datasets), fixing #78

   - previously the library made no attempt to read the stored values and returned the raw bytes (corresponding to intermediate`[length, data_pointer]` pairs)
   - now returns an `Array` of `TypedArray` objects containing the stored values (or an `Array` of `Array` objects if `json_value` is requested)
   - `vlen_type?: Metadata` key added to `Metadata` interface, and populated with type information about the base type in a VLEN dataset
### Changed
 - Retrieve `value` of boolean dataset as `Int8Array` instead of plain JS boolean array. To retrieve a plain JS boolean array, use `json_value` instead:

   ```ts
   // v0.7.5 and earlier
   bool_dset.value; // -> [false, true]
   bool_dset.json_value; // -> [false, true]

   // v0.7.6 onwards
   bool_dset.value; // -> Int8Array(2) [0, 1]
   bool_dset.json_value; // -> [false, true]
   ```
## v0.7.5 2024-06-03
### Added
 - added `virtual_sources?: { file_name: string, dset_name: string }` to `Dataset.metadata` when dataset is virtual.
 - added `strpad` enum to metadata (type of string padding) - PR #72 @axelboc
## v0.7.4 2024-04-03
### Fixed
 - added missing `.js` extension in type imports
 ( see issue comment https://github.com/usnistgov/h5wasm/issues/31#issuecomment-2032301488 and fix in #71 )
## v0.7.3 2024-04-02
### Changed
 - removed references to `import.meta` in the compiled files, using `USE_ES6_IMPORT_META=0` compilation flag for emscripten.  It shouldn't matter in any case, as it is compiled in single-file mode and there are no external imports at runtime.

 *Note that this enables bundling `h5wasm` into a worker without requiring `{type: "module"}`*
## v0.7.2 2024-02-29
### Added
 - new optional HDF5 error handler that throws Javascript error (old handler printed **HDF5-DIAG** error strings using `console.error()`, but did not throw a JS `Error`)
 - when activated, the thrown `Error.message` is the same string that was previously printed to the console

To enable:
```javascript
const Module = await h5wasm.ready;
Module.activate_throwing_error_handler();
// to deactivate, restoring console.error behavior:
// Module.deactivate_throwing_error_handler();
```
## v0.7.1 2023-12-18
### Added
 - Support for object and region references
   - create object reference with `Dataset.create_reference()` or `Group.create_reference()`
   - dereference against any object in the same file or the root `File` object with e.g. `obj = File.dereference(ref)`
   - create region references with `Dataset.create_region_reference([[start_axis_0, end_axis_0, step_axis_0], [start_axis_1, ...], ...])`
   - retrieve values of region reference with `File.dereference(region_ref)`
   - store references in a dataset using `dtype='Reference'` or `dtype='RegionReference'` or if data is an array of references, it will be guessed
   - retrieve references from dataset using `slice` or `value` as usual, and dereference as above.
## v0.7.0 2023-12-05
### Changed
 - `package.json` modified so that exports are defined in a way that works better with bundlers
   - (should now work with e.g. NextJS)
 - **Breaking change** the `nodejs` import is now 'h5wasm/node' rather than 'h5wasm'.  The `nodejs` examples in the README have been updated, as well as the tests.
 - tests modified to use smaller compressed array (reduce package size)
## v0.6.10 2023-11-09
### Added
 - export more symbols to support `blosc2 ` filter
## v0.6.9 2023-11-06
### Fixed
 - added missing FileSystem API function `mkdirTree` to Emscripten typescript interface
### Added
 - Functions for working with dimension scales in typescript interface:
```typescript
// convert dataset to dimension scale:
Dataset.make_scale(scale_name: string)
// attach a dimension scale to the "index" dimension of this dataset:
Dataset.attach_scale(index: number, scale_dset_path: string)
// detach a dimension scale from "index" dimension
Dataset.detach_scale(index: number, scale_dset_path: string)
// get full paths to all datasets that are attached as dimension scales
// to the specified dimension (at "index") of this dataset:
Dataset.get_attached_scales(index: number)
// if this dataset is a dimension scale, returns name as string
// (returns empty string if no name defined, but it is a dimension scale)
// else returns null if it is not set as a dimension scale:
Dataset.get_scale_name()
```
 - Functions for working with dimension labels (not related to dimension scales)
```typescript
// label dimension at "index" of this dataset with string "label":
Dataset.set_dimension_label(index: number, label: string)
// fetch labels for all dimensions of this dataset (null if label not defined):
Dataset.get_dimension_labels()
```

## v0.6.8 2023-11-02
### Added
 - Functions for creating, attaching and detaching dimension scales (no support for reading yet)
   - h5wasm.Module.set_scale(file_id: bigint, dataset_name: string, dim_name: string) -> number // error code, zero on success
   - h5wasm.Module.attach_scale(file_id: bigint, target_dataset_name: string, dimscale_dataset_name: string, index: number) -> number
   - h5wasm.Module.detach_scale(file_id: bigint, target_dataset_name: string, dimscale_dataset_name: string, index: number) -> number
Usage:
```js
import h5wasm from "h5wasm";
await h5wasm.ready;

f = new h5wasm.File('dimscales.h5', 'w');
f.create_dataset({name: "data", data: [0,1,2,3,4,5], shape: [2,3], dtype: '<f4'});
f.create_dataset({name: "dimscale", data: [2,4,6], dtype: '<f4'});
h5wasm.Module.set_scale(f.file_id, 'dimscale', 'y1'); // -> 0 on success
h5wasm.Module.attach_scale(f.file_id, 'data', 'dimscale', 1); // -> 0 on success
f.close();
```
## v0.6.7 2023-10-24
### Added
 - Utility functions on the Module for manipulating/reading the plugin search path
```ts
get_plugin_search_paths(): string[],
insert_plugin_search_path(search_path: string, index: number): number,
remove_plugin_search_path(index: number): number,
```
e.g.
```js
import h5wasm from "h5wasm";
await h5wasm.ready;

h5wasm.Module.get_plugin_search_paths();
// [ '/usr/local/hdf5/lib/plugin' ]
h5wasm.Module.insert_plugin_search_path('/tmp/h5wasm-plugins', 0);
h5wasm.Module.get_plugin_search_paths();
// [ '/tmp/h5wasm-plugins', '/usr/local/hdf5/lib/plugin' ]
h5wasm.Module.remove_plugin_search_path(1);
// 0, success
> h5wasm.Module.get_plugin_search_paths()
// [ '/tmp/h5wasm-plugins' ]
```
## v0.6.6 2023-10-23
### Added
 - outputs filter settings when querying `Dataset.filters`
   - e.g. for default gzip compression from h5py, returns `{id: 1, name: 'deflate', cd_values: [4]}`
## v0.6.4 2023-10-23
### Added
 - builtin support for `SZIP` compression (in addition to previously-included `GZIP`)
 - a lot of extra symbols to support plugins `zstd`, `zfp`, `bzip2`, `SZ3`, etc.
### Changed
 - uses HDF5 version 1.14.2 (instead of 1.12.2)
## v0.6.3 2023-09-15
### Added
 - extra symbols used by the LZ4 plugin added to EXPORTED_FUNCTIONS:
   - from <arpa/inet.h>: `htonl`, `htons`, `ntohl`, `ntohs`
   - from HDF5: `H5allocate_memory`, `H5free_memory`
 - node.js library compiled as MAIN_MODULE, allowing plugin use (if they are installed in `/usr/local/hdf5/lib/plugin`)
## v0.6.2 2023-08-28
### Added
 - From PR #59 (thanks to @TheLartians !): allows slicing datasets with a specified step size. This is extremely useful if we want to query a high resolution dataset using a lower sample rate than originally recorded, e.g. for performance / bandwidth reasons.  Also can be used with `Dataset.write_slice`

Example:

```ts
  const dset = write_file.create_dataset({
    name: "data",
    data: [0,1,2,3,4,5,6,7,8,9],
    shape: [10],
    dtype: "<f4"
  });

  const slice = dset.slice([[null, null, 2]]); // -> [0,2,4,6,8]

  dset.write_slice([[null, 7, 2]], [-2,-3,-4,-5]);
  dset.value; // -> Float32Array(10) [-2,  1, -3, 3, -4, 5, -5,  7, 8,  9];
```

## v0.6.1 2023-07-13
### Fixed
 - memory error from double-free when creating vlen str datasets (no need to call H5Treclaim when memory for vector will be automatically garbage-collected)

## v0.6.0 2023-07-03
### Added
 - `compression: number | 'gzip'` and `compression_opts: number[]` arguments to `create_dataset`.
   - **Must specify chunks when using `compression`**
   - **Can not specify `compression` with VLEN datasets**
   - if `compression` is supplied as a number without `compression_opts`, the 'gzip' (DEFLATE, filter_id=1) filter is applied, and the compression level used is taken from the value of `compression`.  An integer value of 0-9 is required for the compression level of the 'gzip' filter.
   - if `compression` and `compression_opts` are supplied, the `compression` value is passed as the filter_id (or 1 if 'gzip' is supplied), and the value of `compression_opts` is promoted to a list if it is a number, or passed as-is if it is a list.  *Use both compression (numeric filter_id) and compression_opts when specifying any filter other than 'gzip', e.g. with a filter plugin*
   - if `compression === 'gzip'` and `compression_opts === undefined`, the default gzip compression level of 4 is applied.

#### Example usage:
  ```js
  // short form: uses default compression (DEFLATE, filter_id=1)
  // with compression level specified (here, 9)
  Group.create_dataset({..., compression=9});

  // specify gzip and compression level:
  Group.create_dataset({..., compression='gzip', compression_opts=[4]});

  // specify another filter, e.g. BLOSC plugin:
  Group.create_dataset({..., compression=32001, compression_opts=[]});
  ```

### Changed
 - **BREAKING**: for `create_dataset`, all arguments are supplied in a single object, as
  ```ts
  Group.create_dataset(args: {
      name: string,
      data: GuessableDataTypes,
      shape?: number[] | null,
      dtype?: string | null,
      maxshape?: (number | null)[] | null,
      chunks?: number[] | null,
      compression?: (number | 'gzip'),
      compression_opts?: number | number[]
  }): Dataset {}
  ```
## v0.5.2 2023-05-17
(v0.5.1 release was removed as incomplete)
### Added
 - Support TS 5's moduleResolution: "bundler" (thanks, @axelboc)
## v0.5.0 2023-05-15
### Fixed
 - with emscripten >= 3.1.28, the shim for ES6 builds in nodejs is no longer needed (see https://github.com/emscripten-core/emscripten/pull/17915)
 - added `malloc` and `free` to the list of explicit exports for the `Module` (newer emscripten was optimizing them away)
### Changed
 - **POSSIBLY BREAKING**: building as MAIN_MODULE=2 with `POSITION_INDEPENDENT_CODE ON` (to allow dynamic linking)
 - Using newer HDF5 version 1.12.2 libraries
 - compiled using Emscripten 3.1.28
 - simplified imports for tests to use "h5wasm" directly
### Added
 - Plugins can now be used if they are compiled as SIDE_MODULE, by loading them into the expected plugin folder `/usr/local/hdf5/lib/plugin` in the emscripten virtual file system (might need the name of the plugin file to end in .so, even if it is WASM)

## v0.4.11 2023-04-19
### Fixed
 - all datasets and attributes are read out in little-endian order (closes #49)
### Added
 - New method to overwrite slice of an existing dataset: `Dataset.write_slice(ranges: Array<Array<number>>, data: any): void;`
 - Method to delete an attribute from a dataset or group (can be used to update an attribute by deleting it then re-creating it)
   - `Dataset.delete_attribute(name: str): number` (returns non-zero value if it fails for some reason)
   - `Group.delete_attribute(name: str): number`
 - Ability to specify chunks and maxshape when creating dataset (to make a resizable dataset): `Group.create_dataset(name: string, data: GuessableDataTypes, shape?: number[] | null, dtype?: string | null, maxshape?: (number | null)[] | null, chunks?: number[] | null): Dataset`
 - New method to resize datasets (only works if chunks and maxshape were defined): `Dataset.resize(new_shape: number[]): void`
 ### Changed
  - Metadata now includes `chunks: Array<number> | null,` information and `maxshape: Array<number> | null`

## v0.4.10 2023-02-19
### Added
 - Group.paths(): string[]; // returns a list of all link paths found below the group in the tree.  (Use on root object to get all paths in the file)
## v0.4.9 2022-12-21
### Added
 - Group.create_soft_link(target: string, name: string): number; // creates a soft link in a group with name: name (target must be absolute path)
 - Group.create_hard_link(target:string, name: string): number; //
 - Group.create_external_link(file_name: string, target: string, name: string): number;

All of these return non-zero values on error.  To create links with absolute path, just use e.g. File.create_soft_link(target_path, link_path);
## v0.4.8 2022-12-05
### Added
 - IIFE build at `./dist/iife/h5wasm.js`, to support use in Firefox workers (which don't currently support ESM)
 - WORKERFS support in ESM/IIFE builds, for loading local files with random access instead of copying whole file into memory

## v0.4.7 2022-11-01
### Added
 - basic support for reading datatypes from files (see PR #34)
 - basic filter information made available (see PR #35)
## v0.4.6 2022-08-04
### Changed
 - removed ```Dataset.auto_refresh``` and replaced with ```.refresh()``` method (allows consistent access to metadata and data between refreshes)
## v0.4.5 2022-08-04
### Fixed
 - H5Create should only be called with access modes H5F_ACC_TRUNC (w) and H5F_ACC_EXCL (x)
### Added
 - support for SWMR read with refresh on a dataset: e.g.
```js
const file = new hdf5.File("swmr.h5", "Sr");
let ds=file.get("data");
ds.auto_refresh=true;
ds.shape;
// returns 12
ds.shape;
// returns 16 because dataset was updated with SWMR write
ds.value
// has size=16
```
## v0.4.4 2022-05-25
### Fixed
 - error in ```isIterable``` when called on non-object (affects ```to_array``` method)
## v0.4.3 2022-05-24
### Added
 - ```to_array``` method on Dataset and Attribute classes: returns nested array of values with dimensions matching ```shape```.  Auto-converts all values to JSON-compatible types (BigInt -> Number, TypedArray -> Array)
 - auto-convert h5py-style boolean datasets (where datatype = ENUM {FALSE:0, TRUE:1}) to JS booleans
 - automated testing of code with Github Action
### Fixed
 - enum_type.members is now an object {[name: string]: value: number}
   (previous implementation with Array could have wrong name order)
## v0.4.2 2022-05-10
### Added
 - extended metadata for ENUM type (including names of members)
### Fixed
 - Typings for metadata on attributes and datasets
## v0.4.1 2022-05-02
### Added
 - Minimal handling of reading datatype H5T_ENUM (treats as integer base type)
### Fixed
 - All strings now truncated at first null byte before decoding
 - Fixed memory leaks from opening dtype and plist objects
 - Singleton values (shape = []) were being returned as length-1 array due to logic error, now fixed
## v0.4.0 2022-04-28
### Changed
 - **POSSIBLY BREAKING**: nodejs target is compiled as ESM instead of CommonJs
 - default export is now an object, which can help when ```import *``` is discouraged
   ```js
   export const h5wasm = {
     File,
     Group,
     Dataset,
     ready,
     ACCESS_MODES
   }
   export default h5wasm;
   ```
 - ```ready``` export now returns ```Promise<H5Module>```
 - recommended access to filesystem is by
   ```js
   const { FS } = await h5wasm.ready;
   ```
### Added
 - VLEN string writing and reading test
 - TypeScript types added for Attribute
 - Full metadata added to Attribute in addition to dtype and shape
## v0.3.2 2022-04-12
### Fixed
 - TypeScript ```strict``` mode checking enabled for build
 - all TypeScript type errors resolved
 - unused portions of the ```EmscriptenModule``` interface that raise errors in nodejs builds are removed (both of these depend on dom definitions)
     - preinitializedWebGLContext: WebGLRenderingContext;
     - onCustomMessage(event: MessageEvent): void;

## v0.3.1 2022-03-31
### Added
 - ```Group.get_type(path)``` will now return
     - ```H5G_LINK (3)``` if path is a dangling soft link
     - ```H5G_UDLINK (4)``` if path is a user-defined (e.g. external) link
 - ```Group.get(path)``` will now return
     - ```BrokenSoftLink(target: string)``` if the path is a dangling soft link
     - ```ExternalLink(filename: string, obj_path: string)``` if the path is an external link
     - ```undefined``` if the path is a user-defined link that is not an external link.

## v0.3.0 2022-03-23
### Changed
 - compiled with ```-s SINGLE_FILE``` to embed WASM in output .js file (for compatibility with bundlers)
 - using external build of libhdf5 from https://github.com/usnistgov/libhdf5-wasm

## v0.2.2 2022-02-16
### Added
 - IDBFS adapter added to ESM module

### Changed
 - license statement expanded

## v0.2.1 2022-02-04
### Fixed
 - Writing of Float64 datasets was broken, and is now working
 - Guessed shape of simple string values is fixed so that this will work:
```js
  f.create_attribute("my_attr", "a string value");
```
 - Group.prototype.create_dataset now returns type Dataset (ts)

## v0.2.0 2022-01-25
### Added
 - Typescript definitions (src/hdf5_hl.d.ts)
 - Support for reading and processing HDF5 Array datatype
 - esm and nodejs modules both offer ```ready``` Promise, which can be awaited before working with the module (addresses #5)
 - minimal set of tests (```npm test```)

### Changed
 - **POSSIBLY BREAKING**: local paths to modules are changed
     - esm: ./dist/esm/hdf5_hl.js
     - node (CJS): ./dist/node/hdf5_hl.js
 - Build step added (esm and nodejs modules both built from Typescript source)
 - Build artifacts no longer available from ```dist``` branch, will be uploaded as .tgz archive (output of npm pack) to releases

## v0.1.8 2022-01-06
### Added
 - auto decoding of [Compound datatypes](https://support.hdfgroup.org/HDF5/Tutor/compound.html) to native Javascript arrays

## v0.1.7 2021-12-24
### Fixed
 - ESM build targets web environment (no 'require' statements - fixes builds using webpack e.g. create-react-app)
 - emscripten build script altered to work on OSX as well as linux (compatible call to shasum)

## v0.1.6 2021-09-16
### Fixed
 - minor bugfix in string reading ('metadata' spelled wrong)

## v0.1.5 2021-09-15
### Added
 - export AsciiToString and UTF8ToString from emscripten
 - support reading vlen strings in data and attributes
 - support writing vlen strings

### Changed
 - reclaim memory for vlen data in get_attr

## v0.1.4 2021-09-15
### Changed
 - added documentation for finding libhdf5.a

### Fixed
 - documentation for creating new File object in nodejs
 - checking for name existing before getting type in wasm lib

## v0.1.3 2021-09-12
### Added
 - download/upload helpers for web (file_handlers.js)

### Changed
 - use ZLIB from emscripten ports
